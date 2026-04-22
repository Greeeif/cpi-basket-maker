"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Observation = {
  time: string;
  value: number;
};

const MAX_MONTHS = 120;   // 10-year cap
const MIN_WINDOW = 3;

const PRESETS = [
  { label: "10Y", months: 120 },
  { label: "5Y", months: 60 },
  { label: "2Y", months: 24 },
  { label: "1Y", months: 12 },
  { label: "6M", months: 6 },
  { label: "3M", months: 3 },
] as const;

export default function CPILineChart() {
  const [data, setData] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/cpi-data/timeseries?aggregate=CP00");
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Failed to fetch");

        const capped = json.observations.slice(-MAX_MONTHS);
        // Temporary debug log — remove once you've confirmed the cap works.
        console.log(`Raw: ${json.observations.length}, After 10y cap: ${capped.length}`);
        setData(capped);
        setStartIndex(0);
        setEndIndex(capped.length - 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ─── LOADING STATE (bento-styled) ────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-bento-indigo-600 animate-spin" />
          <p className="text-bento-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Loading ONS Data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600 font-semibold">Error: {error}</div>;
  }

  const totalMonths = data.length;
  const filteredData = data.slice(startIndex, endIndex + 1);

  // ─── HEADER CALCULATIONS ─────────────────────────────────────────────
  //
  // Two numbers in the header: the latest raw index value, and the
  // year-over-year percentage change. These are the kind of "at-a-glance"
  // stats the reference design leads with.

  // Most recent observation — array's last element.
  const latest = data[totalMonths - 1];

  // Year-over-year: compare today's index to 12 months earlier.
  //   - CPI data is monthly, so "12 months ago" = 12 array positions back.
  //   - data[totalMonths - 1]  is today
  //   - data[totalMonths - 13] is 12 months before that (minus 1 for index, minus 12 for months back).
  //   - Guard with `totalMonths >= 13` — if we somehow have less than a year
  //     of data, we can't compute YoY at all, so return null and hide the stat.
  //
  // Formula: ((new - old) / old) * 100
  //   e.g. if CPIH went from 135 → 139.4, that's (139.4 - 135) / 135 * 100 = 3.26%
  const yearAgo = totalMonths >= 13 ? data[totalMonths - 13] : null;
  const yoyChange = yearAgo
    ? ((latest.value - yearAgo.value) / yearAgo.value) * 100
    : null;

  // ─── SLIDER HANDLERS (unchanged) ─────────────────────────────────────
  function handleStartChange(newStart: number) {
    const clamped = Math.min(newStart, endIndex - MIN_WINDOW);
    setStartIndex(Math.max(0, clamped));
  }
  function handleEndChange(newEnd: number) {
    const clamped = Math.max(newEnd, startIndex + MIN_WINDOW);
    setEndIndex(Math.min(totalMonths - 1, clamped));
  }
  function applyPreset(months: number) {
    setStartIndex(Math.max(0, totalMonths - months));
    setEndIndex(totalMonths - 1);
  }
  function isPresetActive(months: number): boolean {
    return (
      startIndex === Math.max(0, totalMonths - months) &&
      endIndex === totalMonths - 1
    );
  }
  function formatMonths(months: number): string {
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    if (years === 0) return `${months}m`;
    if (remaining === 0) return `${years}y`;
    return `${years}y ${remaining}m`;
  }

  const windowLength = endIndex - startIndex + 1;
  const startPct = (startIndex / (totalMonths - 1)) * 100;
  const endPct = (endIndex / (totalMonths - 1)) * 100;

  return (
    <div className="p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-bento-slate-100 pb-6 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-bento-slate-900">
              UK Inflation{" "}
              <span className="text-bento-indigo-600 underline decoration-bento-indigo-200 underline-offset-8 decoration-4">
                Tracker
              </span>
            </h1>
            <p className="text-bento-slate-500 mt-2 font-semibold flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-bento-emerald-500 rounded-full animate-pulse"></span>
              Source: ONS CPIH Overall Index (2015 = 100)
            </p>
          </div>

          {/* Stat blocks — note font-mono on the numbers for that quant look */}
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-bento-slate-400 font-black mb-1">
                {latest.time} Index
              </p>
              <p className="text-3xl font-mono font-bold text-bento-slate-900">
                {latest.value.toFixed(1)}
              </p>
            </div>
            {yoyChange !== null && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-bento-indigo-400 font-black mb-1">
                  YoY Change
                </p>
                <p className="text-3xl font-mono font-bold text-bento-indigo-600">
                  {yoyChange >= 0 ? "+" : ""}
                  {yoyChange.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </header>

        {/* ─── PRESET PILLS + SLIDER (bento card) ─────────────────── */}
        <div className="bg-white border-2 border-bento-slate-900 rounded-[2rem] p-6 shadow-xl">

          <div className="flex gap-2 mb-6 flex-wrap">
            {PRESETS.map((preset) => {
              const active = isPresetActive(preset.months);
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.months)}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border-2 transition-all ${
                    active
                      ? "border-bento-indigo-600 bg-bento-indigo-600 text-white shadow-md"
                      : "border-bento-slate-100 bg-bento-slate-50 text-bento-slate-400 hover:border-bento-indigo-200 hover:text-bento-indigo-600"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-bento-slate-400 font-black mb-1">
                Window
              </p>
              <p className="font-mono font-black text-bento-slate-900">
                {formatMonths(windowLength)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-bento-slate-400 font-black mb-1">
                Range
              </p>
              <p className="font-mono font-bold text-bento-slate-700 text-sm">
                {data[startIndex]?.time} — {data[endIndex]?.time}
              </p>
            </div>
          </div>

          <div className="relative h-6">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-bento-slate-100 rounded" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-bento-indigo-600 rounded"
              style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={totalMonths - 1}
              value={startIndex}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className="dual-range absolute top-0 w-full h-6"
              aria-label="Start of time range"
            />
            <input
              type="range"
              min={0}
              max={totalMonths - 1}
              value={endIndex}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className="dual-range absolute top-0 w-full h-6"
              aria-label="End of time range"
            />
          </div>

          <div className="flex justify-between text-[10px] text-bento-slate-400 mt-3 font-mono font-bold">
            <span>{data[0]?.time}</span>
            <span>{data[totalMonths - 1]?.time}</span>
          </div>
        </div>

        {/* ─── CHART CARD (the dramatic indigo centerpiece) ────────── */}
        {/*
          Swapped LineChart → AreaChart. Both render the same dataKey,
          but Area gives us the gradient fill effect from the reference.
          The <defs><linearGradient> bit creates a reusable gradient that
          the Area references via `fill="url(#cpiGradient)"`.
        */}
        <div className="bg-bento-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-20">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Price Index Timeline
                </h2>
                <p className="text-bento-indigo-200 text-[10px] font-black uppercase tracking-[0.15em] mt-1">
                  {formatMonths(windowLength)} Window
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]">
                <div className="w-3 h-1 bg-white rounded-full"></div>
                <span>CPIH</span>
              </div>
            </div>

            <div style={{ width: "100%", height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cpiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)", fontWeight: 700 }}
                    minTickGap={40}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)", fontWeight: 700 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "none",
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                      fontSize: "11px",
                      padding: "12px",
                    }}
                    itemStyle={{ color: "#fff", fontWeight: 800 }}
                    labelStyle={{
                      color: "#818cf8",
                      marginBottom: "6px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="CPIH Index"
                    stroke="#ffffff"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#cpiGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Soft glow blobs for that "designed" feel. `blur-[100px]`
              uses arbitrary-value syntax to get a blur amount Tailwind
              doesn't ship out of the box. */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-bento-indigo-500 rounded-full blur-[100px] opacity-40"></div>
          <div className="absolute top-1/4 -left-10 w-48 h-48 bg-bento-indigo-400 rounded-full blur-[80px] opacity-30"></div>
        </div>

        <footer className="py-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bento-slate-300">
            UK Consumer Price Inflation • Office for National Statistics
          </p>
        </footer>
      </div>
    </div>
  );
}