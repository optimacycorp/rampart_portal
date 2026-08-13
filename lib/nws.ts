import "server-only";

type NwsPointResponse = {
  properties?: {
    forecast?: string;
    forecastHourly?: string;
    observationStations?: string;
  };
};

type NwsStationsCollection = {
  features?: Array<{
    properties?: {
      stationIdentifier?: string;
    };
  }>;
};

type NwsObservationResponse = {
  properties?: {
    timestamp?: string;
    temperature?: { value?: number | null; unitCode?: string | null };
    dewpoint?: { value?: number | null; unitCode?: string | null };
    relativeHumidity?: { value?: number | null };
    windSpeed?: { value?: number | null };
    windGust?: { value?: number | null };
    windDirection?: { value?: number | null };
    barometricPressure?: { value?: number | null };
    visibility?: { value?: number | null };
    textDescription?: string | null;
    precipitationLastHour?: { value?: number | null };
  };
};

type NwsForecastResponse = {
  properties?: {
    generatedAt?: string;
    periods?: Array<{
      startTime?: string;
      endTime?: string;
      temperature?: number | null;
      probabilityOfPrecipitation?: { value?: number | null };
      windSpeed?: string | null;
      shortForecast?: string | null;
      detailedForecast?: string | null;
    }>;
  };
};

type NwsAlertsResponse = {
  features?: Array<{
    id?: string;
    properties?: {
      event?: string | null;
      severity?: string | null;
      headline?: string | null;
      description?: string | null;
      onset?: string | null;
      expires?: string | null;
      effective?: string | null;
      ends?: string | null;
      instruction?: string | null;
      response?: string | null;
    };
  }>;
};

export type ParsedNwsObservation = {
  observedAt: string;
  temperatureF: number | null;
  dewpointF: number | null;
  relativeHumidityPercent: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  windDirectionDeg: number | null;
  precipitation1hIn: number | null;
  pressureMb: number | null;
  visibilityMiles: number | null;
  weatherDescription: string | null;
  rawPayload: Record<string, unknown>;
};

export type ParsedNwsForecastPeriod = {
  periodStart: string | null;
  periodEnd: string | null;
  forecastGeneratedAt: string | null;
  temperatureF: number | null;
  precipitationProbability: number | null;
  snowfallInches: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  shortForecast: string | null;
  detailedForecast: string | null;
  rawPayload: Record<string, unknown>;
};

export type ParsedNwsAlert = {
  externalAlertId: string;
  alertType: string;
  severity: string | null;
  title: string;
  description: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
};

export type NwsLocationFetchResult = {
  stationIdentifier: string | null;
  observation: ParsedNwsObservation | null;
  forecasts: ParsedNwsForecastPeriod[];
  alerts: ParsedNwsAlert[];
  rawPointPayload: Record<string, unknown>;
};

const DEFAULT_NWS_USER_AGENT = "(rampart-range.org, admin@rampart-range.org)";

function readJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function celsiusToFahrenheit(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number(((value * 9) / 5 + 32).toFixed(1));
}

function pascalsToMillibars(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number((value / 100).toFixed(1));
}

function metersToMiles(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number((value / 1609.344).toFixed(2));
}

function millimetersToInches(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number((value / 25.4).toFixed(2));
}

function kilometersPerHourToMph(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number((value * 0.621371).toFixed(1));
}

function parseWindSpeedMph(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+)(?:\s*to\s*(\d+))?/i);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;

  if (!Number.isFinite(first)) {
    return null;
  }

  return second && Number.isFinite(second) ? Math.max(first, second) : first;
}

function inferSnowfallInches(period: { shortForecast?: string | null; detailedForecast?: string | null }) {
  const combined = `${period.shortForecast ?? ""} ${period.detailedForecast ?? ""}`.toLowerCase();
  const match = combined.match(/(\d+(?:\.\d+)?)\s*(?:to\s*(\d+(?:\.\d+)?))?\s*inch(?:es)?\s+of\s+snow/);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;

  if (!Number.isFinite(first)) {
    return null;
  }

  return second && Number.isFinite(second) ? Math.max(first, second) : first;
}

async function fetchNwsJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": process.env.NWS_USER_AGENT || DEFAULT_NWS_USER_AGENT
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`NWS request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

export async function fetchNwsForPoint(latitude: number, longitude: number): Promise<NwsLocationFetchResult> {
  const pointUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
  const pointJson = (await fetchNwsJson(pointUrl)) as NwsPointResponse;
  const pointProperties = pointJson.properties;

  if (!pointProperties?.forecast || !pointProperties.observationStations) {
    throw new Error(`NWS points response for ${latitude},${longitude} did not include forecast and station links.`);
  }

  const [stationsJson, forecastJson, alertsJson] = await Promise.all([
    fetchNwsJson(pointProperties.observationStations) as Promise<NwsStationsCollection>,
    fetchNwsJson(pointProperties.forecastHourly ?? pointProperties.forecast) as Promise<NwsForecastResponse>,
    fetchNwsJson(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`) as Promise<NwsAlertsResponse>
  ]);

  const stationIdentifier = stationsJson.features?.[0]?.properties?.stationIdentifier ?? null;
  let observation: ParsedNwsObservation | null = null;

  if (stationIdentifier) {
    const observationJson = (await fetchNwsJson(
      `https://api.weather.gov/stations/${stationIdentifier}/observations/latest`
    )) as NwsObservationResponse;
    const props = observationJson.properties ?? {};

    observation = {
      observedAt: props.timestamp ?? new Date().toISOString(),
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
      rawPayload: readJsonObject(observationJson as unknown)
    };
  }

  const forecasts: ParsedNwsForecastPeriod[] =
    forecastJson.properties?.periods?.slice(0, 12).map((period) => ({
      periodStart: period.startTime ?? null,
      periodEnd: period.endTime ?? null,
      forecastGeneratedAt: forecastJson.properties?.generatedAt ?? null,
      temperatureF: period.temperature ?? null,
      precipitationProbability: period.probabilityOfPrecipitation?.value ?? null,
      snowfallInches: inferSnowfallInches(period),
      windSpeedMph: parseWindSpeedMph(period.windSpeed),
      windGustMph: null,
      shortForecast: period.shortForecast ?? null,
      detailedForecast: period.detailedForecast ?? null,
      rawPayload: readJsonObject(period as unknown)
    })) ?? [];

  const alerts: ParsedNwsAlert[] =
    alertsJson.features?.map((feature) => {
      const properties = feature.properties ?? {};
      const alertId = feature.id ?? properties.headline ?? properties.event ?? crypto.randomUUID();
      return {
        externalAlertId: alertId,
        alertType: (properties.event ?? "weather_alert")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "weather_alert",
        severity: properties.severity?.toLowerCase() ?? null,
        title: properties.headline ?? properties.event ?? "NWS weather alert",
        description: [properties.description, properties.instruction].filter(Boolean).join("\n\n") || null,
        effectiveAt: properties.effective ?? properties.onset ?? null,
        expiresAt: properties.expires ?? properties.ends ?? null,
        sourceUrl: feature.id ?? `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
        rawPayload: readJsonObject(feature as unknown)
      };
    }) ?? [];

  return {
    stationIdentifier,
    observation,
    forecasts,
    alerts,
    rawPointPayload: readJsonObject(pointJson as unknown)
  };
}
