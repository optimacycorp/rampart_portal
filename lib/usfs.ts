import "server-only";

import crypto from "node:crypto";
import { normalizeWhitespace, stripHtmlTags } from "@/lib/html";

const USFS_FIRE_RESTRICTIONS_URL = "https://www.fs.usda.gov/r02/psicc/fire/fire-restrictions";
const USFS_RAMPART_RECREATION_URL = "https://www.fs.usda.gov/r02/psicc/recreation/trails/rampart-reservoir-trail-700";

export type UsfsAlertRecord = {
  externalAlertId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
};

export type UsfsFetchResult = {
  authoritativeStatus: "unknown" | "closed" | "restricted" | "seasonal_closure";
  summary: string;
  sourceUrl: string;
  rawStatusText: string;
  alerts: UsfsAlertRecord[];
  rawPayload: Record<string, unknown>;
};

function buildExternalId(prefix: string, sourceUrl: string, title: string) {
  return `${prefix}-${crypto.createHash("sha1").update(`${sourceUrl}|${title}`).digest("hex")}`;
}

function inferAlertType(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("fire restriction")) return "fire_restriction";
  if (normalized.includes("closure")) return "emergency_closure";
  if (normalized.includes("flood")) return "flood";
  if (normalized.includes("snow")) return "snow";
  if (normalized.includes("winter")) return "winter_closure";
  return "other";
}

function inferSeverity(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("stage 2")) return "high";
  if (normalized.includes("closure")) return "high";
  if (normalized.includes("stage 1")) return "moderate";
  return "info";
}

function parseUsfsAlertLinks(html: string) {
  const matches = Array.from(
    html.matchAll(/<a[^>]+href="([^"]*\/alerts\/[^"]+)"[^>]*>(.*?)<\/a>/gi)
  );

  const seen = new Set<string>();

  return matches
    .map((match) => {
      const href = match[1]?.startsWith("http") ? match[1] : `https://www.fs.usda.gov${match[1]}`;
      const title = normalizeWhitespace(stripHtmlTags(match[2] ?? ""));
      return { href, title };
    })
    .filter((entry) => entry.title && !entry.title.toLowerCase().includes("view all alerts"))
    .filter((entry) => {
      const key = `${entry.href}|${entry.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function parseRampartSeasonalClosureText(text: string) {
  const sentenceMatch = text.match(/During the winter months\s*\(December through April\)[^.]*\./i);
  return sentenceMatch ? normalizeWhitespace(sentenceMatch[0]) : null;
}

export async function fetchUsfsRoadStatus() {
  const headers = {
    "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || "(rampart-range.org, admin@rampart-range.org)"
  };

  const [fireRestrictionsResponse, recreationResponse] = await Promise.all([
    fetch(USFS_FIRE_RESTRICTIONS_URL, { headers, next: { revalidate: 0 } }),
    fetch(USFS_RAMPART_RECREATION_URL, { headers, next: { revalidate: 0 } })
  ]);

  if (!fireRestrictionsResponse.ok) {
    throw new Error(`USFS fire restrictions request failed (${fireRestrictionsResponse.status}) for ${USFS_FIRE_RESTRICTIONS_URL}`);
  }

  if (!recreationResponse.ok) {
    throw new Error(`USFS recreation request failed (${recreationResponse.status}) for ${USFS_RAMPART_RECREATION_URL}`);
  }

  const fireHtml = await fireRestrictionsResponse.text();
  const recreationHtml = await recreationResponse.text();
  const fireText = stripHtmlTags(fireHtml);
  const recreationText = stripHtmlTags(recreationHtml);

  const alertLinks = parseUsfsAlertLinks(fireHtml);
  const fireRestrictionHeading = fireText.match(/Stage\s+[12]\s+Fire Restrictions/i)?.[0] ?? null;
  const seasonalClosureText = parseRampartSeasonalClosureText(recreationText);

  const alerts: UsfsAlertRecord[] = [
    ...alertLinks.map((entry) => ({
      externalAlertId: buildExternalId("usfs-alert", entry.href, entry.title),
      alertType: inferAlertType(entry.title),
      severity: inferSeverity(entry.title),
      title: entry.title,
      description: `Forest Service alert listed on the PSICC fire restrictions page: ${entry.title}`,
      effectiveAt: null,
      expiresAt: null,
      sourceUrl: entry.href,
      rawPayload: {
        title: entry.title,
        source_page: USFS_FIRE_RESTRICTIONS_URL
      }
    }))
  ];

  if (fireRestrictionHeading) {
    alerts.push({
      externalAlertId: buildExternalId("usfs-fire", USFS_FIRE_RESTRICTIONS_URL, fireRestrictionHeading),
      alertType: "fire_restriction",
      severity: inferSeverity(fireRestrictionHeading),
      title: fireRestrictionHeading,
      description: "Fire restriction status published on the PSICC fire restrictions page.",
      effectiveAt: null,
      expiresAt: null,
      sourceUrl: USFS_FIRE_RESTRICTIONS_URL,
      rawPayload: {
        heading: fireRestrictionHeading
      }
    });
  }

  let authoritativeStatus: UsfsFetchResult["authoritativeStatus"] = "unknown";
  let summaryParts: string[] = [];

  if (alerts.some((alert) => alert.alertType === "emergency_closure")) {
    authoritativeStatus = "closed";
    summaryParts.push("USFS active closure-related alert detected.");
  } else if (alerts.some((alert) => alert.alertType === "fire_restriction")) {
    authoritativeStatus = "restricted";
    summaryParts.push("USFS fire restriction information detected.");
  }

  if (seasonalClosureText) {
    summaryParts.push(`Seasonal closure guidance: ${seasonalClosureText}`);
  }

  if (summaryParts.length === 0) {
    summaryParts.push("No active USFS closure or restriction text was parsed from the current source pages.");
  }

  return {
    authoritativeStatus,
    summary: summaryParts.join(" "),
    sourceUrl: USFS_FIRE_RESTRICTIONS_URL,
    rawStatusText: [fireRestrictionHeading, seasonalClosureText].filter(Boolean).join(" | ") || "No explicit closure or restriction text parsed.",
    alerts,
    rawPayload: {
      fire_restrictions_excerpt: fireText.slice(0, 4000),
      recreation_excerpt: recreationText.slice(0, 4000),
      parsed_alert_count: alerts.length
    }
  } satisfies UsfsFetchResult;
}
