import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_NWS_USER_AGENT = "(rampart-range.org, admin@rampart-range.org)";
const RRMMC_STATUS_URLS = [
  "https://rampartrange.org/",
  "https://www.rampartrange.org/",
  "https://rampartrange.org/trail-info/",
  "https://rampartrange.org/events/"
];
const COTREX_DATASET_PAGE_URL = "https://data.colorado.gov/Recreation/Colorado-Trail-Explorer-COTREX-/tsn8-y22x";
const COTREX_DATASET_METADATA_URL = "https://data.colorado.gov/api/views/tsn8-y22x.json";
const USFS_FIRE_RESTRICTIONS_URL = "https://www.fs.usda.gov/r02/psicc/fire/fire-restrictions";
const USFS_RAMPART_RECREATION_URL = "https://www.fs.usda.gov/r02/psicc/recreation/trails/rampart-reservoir-trail-700";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();

  for (const fileName of [".env.local", ".env"]) {
    loadEnvFile(path.join(cwd, fileName));
  }
}

function normalizeString(value) {
  return `${value ?? ""}`.trim();
}

function readIntEnv(name, fallback) {
  const raw = normalizeString(process.env[name]);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getConfiguredRrmmcStatusUrls() {
  const configured = normalizeString(process.env.ROAD_RRMMC_STATUS_URLS);
  if (!configured) return RRMMC_STATUS_URLS;
  const urls = configured.split(",").map((value) => value.trim()).filter(Boolean);
  return urls.length ? urls : RRMMC_STATUS_URLS;
}

function toIsoNow() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const parsed = {
    projectSlug: process.env.ROAD_INTELLIGENCE_PROJECT_SLUG || "3245-rampart-range-road",
    mode: process.env.ROAD_INTELLIGENCE_REFRESH_MODE || "all",
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--project-slug") {
      parsed.projectSlug = argv[index + 1] || parsed.projectSlug;
      index += 1;
    } else if (arg === "--mode") {
      parsed.mode = argv[index + 1] || parsed.mode;
      index += 1;
    } else if (arg.startsWith("--mode=")) {
      parsed.mode = arg.split("=", 2)[1] || parsed.mode;
    } else if (arg === "--json") {
      parsed.json = true;
    }
  }

  return parsed;
}

function celsiusToFahrenheit(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(((value * 9) / 5 + 32).toFixed(1));
}

function pascalsToMillibars(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number((value / 100).toFixed(1));
}

function metersToMiles(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number((value / 1609.344).toFixed(2));
}

function millimetersToInches(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number((value / 25.4).toFixed(2));
}

function kilometersPerHourToMph(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Number((value * 0.621371).toFixed(1));
}

function parseWindSpeedMph(value) {
  if (!value) return null;
  const match = value.match(/(\d+)(?:\s*to\s*(\d+))?/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;
  if (!Number.isFinite(first)) return null;
  return second && Number.isFinite(second) ? Math.max(first, second) : first;
}

function inferSnowfallInches(period) {
  const combined = `${period.shortForecast ?? ""} ${period.detailedForecast ?? ""}`.toLowerCase();
  const match = combined.match(/(\d+(?:\.\d+)?)\s*(?:to\s*(\d+(?:\.\d+)?))?\s*inch(?:es)?\s+of\s+snow/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;
  if (!Number.isFinite(first)) return null;
  return second && Number.isFinite(second) ? Math.max(first, second) : first;
}

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(value) {
  return `${value ?? ""}`.replace(/\s+/g, " ").trim();
}

function simpleExternalId(prefix, seed) {
  const normalized = normalizeWhitespace(seed).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${prefix}-${normalized.slice(0, 80) || "record"}`;
}

async function fetchJson(url, headers) {
  return fetchWithRetry(url, headers, "json");
}

async function fetchText(url, headers) {
  return fetchWithRetry(url, headers, "text");
}

async function fetchWithRetry(url, headers, responseType) {
  const timeoutMs = readIntEnv("ROAD_INTEL_FETCH_TIMEOUT_MS", 20000);
  const retryCount = readIntEnv("ROAD_INTEL_FETCH_RETRIES", 2);
  let lastError = null;

  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }

      return responseType === "json" ? response.json() : response.text();
    } catch (error) {
      lastError = error;

      if (attempt > retryCount) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError instanceof Error
    ? new Error(`${lastError.message} [url=${url}]`)
    : new Error(`Request failed for ${url}`);
}

async function fetchNwsForPoint(latitude, longitude) {
  const headers = {
    Accept: "application/geo+json",
    "User-Agent": process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT
  };

  const pointJson = await fetchJson(`https://api.weather.gov/points/${latitude},${longitude}`, headers);
  const pointProperties = pointJson.properties;

  if (!pointProperties?.forecast || !pointProperties.observationStations) {
    throw new Error(`NWS points response for ${latitude},${longitude} did not include forecast and station links.`);
  }

  const [stationsJson, forecastJson, alertsJson] = await Promise.all([
    fetchJson(pointProperties.observationStations, headers),
    fetchJson(pointProperties.forecastHourly ?? pointProperties.forecast, headers),
    fetchJson(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`, headers)
  ]);

  const stationIdentifier = stationsJson.features?.[0]?.properties?.stationIdentifier ?? null;
  let observation = null;

  if (stationIdentifier) {
    const observationJson = await fetchJson(
      `https://api.weather.gov/stations/${stationIdentifier}/observations/latest`,
      headers
    );
    const props = observationJson.properties ?? {};

    observation = {
      observedAt: props.timestamp ?? toIsoNow(),
      temperatureF: celsiusToFahrenheit(props.temperature?.value),
      dewpointF: celsiusToFahrenheit(props.dewpoint?.value),
      relativeHumidityPercent:
        props.relativeHumidity?.value != null ? Number(props.relativeHumidity.value.toFixed(1)) : null,
      windSpeedMph: kilometersPerHourToMph(props.windSpeed?.value),
      windGustMph: kilometersPerHourToMph(props.windGust?.value),
      windDirectionDeg: props.windDirection?.value != null ? Number(props.windDirection.value.toFixed(0)) : null,
      precipitation1hIn: millimetersToInches(props.precipitationLastHour?.value),
      pressureMb: pascalsToMillibars(props.barometricPressure?.value),
      visibilityMiles: metersToMiles(props.visibility?.value),
      weatherDescription: props.textDescription ?? null,
      rawPayload: readJsonObject(observationJson)
    };
  }

  const forecasts =
    forecastJson.properties?.periods?.slice(0, 12).map((period) => ({
      periodStart: period.startTime ?? null,
      periodEnd: period.endTime ?? null,
      forecastGeneratedAt: forecastJson.properties?.generatedAt ?? null,
      temperatureF: period.temperature ?? null,
      precipitationProbability: period.probabilityOfPrecipitation?.value ?? null,
      snowfallInches: inferSnowfallInches({
        shortForecast: period.shortForecast,
        detailedForecast: period.detailedForecast
      }),
      windSpeedMph: parseWindSpeedMph(period.windSpeed),
      windGustMph: null,
      shortForecast: period.shortForecast ?? null,
      detailedForecast: period.detailedForecast ?? null,
      rawPayload: readJsonObject(period)
    })) ?? [];

  const alerts =
    alertsJson.features?.map((feature) => {
      const properties = feature.properties ?? {};
      const title = properties.headline ?? properties.event ?? "NWS weather alert";
      const effectiveAt = properties.effective ?? properties.onset ?? null;
      const expiresAt = properties.expires ?? properties.ends ?? null;
      return {
        externalAlertId:
          feature.id ??
          simpleExternalId("nws", `${title}|${effectiveAt ?? ""}|${expiresAt ?? ""}`),
        alertType:
          (properties.event ?? "weather_alert")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") || "weather_alert",
        severity: properties.severity?.toLowerCase() ?? null,
        title,
        description: [properties.description, properties.instruction].filter(Boolean).join("\n\n") || null,
        effectiveAt,
        expiresAt,
        sourceUrl: feature.id ?? `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
        rawPayload: readJsonObject(feature)
      };
    }) ?? [];

  return {
    stationIdentifier,
    observation,
    forecasts,
    alerts
  };
}

function parseRrmmcStatusValue(text, label) {
  const match = text.match(new RegExp(`${label}:\\s*([A-Z ]+)`, "i"));
  return match?.[1] ? normalizeWhitespace(match[1]).toUpperCase() : null;
}

function mapRoadStatus(status) {
  const normalized = `${status ?? ""}`.toLowerCase();
  if (normalized.includes("open")) return "open";
  if (normalized.includes("closed")) return "closed";
  if (normalized.includes("restrict")) return "restricted";
  if (normalized.includes("partial")) return "partially_closed";
  return "unknown";
}

async function fetchRrmmcRoadStatus() {
  const headers = {
    "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT
  };
  const errors = [];

  for (const url of getConfiguredRrmmcStatusUrls()) {
    try {
      const html = await fetchText(url, headers);
      const text = stripHtmlTags(html);
      const trailStatus = parseRrmmcStatusValue(text, "Trail Status");
      const roadStatus = parseRrmmcStatusValue(text, "Rampart Range Road Status");

      if (!roadStatus) {
        errors.push(`No road status found at ${url}`);
        continue;
      }

      return {
        trailStatus,
        roadStatus,
        summary: `RRMMC reports Trail Status: ${trailStatus ?? "unknown"} and Rampart Range Road Status: ${roadStatus}.`,
        sourceUrl: url,
        rawStatusText: roadStatus,
        rawPayload: {
          trail_status: trailStatus,
          road_status: roadStatus,
          extracted_text: text.slice(0, 4000)
        }
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown RRMMC error at ${url}`);
    }
  }

  const manualRoadStatus = normalizeString(process.env.ROAD_RRMMC_MANUAL_ROAD_STATUS);
  if (manualRoadStatus) {
    const manualTrailStatus = normalizeString(process.env.ROAD_RRMMC_MANUAL_TRAIL_STATUS) || null;
    const manualSourceUrl = normalizeString(process.env.ROAD_RRMMC_MANUAL_SOURCE_URL) || "manual://rrmmc";
    const manualNote =
      normalizeString(process.env.ROAD_RRMMC_MANUAL_NOTE) ||
      "Manual RRMMC fallback configured because the server could not reach the live RRMMC site.";

    return {
      trailStatus: manualTrailStatus,
      roadStatus: manualRoadStatus,
      summary: `RRMMC fallback status in use. Trail Status: ${manualTrailStatus ?? "unknown"}. Rampart Range Road Status: ${manualRoadStatus}. ${manualNote}`,
      sourceUrl: manualSourceUrl,
      rawStatusText: manualRoadStatus,
      rawPayload: {
        mode: "manual_fallback",
        trail_status: manualTrailStatus,
        road_status: manualRoadStatus,
        note: manualNote,
        fetch_errors: errors
      }
    };
  }

  throw new Error(`RRMMC status fetch failed. ${errors.join(" | ")}`);
}

async function fetchCotrexDatasetStatus() {
  const response = await fetch(COTREX_DATASET_METADATA_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT
    },
    cache: "no-store",
    signal: AbortSignal.timeout(readIntEnv("ROAD_INTEL_FETCH_TIMEOUT_MS", 20000))
  });

  if (!response.ok) {
    throw new Error(`COTREX metadata request failed (${response.status}) for ${COTREX_DATASET_METADATA_URL}`);
  }

  const metadata = await response.json();
  const updatedAt =
    metadata?.rowsUpdatedAt && Number.isFinite(metadata.rowsUpdatedAt)
      ? new Date(metadata.rowsUpdatedAt * 1000).toISOString()
      : normalizeString(metadata?.metadata_updated_at) || null;
  const datasetTitle = normalizeString(metadata?.name) || "Colorado Trail Explorer (COTREX)";

  return {
    summary: updatedAt
      ? `${datasetTitle} public dataset is reachable. Metadata indicates it was updated ${updatedAt}.`
      : `${datasetTitle} public dataset is reachable through the Colorado Information Marketplace.`,
    sourceUrl: COTREX_DATASET_PAGE_URL,
    rawStatusText: updatedAt ? `Dataset reachable; updated ${updatedAt}` : "Dataset reachable",
    rawPayload: {
      dataset_page_url: COTREX_DATASET_PAGE_URL,
      metadata_url: COTREX_DATASET_METADATA_URL,
      dataset_name: metadata?.name ?? null,
      rows_updated_at: metadata?.rowsUpdatedAt ?? null,
      metadata_updated_at: metadata?.metadata_updated_at ?? null
    }
  };
}

function inferAlertType(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes("fire restriction")) return "fire_restriction";
  if (normalized.includes("rampart") && normalized.includes("winter")) return "winter_closure";
  if (normalized.includes("rampart") && normalized.includes("closure")) return "emergency_closure";
  if (normalized.includes("flood")) return "flood";
  if (normalized.includes("snow")) return "snow";
  if (normalized.includes("winter")) return "winter_closure";
  return "other";
}

function inferSeverity(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes("stage 2")) return "high";
  if (normalized.includes("closure")) return "high";
  if (normalized.includes("stage 1")) return "moderate";
  return "info";
}

function parseUsfsAlertLinks(html) {
  const matches = Array.from(html.matchAll(/<a[^>]+href="([^"]*\/alerts\/[^"]+)"[^>]*>(.*?)<\/a>/gi));
  const seen = new Set();

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

function parseRampartSeasonalClosureText(text) {
  const sentenceMatch = text.match(/During the winter months\s*\(December through April\)[^.]*\./i);
  return sentenceMatch ? normalizeWhitespace(sentenceMatch[0]) : null;
}

function isRampartSeasonalClosureActive(referenceDate = new Date()) {
  const denverParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(referenceDate);

  const values = Object.fromEntries(denverParts.map((part) => [part.type, part.value]));
  const month = Number(values.month ?? "0");
  const day = Number(values.day ?? "0");

  if (month === 12) return day >= 1;
  if (month === 1 || month === 2 || month === 3) return true;
  if (month === 4) return day <= 1;
  return false;
}

async function fetchUsfsRoadStatus() {
  const headers = {
    "User-Agent": process.env.ROAD_STATUS_USER_AGENT || process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT
  };

  const [fireResult, recreationResult] = await Promise.allSettled([
    fetchText(USFS_FIRE_RESTRICTIONS_URL, headers),
    fetchText(USFS_RAMPART_RECREATION_URL, headers)
  ]);

  if (fireResult.status === "rejected" && recreationResult.status === "rejected") {
    throw new Error(
      `USFS fetch failed. Fire page: ${fireResult.reason instanceof Error ? fireResult.reason.message : "unknown"} | Recreation page: ${
        recreationResult.reason instanceof Error ? recreationResult.reason.message : "unknown"
      }`
    );
  }

  const fireHtml = fireResult.status === "fulfilled" ? fireResult.value : "";
  const recreationHtml = recreationResult.status === "fulfilled" ? recreationResult.value : "";
  const fireText = fireHtml ? stripHtmlTags(fireHtml) : "";
  const recreationText = recreationHtml ? stripHtmlTags(recreationHtml) : "";
  const alertLinks = fireHtml ? parseUsfsAlertLinks(fireHtml) : [];
  const fireRestrictionHeading = fireText.match(/Stage\s+[12]\s+Fire Restrictions/i)?.[0] ?? null;
  const seasonalClosureText = parseRampartSeasonalClosureText(recreationText);

  const alerts = [
    ...alertLinks.map((entry) => ({
      externalAlertId: simpleExternalId("usfs-alert", `${entry.href}|${entry.title}`),
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
      externalAlertId: simpleExternalId("usfs-fire", `${USFS_FIRE_RESTRICTIONS_URL}|${fireRestrictionHeading}`),
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

  let authoritativeStatus = "unknown";
  const summaryParts = [];
  const seasonalClosureActive = seasonalClosureText ? isRampartSeasonalClosureActive() : false;

  if (seasonalClosureActive) {
    authoritativeStatus = "seasonal_closure";
    summaryParts.push("Rampart Range Road is within the expected seasonal closure window (December 1 through April 1).");
  } else if (alerts.some((alert) => alert.alertType === "emergency_closure")) {
    authoritativeStatus = "closed";
    summaryParts.push("USFS closure-related alert specific to Rampart was detected.");
  } else if (alerts.some((alert) => alert.alertType === "fire_restriction")) {
    authoritativeStatus = "restricted";
    summaryParts.push("USFS fire restriction information detected.");
  } else if (seasonalClosureText) {
    authoritativeStatus = "open";
    summaryParts.push("Rampart Range Road is outside the seasonal closure window described by the USFS recreation page.");
  }

  if (seasonalClosureText) {
    summaryParts.push(`Seasonal closure guidance: ${seasonalClosureText}`);
  }

  if (summaryParts.length === 0) {
    summaryParts.push("No active USFS closure or restriction text was parsed from the current source pages.");
  }

  if (fireResult.status === "rejected") {
    summaryParts.push("USFS fire restrictions page could not be fetched during this run.");
  }

  if (recreationResult.status === "rejected") {
    summaryParts.push("USFS recreation page could not be fetched during this run.");
  }

  return {
    authoritativeStatus,
    summary: summaryParts.join(" "),
    sourceUrl: USFS_FIRE_RESTRICTIONS_URL,
    rawStatusText:
      [fireRestrictionHeading, seasonalClosureText].filter(Boolean).join(" | ") ||
      "No explicit closure or restriction text parsed.",
    alerts
  };
}

async function getProjectAndOverview(supabase, projectSlug) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, slug, name")
    .eq("slug", projectSlug)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found for slug ${projectSlug}.`);
  }

  const { data: corridor, error: corridorError } = await supabase
    .from("road_corridors")
    .select("id, project_id, name, road_number, managing_agency")
    .eq("project_id", project.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (corridorError || !corridor) {
    throw new Error(`No active road corridor found for ${projectSlug}.`);
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("road_data_sources")
    .select("id, provider_key, provider_name, authority_level, parser_version")
    .in("provider_key", ["nws", "rrmmc", "usfs_psicc", "portal_system", "cotrex"]);

  if (sourcesError || !sources) {
    throw new Error("Road data sources could not be loaded.");
  }

  const { data: weatherLocations, error: weatherLocationsError } = await supabase
    .from("road_weather_locations")
    .select("id, name, latitude, longitude, elevation_ft, station_identifier")
    .eq("corridor_id", corridor.id)
    .eq("active", true)
    .order("name", { ascending: true });

  if (weatherLocationsError || !weatherLocations) {
    throw new Error("Road weather locations could not be loaded.");
  }

  return {
    project,
    corridor,
    sources,
    weatherLocations
  };
}

async function createRun(supabase, sourceId, jobName, parserVersion, metadata) {
  const { data, error } = await supabase
    .from("road_ingestion_runs")
    .insert({
      source_id: sourceId,
      job_name: jobName,
      started_at: toIsoNow(),
      status: "running",
      parser_version: parserVersion,
      metadata
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create ingestion run for ${jobName}.`);
  }

  return data.id;
}

async function markRunSuccess(supabase, runId, payload) {
  const { error } = await supabase
    .from("road_ingestion_runs")
    .update({
      completed_at: toIsoNow(),
      status: "success",
      ...payload
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

async function markRunFailure(supabase, runId, errorMessage, payload = {}) {
  await supabase
    .from("road_ingestion_runs")
    .update({
      completed_at: toIsoNow(),
      status: "failed",
      error_message: errorMessage,
      ...payload
    })
    .eq("id", runId);
}

async function updateSourceSuccess(supabase, sourceId, parserVersion) {
  const { error } = await supabase
    .from("road_data_sources")
    .update({
      last_attempt_at: toIsoNow(),
      last_success_at: toIsoNow(),
      parser_version: parserVersion,
      updated_at: toIsoNow()
    })
    .eq("id", sourceId);

  if (error) {
    throw error;
  }
}

async function updateSourceAttempt(supabase, sourceId) {
  await supabase
    .from("road_data_sources")
    .update({
      last_attempt_at: toIsoNow(),
      updated_at: toIsoNow()
    })
    .eq("id", sourceId);
}

async function refreshRoadWeather(supabase, overview) {
  const nwsSource = overview.sources.find((source) => source.provider_key === "nws");

  if (!nwsSource) {
    throw new Error("NWS road-data source record is missing.");
  }

  const runId = await createRun(supabase, nwsSource.id, "cron-nws-refresh", "nws-cron-v1", {
    corridor_id: overview.corridor.id,
    weather_location_count: overview.weatherLocations.length
  });

  let recordsInserted = 0;
  let recordsUpdated = 0;
  let recordsReceived = 0;
  const fetchedResults = [];

  try {
    for (const location of overview.weatherLocations) {
      const result = await fetchNwsForPoint(Number(location.latitude), Number(location.longitude));
      fetchedResults.push(result);
      recordsReceived += 1 + result.forecasts.length + result.alerts.length;

      if (result.stationIdentifier && result.stationIdentifier !== location.station_identifier) {
        const { error } = await supabase
          .from("road_weather_locations")
          .update({ station_identifier: result.stationIdentifier })
          .eq("id", location.id);

        if (!error) {
          recordsUpdated += 1;
        }
      }

      if (result.observation) {
        const { error } = await supabase.from("weather_observations").upsert(
          {
            location_id: location.id,
            source_id: nwsSource.id,
            observed_at: result.observation.observedAt,
            temperature_f: result.observation.temperatureF,
            dewpoint_f: result.observation.dewpointF,
            relative_humidity_percent: result.observation.relativeHumidityPercent,
            wind_speed_mph: result.observation.windSpeedMph,
            wind_gust_mph: result.observation.windGustMph,
            wind_direction_deg: result.observation.windDirectionDeg,
            precipitation_1h_in: result.observation.precipitation1hIn,
            pressure_mb: result.observation.pressureMb,
            visibility_miles: result.observation.visibilityMiles,
            weather_description: result.observation.weatherDescription,
            raw_payload: result.observation.rawPayload,
            fetched_at: toIsoNow()
          },
          { onConflict: "location_id,source_id,observed_at", ignoreDuplicates: false }
        );

        if (error) throw error;
        recordsInserted += 1;
      }

      await supabase.from("weather_forecasts").delete().eq("location_id", location.id).eq("source_id", nwsSource.id);

      if (result.forecasts.length > 0) {
        const { error } = await supabase.from("weather_forecasts").insert(
          result.forecasts.map((forecast) => ({
            location_id: location.id,
            source_id: nwsSource.id,
            forecast_generated_at: forecast.forecastGeneratedAt,
            period_start: forecast.periodStart,
            period_end: forecast.periodEnd,
            temperature_f: forecast.temperatureF,
            precipitation_probability: forecast.precipitationProbability,
            snowfall_inches: forecast.snowfallInches,
            wind_speed_mph: forecast.windSpeedMph,
            wind_gust_mph: forecast.windGustMph,
            short_forecast: forecast.shortForecast,
            detailed_forecast: forecast.detailedForecast,
            raw_payload: forecast.rawPayload,
            fetched_at: toIsoNow()
          }))
        );

        if (error) throw error;
        recordsInserted += result.forecasts.length;
      }
    }

    await supabase
      .from("road_closures_alerts")
      .update({
        active: false,
        updated_at: toIsoNow()
      })
      .eq("corridor_id", overview.corridor.id)
      .eq("source_id", nwsSource.id);

    const allAlerts = fetchedResults.flatMap((result) => result.alerts);
    const dedupedAlerts = Array.from(new Map(allAlerts.map((alert) => [alert.externalAlertId, alert])).values());

    if (dedupedAlerts.length > 0) {
      const { error } = await supabase.from("road_closures_alerts").upsert(
        dedupedAlerts.map((alert) => ({
          corridor_id: overview.corridor.id,
          source_id: nwsSource.id,
          external_alert_id: alert.externalAlertId,
          alert_type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          effective_at: alert.effectiveAt,
          expires_at: alert.expiresAt,
          active: true,
          source_url: alert.sourceUrl,
          raw_payload: alert.rawPayload,
          updated_at: toIsoNow()
        })),
        {
          onConflict: "source_id,external_alert_id",
          ignoreDuplicates: false
        }
      );

      if (error) throw error;
      recordsInserted += dedupedAlerts.length;
    }

    await updateSourceSuccess(supabase, nwsSource.id, "nws-cron-v1");
    await markRunSuccess(supabase, runId, {
      records_received: recordsReceived,
      records_inserted: recordsInserted,
      records_updated: recordsUpdated,
      http_status: 200,
      metadata: {
        corridor_id: overview.corridor.id,
        weather_location_count: overview.weatherLocations.length,
        active_alert_count: dedupedAlerts.length
      }
    });

    return {
      weatherLocationCount: overview.weatherLocations.length,
      recordsInserted,
      recordsUpdated,
      recordsReceived,
      activeAlerts: dedupedAlerts.length
    };
  } catch (error) {
    await updateSourceAttempt(supabase, nwsSource.id);
    await markRunFailure(
      supabase,
      runId,
      error instanceof Error ? error.message : "Unexpected NWS refresh failure.",
      {
        records_received: recordsReceived,
        records_inserted: recordsInserted,
        records_updated: recordsUpdated
      }
    );
    throw error;
  }
}

async function refreshRoadStatusSources(supabase, overview) {
  const rrmmcSource = overview.sources.find((source) => source.provider_key === "rrmmc");
  const usfsSource = overview.sources.find((source) => source.provider_key === "usfs_psicc");
  const cotrexSource = overview.sources.find((source) => source.provider_key === "cotrex");

  if (!rrmmcSource || !usfsSource) {
    throw new Error("USFS or RRMMC source record is missing.");
  }

  const rrmmcRunId = await createRun(supabase, rrmmcSource.id, "cron-rrmmc-refresh", "rrmmc-cron-v1", {
    corridor_id: overview.corridor.id
  });
  const usfsRunId = await createRun(supabase, usfsSource.id, "cron-usfs-refresh", "usfs-cron-v1", {
    corridor_id: overview.corridor.id
  });

  const result = {
    cotrexStatus: cotrexSource?.enabled === false ? "disabled" : null,
    cotrexError: null,
    rrmmcStatus: null,
    rrmmcError: null,
    usfsStatus: null,
    usfsAlertCount: 0,
    usfsError: null
  };

  if (cotrexSource && cotrexSource.enabled !== false) {
    const cotrexRunId = await createRun(supabase, cotrexSource.id, "cron-cotrex-refresh", "cotrex-cron-v1", {
      corridor_id: overview.corridor.id
    });

    await fetchCotrexDatasetStatus()
      .then(async (cotrex) => {
        const observationInsert = await supabase.from("road_status_observations").insert({
          corridor_id: overview.corridor.id,
          source_id: cotrexSource.id,
          observed_at: toIsoNow(),
          fetched_at: toIsoNow(),
          status: "unknown",
          gate_status: "unknown",
          summary: cotrex.summary,
          raw_status_text: cotrex.rawStatusText,
          source_url: cotrex.sourceUrl,
          confidence: 0.3,
          official: false,
          raw_payload: cotrex.rawPayload
        });

        if (observationInsert.error) throw observationInsert.error;

        await updateSourceSuccess(supabase, cotrexSource.id, "cotrex-cron-v1");
        await markRunSuccess(supabase, cotrexRunId, {
          records_received: 1,
          records_inserted: 1,
          records_updated: 0,
          http_status: 200,
          metadata: {
            dataset_status: "reachable"
          }
        });

        result.cotrexStatus = "reachable";
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : "Unexpected COTREX refresh failure.";
        result.cotrexError = message;
        await updateSourceAttempt(supabase, cotrexSource.id);
        await markRunFailure(supabase, cotrexRunId, message);
      });
  }

  const rrmmcOutcome = await fetchRrmmcRoadStatus()
    .then(async (rrmmc) => {
      const rrmmcInsert = await supabase.from("road_status_observations").insert({
        corridor_id: overview.corridor.id,
        source_id: rrmmcSource.id,
        observed_at: toIsoNow(),
        fetched_at: toIsoNow(),
        status: mapRoadStatus(rrmmc.roadStatus),
        gate_status: "unknown",
        summary: rrmmc.summary,
        raw_status_text: rrmmc.rawStatusText,
        source_url: rrmmc.sourceUrl,
        confidence: 0.7,
        official: false,
        raw_payload: rrmmc.rawPayload
      });

      if (rrmmcInsert.error) throw rrmmcInsert.error;

      await updateSourceSuccess(supabase, rrmmcSource.id, "rrmmc-cron-v1");
      await markRunSuccess(supabase, rrmmcRunId, {
        records_received: 1,
        records_inserted: 1,
        records_updated: 0,
        http_status: 200,
        metadata: {
          road_status: rrmmc.roadStatus,
          trail_status: rrmmc.trailStatus
        }
      });

      result.rrmmcStatus = rrmmc.roadStatus;
      return true;
    })
    .catch(async (error) => {
      const message = error instanceof Error ? error.message : "Unexpected RRMMC refresh failure.";
      result.rrmmcError = message;
      await updateSourceAttempt(supabase, rrmmcSource.id);
      await markRunFailure(supabase, rrmmcRunId, message);
      return false;
    });

  const usfsOutcome = await fetchUsfsRoadStatus()
    .then(async (usfs) => {
      await supabase
        .from("road_closures_alerts")
        .update({
          active: false,
          updated_at: toIsoNow()
        })
        .eq("corridor_id", overview.corridor.id)
        .eq("source_id", usfsSource.id);

      const usfsObservationInsert = await supabase.from("road_status_observations").insert({
        corridor_id: overview.corridor.id,
        source_id: usfsSource.id,
        observed_at: toIsoNow(),
        fetched_at: toIsoNow(),
        status: usfs.authoritativeStatus,
        gate_status: "unknown",
        summary: usfs.summary,
        raw_status_text: usfs.rawStatusText,
        source_url: usfs.sourceUrl,
        confidence: 0.85,
        official: true,
        raw_payload: {
          raw_status_text: usfs.rawStatusText
        }
      });

      if (usfsObservationInsert.error) throw usfsObservationInsert.error;

      if (usfs.alerts.length > 0) {
        const alertUpsert = await supabase.from("road_closures_alerts").upsert(
          usfs.alerts.map((alert) => ({
            corridor_id: overview.corridor.id,
            source_id: usfsSource.id,
            external_alert_id: alert.externalAlertId,
            alert_type: alert.alertType,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            effective_at: alert.effectiveAt,
            expires_at: alert.expiresAt,
            active: true,
            source_url: alert.sourceUrl,
            raw_payload: alert.rawPayload,
            updated_at: toIsoNow()
          })),
          {
            onConflict: "source_id,external_alert_id",
            ignoreDuplicates: false
          }
        );

        if (alertUpsert.error) throw alertUpsert.error;
      }

      await updateSourceSuccess(supabase, usfsSource.id, "usfs-cron-v1");
      await markRunSuccess(supabase, usfsRunId, {
        records_received: 1 + usfs.alerts.length,
        records_inserted: 1 + usfs.alerts.length,
        records_updated: 0,
        http_status: 200,
        metadata: {
          authoritative_status: usfs.authoritativeStatus,
          alert_count: usfs.alerts.length
        }
      });

      result.usfsStatus = usfs.authoritativeStatus;
      result.usfsAlertCount = usfs.alerts.length;
      return true;
    })
    .catch(async (error) => {
      const message = error instanceof Error ? error.message : "Unexpected USFS refresh failure.";
      result.usfsError = message;
      await updateSourceAttempt(supabase, usfsSource.id);
      await markRunFailure(supabase, usfsRunId, message);
      return false;
    });

  if (!rrmmcOutcome && !usfsOutcome) {
    throw new Error(
      `Both road status sources failed. RRMMC: ${result.rrmmcError ?? "unknown"} | USFS: ${result.usfsError ?? "unknown"}`
    );
  }

  return result;
}

async function recalculateRoadStatus(supabase, overview) {
  const portalSystemSource =
    overview.sources.find((source) => source.provider_key === "portal_system") ??
    overview.sources.find((source) => source.provider_key === "usfs_psicc") ??
    null;
  let portalRunId = null;

  if (portalSystemSource) {
    portalRunId = await createRun(
      supabase,
      portalSystemSource.id,
      "cron-portal-reconciliation",
      portalSystemSource.parser_version ?? "portal-cron-v1",
      { corridor_id: overview.corridor.id }
    );
  }

  const { data: currentStatus, error: currentStatusError } = await supabase
    .from("road_current_status")
    .select("*")
    .eq("corridor_id", overview.corridor.id)
    .maybeSingle();

  if (currentStatusError || !currentStatus) {
    if (portalRunId) {
      await markRunFailure(
        supabase,
        portalRunId,
        currentStatusError?.message ?? "Current road status view could not be loaded."
      );
    }
    throw new Error("Current road status view could not be loaded.");
  }

  const { data: recentEvents, error: recentEventsError } = await supabase
    .from("road_status_events")
    .select("id, new_value")
    .eq("corridor_id", overview.corridor.id)
    .order("detected_at", { ascending: false })
    .limit(1);

  if (recentEventsError) {
    if (portalRunId) {
      await markRunFailure(supabase, portalRunId, recentEventsError.message);
    }
    throw recentEventsError;
  }

  const previousStatus = recentEvents?.[0]?.new_value ?? null;
  const nextStatus = currentStatus.consolidated_status ?? "unknown";
  const sourceId =
    overview.sources.find((source) => source.provider_key === "portal_system")?.id ??
    overview.sources.find((source) => source.provider_key === "usfs_psicc")?.id ??
    null;

  const eventType = previousStatus !== nextStatus ? "status_changed" : "status_recalculated";
  const description =
    previousStatus !== nextStatus
      ? `Road status changed from ${previousStatus ?? "unknown"} to ${nextStatus}. ${currentStatus.consolidated_status_reason ?? ""}`.trim()
      : `Road status recalculated with no change. ${currentStatus.consolidated_status_reason ?? ""}`.trim();

  const { error } = await supabase.from("road_status_events").insert({
    corridor_id: overview.corridor.id,
    event_type: eventType,
    old_value: previousStatus,
    new_value: nextStatus,
    detected_at: toIsoNow(),
    source_id: sourceId,
    description
  });

  if (error) {
    if (portalRunId) {
      await markRunFailure(supabase, portalRunId, error.message);
    }
    throw error;
  }

  if (portalSystemSource) {
    await updateSourceSuccess(
      supabase,
      portalSystemSource.id,
      portalSystemSource.parser_version ?? "portal-cron-v1"
    );
  }

  if (portalRunId) {
    await markRunSuccess(supabase, portalRunId, {
      records_received: 1,
      records_inserted: 1,
      records_updated: 0,
      http_status: 200,
      metadata: {
        corridor_id: overview.corridor.id,
        previous_status: previousStatus,
        next_status: nextStatus,
        event_type: eventType
      }
    });
  }

  return {
    previousStatus,
    nextStatus,
    eventType
  };
}

async function generateRoadSnapshot(supabase, overview) {
  const { data: currentStatus, error: currentStatusError } = await supabase
    .from("road_current_status")
    .select("*")
    .eq("corridor_id", overview.corridor.id)
    .maybeSingle();

  if (currentStatusError || !currentStatus) {
    throw new Error("Current road status view could not be loaded for snapshot generation.");
  }

  const { data: previousSnapshots, error: previousSnapshotsError } = await supabase
    .from("road_daily_snapshots")
    .select("id, status_confidence")
    .eq("corridor_id", overview.corridor.id)
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (previousSnapshotsError) {
    throw previousSnapshotsError;
  }

  const { data: observations, error: observationsError } = await supabase
    .from("weather_observations")
    .select("temperature_f, wind_speed_mph, wind_gust_mph, precipitation_24h_in, precipitation_1h_in")
    .in("location_id", overview.weatherLocations.map((location) => location.id))
    .order("observed_at", { ascending: false });

  if (observationsError) {
    throw observationsError;
  }

  const { data: forecasts, error: forecastsError } = await supabase
    .from("weather_forecasts")
    .select("snowfall_inches")
    .in("location_id", overview.weatherLocations.map((location) => location.id))
    .gte("period_end", toIsoNow());

  if (forecastsError) {
    throw forecastsError;
  }

  const previousSnapshot = previousSnapshots?.[0] ?? null;
  const snapshotDate = toIsoNow().slice(0, 10);

  const temperatureValues = observations
    .map((item) => item.temperature_f)
    .filter((value) => value != null)
    .map(Number);
  const maxWindGust = observations
    .map((item) => item.wind_gust_mph ?? item.wind_speed_mph)
    .filter((value) => value != null)
    .map(Number);
  const precipitationValues = observations
    .map((item) => item.precipitation_24h_in ?? item.precipitation_1h_in)
    .filter((value) => value != null)
    .map(Number);
  const snowfallValues = forecasts
    .map((item) => item.snowfall_inches)
    .filter((value) => value != null)
    .map(Number);

  const roadConditionScore =
    currentStatus.consolidated_status === "closed" || currentStatus.consolidated_status === "seasonal_closure"
      ? 20
      : currentStatus.overall_access_risk === "severe"
        ? 30
        : currentStatus.overall_access_risk === "high"
          ? 50
          : currentStatus.overall_access_risk === "moderate"
            ? 72
            : 88;

  const weatherRiskScore =
    currentStatus.overall_access_risk === "severe"
      ? 92
      : currentStatus.overall_access_risk === "high"
        ? 72
        : currentStatus.overall_access_risk === "moderate"
          ? 48
          : currentStatus.overall_access_risk === "low"
            ? 18
            : 0;

  const { error } = await supabase.from("road_daily_snapshots").upsert(
    {
      corridor_id: overview.corridor.id,
      snapshot_date: snapshotDate,
      consolidated_status: currentStatus.consolidated_status ?? "unknown",
      gate_status: currentStatus.gate_status ?? "unknown",
      status_confidence: previousSnapshot?.status_confidence ?? 0.8,
      status_source: currentStatus.consolidated_status_source ?? "Portal deterministic reconciliation",
      min_temperature_f: temperatureValues.length > 0 ? Math.min(...temperatureValues) : null,
      max_temperature_f: temperatureValues.length > 0 ? Math.max(...temperatureValues) : null,
      precipitation_24h_in: precipitationValues.length > 0 ? Math.max(...precipitationValues) : null,
      snowfall_24h_in: snowfallValues.length > 0 ? Math.max(...snowfallValues) : null,
      max_wind_gust_mph: maxWindGust.length > 0 ? Math.max(...maxWindGust) : null,
      active_weather_alerts: currentStatus.active_weather_alert_count ?? 0,
      active_usfs_alerts: currentStatus.active_usfs_alert_count ?? 0,
      road_condition_score: roadConditionScore,
      weather_risk_score: weatherRiskScore,
      overall_access_risk: currentStatus.overall_access_risk ?? "unknown",
      summary:
        currentStatus.consolidated_status_reason ??
        "Generated from current road intelligence status, weather, and alert evidence.",
      generated_at: toIsoNow(),
      source_snapshot: {
        consolidated_status: currentStatus.consolidated_status,
        consolidated_status_source: currentStatus.consolidated_status_source,
        official_status: currentStatus.official_status,
        partner_status: currentStatus.partner_status,
        weather_description: currentStatus.weather_description,
        active_weather_alert_count: currentStatus.active_weather_alert_count,
        active_usfs_alert_count: currentStatus.active_usfs_alert_count
      }
    },
    {
      onConflict: "corridor_id,snapshot_date",
      ignoreDuplicates: false
    }
  );

  if (error) throw error;

  return {
    snapshotDate,
    consolidatedStatus: currentStatus.consolidated_status ?? "unknown",
    overallAccessRisk: currentStatus.overall_access_risk ?? "unknown"
  };
}

async function main() {
  loadLocalEnv();

  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = normalizeString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeString(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const overview = await getProjectAndOverview(supabase, args.projectSlug);
  const summary = {
    startedAt: toIsoNow(),
    projectSlug: args.projectSlug,
    corridor: overview.corridor.name,
    mode: args.mode,
    steps: {}
  };

  if (["weather", "all"].includes(args.mode)) {
    summary.steps.weather = await refreshRoadWeather(supabase, overview);
  }

  if (["status", "all"].includes(args.mode)) {
    summary.steps.status = await refreshRoadStatusSources(supabase, overview);
  }

  if (["reconcile", "all"].includes(args.mode)) {
    summary.steps.reconcile = await recalculateRoadStatus(supabase, overview);
  }

  if (["snapshot", "all"].includes(args.mode)) {
    summary.steps.snapshot = await generateRoadSnapshot(supabase, overview);
  }

  summary.finishedAt = toIsoNow();

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Road intelligence refresh completed for ${summary.projectSlug} (${summary.mode})`);
    console.log(JSON.stringify(summary.steps, null, 2));
  }
}

main().catch((error) => {
  console.error("Road intelligence refresh failed", error);
  process.exit(1);
});
