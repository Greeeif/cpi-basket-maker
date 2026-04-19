import { NextResponse } from "next/server";
import { getCPIHTimeSeries } from "@/lib/ons-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aggregateId = searchParams.get("aggregate");

  if (!aggregateId) {
    return NextResponse.json(
      { success: false, message: "Missing required query param: aggregate" },
      { status: 400 }
    );
  }

  try {
    const observations = await getCPIHTimeSeries(aggregateId);
    return NextResponse.json({
      success: true,
      aggregateId,
      count: observations.length,
      // Just show the most recent 5 — the full 457 would be a wall of JSON
      observations,
      // ^ .slice(-5) returns the LAST 5 items of an array.
      //   Negative numbers count from the end.
    });
  } catch (error) {
    console.error("Failed to fetch CPI time series:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch data from ONS API" },
      { status: 500 }
    );
  }
}