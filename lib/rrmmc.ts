import "server-only";

import { normalizeWhitespace, stripHtmlTags } from "@/lib/html";

const RRMMC_HOME_URL = "https://rampartrange.org/";

export type RrmmcFetchResult = {
  trailStatus: string | null;
  roadStatus: string | null;
  summary: string | null;
  sourceUrl: string;
  rawStatusText: string | null;
  rawPayload: Record<string, unknown>;
};

function parseStatusValue(html: string, label: "Trail Status" | "Rampart Range Road Status") {
  const match = html.match(new RegExp(`${label}:\\s*([A-Z ]+)`, "i"));
  return match?.[1] ? normalizeWhitespace(match[1]).toUpperCase() : null;
}

function mapRoadStatus(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized.includes("open")) {
    return "open";
  }

  if (normalized.includes("closed")) {
    return "closed";
  }

  if (normalized.includes("restrict")) {
    return "restricted";
  }

  if (normalized.includes("partial")) {
    return "partially_closed";
  }

  return "unknown";
}

export function mapRrmmcRoadStatus(status: string | null) {
  return mapRoadStatus(status);
}

export async function fetchRrmmcRoadStatus() {
  const response = await fetch(RRMMC_HOME_URL, {
    headers: {
      "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || "(rampart-range.org, admin@rampart-range.org)"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`RRMMC request failed (${response.status}) for ${RRMMC_HOME_URL}`);
  }

  const html = await response.text();
  const text = stripHtmlTags(html);
  const trailStatus = parseStatusValue(text, "Trail Status");
  const roadStatus = parseStatusValue(text, "Rampart Range Road Status");

  if (!roadStatus) {
    throw new Error("RRMMC parser could not find Rampart Range Road Status on the homepage.");
  }

  return {
    trailStatus,
    roadStatus,
    summary: `RRMMC reports Trail Status: ${trailStatus ?? "unknown"} and Rampart Range Road Status: ${roadStatus}.`,
    sourceUrl: RRMMC_HOME_URL,
    rawStatusText: roadStatus,
    rawPayload: {
      trail_status: trailStatus,
      road_status: roadStatus,
      extracted_text: text.slice(0, 4000)
    }
  } satisfies RrmmcFetchResult;
}
