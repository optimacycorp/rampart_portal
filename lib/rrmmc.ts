import "server-only";

import { normalizeWhitespace, stripHtmlTags } from "@/lib/html";

const RRMMC_STATUS_URLS = [
  "https://rampartrange.org/",
  "https://www.rampartrange.org/",
  "https://rampartrange.org/trail-info/",
  "https://rampartrange.org/events/"
];

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
  const errors: string[] = [];

  for (const sourceUrl of RRMMC_STATUS_URLS) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || "(rampart-range.org, admin@rampart-range.org)"
        },
        next: { revalidate: 0 }
      });

      if (!response.ok) {
        errors.push(`RRMMC request failed (${response.status}) for ${sourceUrl}`);
        continue;
      }

      const html = await response.text();
      const text = stripHtmlTags(html);
      const trailStatus = parseStatusValue(text, "Trail Status");
      const roadStatus = parseStatusValue(text, "Rampart Range Road Status");

      if (!roadStatus) {
        errors.push(`RRMMC parser could not find Rampart Range Road Status at ${sourceUrl}.`);
        continue;
      }

      return {
        trailStatus,
        roadStatus,
        summary: `RRMMC reports Trail Status: ${trailStatus ?? "unknown"} and Rampart Range Road Status: ${roadStatus}.`,
        sourceUrl,
        rawStatusText: roadStatus,
        rawPayload: {
          trail_status: trailStatus,
          road_status: roadStatus,
          extracted_text: text.slice(0, 4000)
        }
      } satisfies RrmmcFetchResult;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown RRMMC error at ${sourceUrl}`);
    }
  }

  throw new Error(`RRMMC status fetch failed. ${errors.join(" | ")}`);
}
