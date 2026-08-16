import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase";

export type TemperatureRange = "day" | "week" | "month";

export type TemperaturePoint = {
  key: string;
  label: string;
  averageTempF: number;
  observationCount: number;
};

function getDenverFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    ...options
  });
}

function getDenverParts(date: Date) {
  const parts = getDenverFormatter({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getBucketKey(date: Date, range: TemperatureRange) {
  const parts = getDenverParts(date);
  const year = parts.year ?? "0000";
  const month = parts.month ?? "00";
  const day = parts.day ?? "00";

  if (range === "day") {
    const hour = parts.hour ?? "00";
    return `${year}-${month}-${day}T${hour}:00`;
  }

  return `${year}-${month}-${day}`;
}

function getBucketLabel(date: Date, range: TemperatureRange) {
  if (range === "day") {
    return getDenverFormatter({ hour: "numeric" }).format(date);
  }

  return getDenverFormatter({ month: "short", day: "numeric" }).format(date);
}

function getRangeStart(range: TemperatureRange) {
  const now = Date.now();

  switch (range) {
    case "day":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "month":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "week":
    default:
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export async function getRoadTemperatureSeries(corridorId: string, range: TemperatureRange): Promise<TemperaturePoint[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data: locations, error: locationsError } = await supabase
    .from("road_weather_locations")
    .select("id")
    .eq("corridor_id", corridorId)
    .eq("active", true);

  if (locationsError || !locations?.length) {
    return [];
  }

  const locationIds = locations.map((location) => location.id);
  const { data: observations, error: observationsError } = await supabase
    .from("weather_observations")
    .select("observed_at, temperature_f")
    .in("location_id", locationIds)
    .not("temperature_f", "is", null)
    .gte("observed_at", getRangeStart(range))
    .order("observed_at", { ascending: true });

  if (observationsError || !observations?.length) {
    return [];
  }

  const buckets = new Map<string, { timestamp: number; total: number; count: number }>();

  for (const observation of observations) {
    if (!observation.observed_at || observation.temperature_f == null) {
      continue;
    }

    const date = new Date(observation.observed_at);
    const key = getBucketKey(date, range);
    const existing = buckets.get(key);

    if (existing) {
      existing.total += Number(observation.temperature_f);
      existing.count += 1;
    } else {
      buckets.set(key, {
        timestamp: date.getTime(),
        total: Number(observation.temperature_f),
        count: 1
      });
    }
  }

  return Array.from(buckets.entries())
    .map(([key, value]) => ({
      key,
      label: getBucketLabel(new Date(value.timestamp), range),
      averageTempF: Number((value.total / value.count).toFixed(1)),
      observationCount: value.count,
      timestamp: value.timestamp
    }))
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ timestamp: _timestamp, ...point }) => point);
}
