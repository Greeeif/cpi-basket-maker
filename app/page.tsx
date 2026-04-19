import CPILineChart from "@/components/CPILineChart";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">CPI Basket Maker</h1>
      <CPILineChart />
    </main>
  );
}