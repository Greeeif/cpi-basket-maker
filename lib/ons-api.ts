// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ONS_API_BASE = "https://api.beta.ons.gov.uk/v1";
const CPIH_DATASET_ID = "cpih01";
const UK_GEOGRAPHY_CODE = "K02000001";


// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ONSAggregate {
  id: string;
  label: string;
}

export interface ONSObservation {
  time: string;
  aggregate: string;
  value: number;
}

interface ONSOptionsResponse {
  items: Array<{
    option: string;  // The actual ID field — ONS calls it `option`, not `id`
    label: string;
  }>;
  total_count: number;
  limit: number;
  offset: number;
}

interface ONSObservationsResponse {
  observations: Array<{
    observation: string;       // Index value as a string, e.g. "132.9"
    dimensions: {
      Time: {                   // Capital T — that's what ONS actually sends
        id: string;             // e.g. "Jul-24"
        label: string;          // e.g. "Jul-24"
        href: string;
      };
    };
  }>;
  total_observations: number;
}

interface ONSVersionsResponse {
  items: Array<{
    version: number;
  }>;
}

// ─── HELPER: PARSE ONS DATE STRINGS LIKE "Sep-92" ────────────────────────────

// `Record<string, number>` is a TypeScript type that means
// "an object whose keys are strings and whose values are numbers".
// We use it here to map month abbreviations → JavaScript month numbers.
// (JS months are 0-indexed: January = 0, December = 11. Yes, it's annoying.)
const MONTH_MAP: Record<string, number> = {
  Jan: 0,  Feb: 1,  Mar: 2,  Apr: 3,  May: 4,  Jun: 5,
  Jul: 6,  Aug: 7,  Sep: 8,  Oct: 9,  Nov: 10, Dec: 11,
};

function parseMonthYear(monthYear: string): Date {
  // .split("-") breaks the string at every "-" into an array of pieces.
  // "Sep-92".split("-") → ["Sep", "92"]
  // Then we use array destructuring to assign each piece to a variable:
  const [monthStr, yearStr] = monthYear.split("-");

  const month = MONTH_MAP[monthStr];

  // parseInt(string, radix) converts a string to an integer.
  // The radix (10) means "interpret as base-10". Always pass it explicitly
  // — without it, parseInt occasionally has surprising behaviour.
  const yearNum = parseInt(yearStr, 10);

  // Year disambiguation: ONS gives us "92", we have to decide if that's
  // 1992 or 2092. Since data ranges 1988 → present, we use 50 as the cutoff.
  // Ternary syntax: `condition ? valueIfTrue : valueIfFalse`
  const fullYear = yearNum >= 50 ? 1900 + yearNum : 2000 + yearNum;

  // new Date(year, monthIndex, day) creates a Date object.
  // We use day 1 because we only care about the month.
  return new Date(fullYear, month, 1);
}

// ─── HELPER: GET LATEST VERSION NUMBER ───────────────────────────────────────

async function getLatestVersion(): Promise<number> {
  const url = `${ONS_API_BASE}/datasets/${CPIH_DATASET_ID}/editions/time-series/versions`;

  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    throw new Error(`ONS API error fetching versions: ${response.status}`);
  }

  const data: ONSVersionsResponse = await response.json();
  const versionNumbers = data.items.map((item) => item.version);

  return Math.max(...versionNumbers);
}


// ─── GET ALL CPIH CATEGORIES (paginated) ─────────────────────────────────────

export async function getCPIHAggregates(): Promise<ONSAggregate[]> {
  const latestVersion = await getLatestVersion();

  const baseUrl =
    `${ONS_API_BASE}/datasets/${CPIH_DATASET_ID}/editions/time-series` +
    `/versions/${latestVersion}/dimensions/aggregate/options`;

  const allItems: ONSAggregate[] = [];
  let offset = 0;
  const limit = 20;

  while (true) {
    const url = `${baseUrl}?offset=${offset}&limit=${limit}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`ONS API error fetching aggregates: ${response.status}`);
    }

    const data: ONSOptionsResponse = await response.json();

    allItems.push(
      ...data.items.map((item) => ({
        id: item.option,
        label: item.label,
      }))
    );

    offset += limit;

    if (allItems.length >= data.total_count) {
      break;
    }
  }

  return allItems;
}


// ─── GET TIME SERIES FOR A SPECIFIC CATEGORY ─────────────────────────────────

export async function getCPIHTimeSeries(
  aggregateId: string
): Promise<ONSObservation[]> {
  const latestVersion = await getLatestVersion();

  const url =
    `${ONS_API_BASE}/datasets/${CPIH_DATASET_ID}/editions/time-series` +
    `/versions/${latestVersion}/observations` +
    `?time=*&geography=${UK_GEOGRAPHY_CODE}&aggregate=${aggregateId}`;

  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    throw new Error(`ONS API error fetching time series: ${response.status}`);
  }

  const data: ONSObservationsResponse = await response.json();

  const observations = data.observations.map((obs) => ({
    time:      obs.dimensions.Time.id,
    aggregate: aggregateId,
    value:     parseFloat(obs.observation),
  }));
    return observations.sort(
    (a, b) => parseMonthYear(a.time).getTime() - parseMonthYear(b.time).getTime()
  );
}