import { AddressCandidate, AddressValidationResult } from "@/lib/address/types";

const GEOAPIFY_BASE = "https://api.geoapify.com/v1";

function normalizeString(value: unknown) {
  return `${value ?? ""}`.trim();
}

function normalizeLower(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function readNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readConfig() {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  const countryCode = normalizeLower(process.env.GEOAPIFY_FILTER_COUNTRYCODE || "us");
  const county = normalizeLower(process.env.GEOAPIFY_LIMIT_COUNTY || "el paso county");
  const state = normalizeLower(process.env.GEOAPIFY_LIMIT_STATE || "colorado");
  const stateCode = normalizeLower(process.env.GEOAPIFY_LIMIT_STATE_CODE || "co");
  const rect = normalizeString(process.env.GEOAPIFY_FILTER_RECT);
  const proximity = normalizeString(process.env.GEOAPIFY_BIAS_PROXIMITY);
  const sharedSecret = normalizeString(process.env.ADDRESS_API_SHARED_SECRET);

  return {
    apiKey,
    countryCode,
    county,
    state,
    stateCode,
    rect,
    proximity,
    sharedSecret
  };
}

function buildFilter(countryCode: string, rect: string) {
  const filters = [];

  if (countryCode) {
    filters.push(`countrycode:${countryCode}`);
  }

  if (rect) {
    filters.push(`rect:${rect}`);
  }

  return filters.join("|");
}

function matchesCountyRestriction(feature: Record<string, unknown>) {
  const { county, state, stateCode, countryCode } = readConfig();

  const featureCounty = normalizeLower(feature.county);
  const featureState = normalizeLower(feature.state);
  const featureStateCode = normalizeLower(feature.state_code);
  const featureCountryCode = normalizeLower(feature.country_code);

  const countryMatch = !countryCode || featureCountryCode === countryCode;
  const stateMatch = !state || featureState === state || featureStateCode === stateCode;
  const countyMatch =
    !county ||
    featureCounty === county ||
    featureCounty.includes(county) ||
    county.includes(featureCounty);

  return countryMatch && stateMatch && countyMatch;
}

function mapFeatureToCandidate(feature: Record<string, unknown>): AddressCandidate {
  return {
    provider: "geoapify",
    placeId: normalizeString(feature.place_id),
    formatted: normalizeString(feature.formatted),
    address1: normalizeString(feature.address_line1),
    address2: normalizeString(feature.address_line2),
    city: normalizeString(feature.city),
    county: normalizeString(feature.county),
    state: normalizeString(feature.state),
    stateCode: normalizeString(feature.state_code),
    postalCode: normalizeString(feature.postcode),
    country: normalizeString(feature.country),
    countryCode: normalizeString(feature.country_code),
    latitude: readNumber(feature.lat),
    longitude: readNumber(feature.lon),
    confidence: readNumber(feature.rank && typeof feature.rank === "object" ? (feature.rank as Record<string, unknown>).confidence : null),
    resultType: normalizeString(feature.result_type) || null,
    matchType: normalizeString(feature.rank && typeof feature.rank === "object" ? (feature.rank as Record<string, unknown>).match_type : null) || null,
    raw: feature
  };
}

function mapFeatureToValidationResult(input: string, feature: Record<string, unknown>): AddressValidationResult {
  const candidate = mapFeatureToCandidate(feature);

  return {
    input,
    provider: "geoapify",
    validated: true,
    confidence: candidate.confidence,
    deliverability: "unknown",
    formatted: candidate.formatted,
    address1: candidate.address1,
    address2: candidate.address2,
    city: candidate.city,
    county: candidate.county,
    state: candidate.state,
    stateCode: candidate.stateCode,
    postalCode: candidate.postalCode,
    country: candidate.country,
    countryCode: candidate.countryCode,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    sourceId: candidate.placeId,
    resultType: candidate.resultType,
    matchType: candidate.matchType,
    raw: candidate.raw
  };
}

async function geoapifyRequest(endpoint: string, params: URLSearchParams) {
  const { apiKey } = readConfig();

  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is not configured.");
  }

  params.set("apiKey", apiKey);
  params.set("format", "json");

  const response = await fetch(`${GEOAPIFY_BASE}${endpoint}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Geoapify request failed with status ${response.status}.`);
  }

  return (await response.json()) as { results?: Record<string, unknown>[] };
}

export function isAddressApiAuthorized(request: Request) {
  const { sharedSecret } = readConfig();

  if (!sharedSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const apiKeyHeader = request.headers.get("x-address-api-key") || "";

  return bearer === sharedSecret || apiKeyHeader === sharedSecret;
}

export async function searchAddresses(query: string, limit = 5) {
  const { countryCode, proximity, rect } = readConfig();
  const params = new URLSearchParams({
    text: query,
    limit: String(limit)
  });

  const filter = buildFilter(countryCode, rect);

  if (filter) {
    params.set("filter", filter);
  }

  if (proximity) {
    params.set("bias", `proximity:${proximity}`);
  }

  const payload = await geoapifyRequest("/geocode/autocomplete", params);
  const results = (payload.results ?? [])
    .filter(matchesCountyRestriction)
    .map(mapFeatureToCandidate);

  return results;
}

export async function validateAddress(input: string) {
  const { countryCode, proximity, rect } = readConfig();
  const params = new URLSearchParams({
    text: input,
    limit: "3"
  });

  const filter = buildFilter(countryCode, rect);

  if (filter) {
    params.set("filter", filter);
  }

  if (proximity) {
    params.set("bias", `proximity:${proximity}`);
  }

  const payload = await geoapifyRequest("/geocode/search", params);
  const bestMatch = (payload.results ?? []).find(matchesCountyRestriction);

  if (!bestMatch) {
    return null;
  }

  return mapFeatureToValidationResult(input, bestMatch);
}
