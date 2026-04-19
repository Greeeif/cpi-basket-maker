// This is a Next.js App Router "Route Handler" — it's the equivalent of
// an Express.js endpoint, but built into Next.js.
// Any file named `route.ts` inside `app/api/` becomes an API endpoint.
// This file lives at app/api/cpi-data/route.ts → accessible at /api/cpi-data

import { NextResponse } from "next/server";
import { getCPIHAggregates, getCPIHTimeSeries } from "@/lib/ons-api";
// The `@/` alias means "start from the project root" — it's configured
// by Next.js automatically so you don't have to write "../../../lib/ons-api"

// Exporting a function named `GET` tells Next.js:
// "when someone sends a GET request to /api/cpi-data, run this function"
export async function GET() {
  try {
    // Fetch the list of all CPIH categories from ONS
    const aggregates = await getCPIHAggregates();

    // For now, just return the categories list so we can verify the API works.
    // In the next phase, we'll fetch time series for selected categories.
    return NextResponse.json({
      success: true,
      count: aggregates.length,
      aggregates,
    });

  } catch (error) {
    // If anything goes wrong (network error, ONS is down, rate limit hit),
    // we catch the error here and return a 500 response with a message.
    // Sending a 500 is important — it tells the frontend "something went wrong
    // on the server", not "you sent a bad request".
    console.error("Failed to fetch CPI data:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch data from ONS API" },
      { status: 500 }
      // ^ The second argument to NextResponse.json() sets HTTP headers/status.
    );
  }
}