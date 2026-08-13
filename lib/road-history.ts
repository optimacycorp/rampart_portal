import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { RoadDailySnapshot, RoadIngestionRun, RoadSourceHealth } from "@/lib/types";

export async function getRecentRoadDailySnapshots(corridorId: string, limit = 10): Promise<RoadDailySnapshot[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("road_daily_snapshots")
    .select(
      "id, corridor_id, snapshot_date, consolidated_status, gate_status, status_confidence, status_source, min_temperature_f, max_temperature_f, precipitation_24h_in, snowfall_24h_in, max_wind_gust_mph, active_weather_alerts, active_usfs_alerts, road_condition_score, weather_risk_score, overall_access_risk, summary, generated_at, source_snapshot"
    )
    .eq("corridor_id", corridorId)
    .order("snapshot_date", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as RoadDailySnapshot[];
}

function resolveFreshness(latestRun: RoadIngestionRun | null, lastSuccessAt?: string | null): RoadSourceHealth["freshness"] {
  if (!latestRun && !lastSuccessAt) {
    return "never";
  }

  if (latestRun?.status === "failed") {
    return "failed";
  }

  const reference = latestRun?.completed_at ?? lastSuccessAt;

  if (!reference) {
    return "never";
  }

  const ageHours = (Date.now() - new Date(reference).getTime()) / 36e5;

  if (ageHours <= 2) return "current";
  if (ageHours <= 12) return "aging";
  return "stale";
}

export async function getRoadSourceHealth(corridorId: string): Promise<RoadSourceHealth[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("road_data_sources")
    .select(
      "id, provider_key, provider_name, source_type, authority_level, base_url, enabled, ingestion_method, default_refresh_minutes, parser_version, terms_notes, last_success_at, last_attempt_at, created_at, updated_at"
    )
    .order("provider_name", { ascending: true });

  if (sourcesError || !sources) {
    return [];
  }

  const sourceIds = sources.map((source) => source.id);
  const { data: runs, error: runsError } = await supabase
    .from("road_ingestion_runs")
    .select(
      "id, source_id, job_name, started_at, completed_at, status, records_received, records_inserted, records_updated, http_status, error_message, parser_version, metadata"
    )
    .in("source_id", sourceIds)
    .order("started_at", { ascending: false });

  if (runsError || !runs) {
    return [];
  }

  return sources.map((source) => {
    const sourceRuns = (runs as RoadIngestionRun[]).filter((run) => run.source_id === source.id);
    const latestRun = sourceRuns[0] ?? null;
    const failureCount7d = sourceRuns.filter((run) => {
      if (run.status !== "failed" || !run.started_at) return false;
      return new Date(run.started_at).getTime() >= Date.now() - 7 * 24 * 36e5;
    }).length;

    return {
      source,
      latestRun,
      freshness: resolveFreshness(latestRun, source.last_success_at),
      failureCount7d
    };
  });
}
