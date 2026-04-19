"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
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

export default function CPILineChart() {
  // State for the raw data from the API — this never changes after fetch
  const [data, setData] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: state for the slider — how many months to show, counting back from today.
  // We start at 60 (5 years) as a sensible default.
  const [monthsToShow, setMonthsToShow] = useState(60);

  // Fetch once on mount (unchanged from before)
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/cpi-data/timeseries?aggregate=CP00");
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Failed to fetch");
        setData(json.observations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading chart...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  // ─── DERIVED DATA ──────────────────────────────────────────────────────────
  //
  // "Derived" means "calculated from state, not stored separately".
  //
  // We don't put `filteredData` in its own useState. Why not? Because it's
  // fully determined by `data` and `monthsToShow` — any time either of those
  // changes, the component re-renders and this calculation runs fresh.
  // Storing it in state would mean keeping two sources of truth in sync,
  // which is a classic source of React bugs.

  // slice(-N) returns the last N items of an array, or the whole array
  // if N is larger than the length. No need to clamp manually.
  const filteredData = data.slice(-monthsToShow);

  // ─── HELPER: FORMAT MONTHS AS HUMAN-READABLE LABEL ─────────────────────────
  //
  // Converts 18 → "1y 6m", 60 → "5y", 457 → "38y 1m", etc.
  // Helps the user understand what the slider actually controls.
  function formatMonths(months: number): string {
    const years = Math.floor(months / 12);
    //          ^ Math.floor rounds DOWN. 18/12 = 1.5 → 1.
    const remaining = months % 12;
    //              ^ The modulo (%) operator gives the remainder after division.
    //                18 % 12 = 6, 60 % 12 = 0, 457 % 12 = 1.

    // Edge cases: fewer than 12 months, or exactly whole years
    if (years === 0) return `${months}m`;
    if (remaining === 0) return `${years}y`;
    return `${years}y ${remaining}m`;
  }

  const totalMonths = data.length; // 457 currently

  return (
    <div className="w-full p-4">
      <h2 className="text-xl font-semibold mb-4">
        CPIH Overall Index (UK, 2015 = 100)
      </h2>

      {/* ─── SLIDER CONTROL ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="range-slider" className="text-sm font-medium">
            Time range: last {formatMonths(monthsToShow)}
          </label>
          <span className="text-sm text-gray-500">
            {filteredData[0]?.time} – {filteredData[filteredData.length - 1]?.time}
            {/* Show the actual date range the user has selected.
                The `?.` is optional chaining — if filteredData is empty,
                this returns undefined rather than crashing. */}
          </span>
        </div>

        <input
          id="range-slider"
          type="range"
          min={6}               // don't let users go below 6 months — chart would be too sparse
          max={totalMonths}     // can't show more than we have
          step={1}
          value={monthsToShow}
          // onChange fires every time the slider moves.
          // e is the event object. e.target is the <input>.
          // e.target.value is ALWAYS a string (that's how HTML works), so
          // we wrap with Number() to convert "60" → 60.
          onChange={(e) => setMonthsToShow(Number(e.target.value))}
          className="w-full"
        />

        {/* Tick-mark hints underneath so users know what's available */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>6m</span>
          <span>5y</span>
          <span>10y</span>
          <span>20y</span>
          <span>All ({formatMonths(totalMonths)})</span>
        </div>
      </div>

      {/* ─── CHART ──────────────────────────────────────────────────────── */}
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            {/*                ^ use filteredData, not data */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}