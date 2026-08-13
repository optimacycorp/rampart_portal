import "server-only";

import {
  seededRoadAlerts,
  seededRoadCorridor,
  seededRoadCurrentStatus,
  seededRoadDailySnapshots,
  seededRoadDataSources,
  seededRoadWeatherLocations
} from "@/lib/mock-data";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  RoadClosureAlert,
  RoadCorridor,
  RoadCurrentStatus,
  RoadDailySnapshot,
  RoadDataSource,
  RoadWeatherLocation
} from "@/lib/types";

type RoadOverviewSnapshot = {
  corridor: RoadCorridor;
  currentStatus: RoadCurrentStatus;
  sources: RoadDataSource[];
  activeAlerts: RoadClosureAlert[];
  weatherLocations: RoadWeatherLocation[];
  latestSnapshot: RoadDailySnapshot | null;
};

function fallbackOverview(projectId: string): RoadOverviewSnapshot | null {
  if (projectId !== seededRoadCorridor.project_id && projectId !== "3245-rampart-range-road") {
    return null;
  }

  return {
    corridor: seededRoadCorridor,
    currentStatus: seededRoadCurrentStatus,
    sources: seededRoadDataSources,
    activeAlerts: seededRoadAlerts.filter((alert) => alert.active),
    weatherLocations: seededRoadWeatherLocations,
    latestSnapshot: seededRoadDailySnapshots[0] ?? null
  };
}

export async function getRoadOverviewByProjectSlug(projectSlug: string): Promise<RoadOverviewSnapshot | null> {
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return null;
  }

  const fallback = fallbackOverview(project.id) ?? fallbackOverview(projectSlug);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return fallback;
  }

  const { data: corridor, error: corridorError } = await supabase
    .from("road_corridors")
    .select(
      "id, project_id, name, road_number, alternate_names, managing_agency, description, start_lat, start_lon, end_lat, end_lon, min_elevation_ft, max_elevation_ft, length_miles, active, created_at, updated_at"
    )
    .eq("project_id", project.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (corridorError || !corridor) {
    return fallback;
  }

  const [currentStatusResult, sourcesResult, alertsResult, weatherLocationsResult, snapshotsResult] = await Promise.all([
    supabase.from("road_current_status").select("*").eq("corridor_id", corridor.id).maybeSingle(),
    supabase
      .from("road_data_sources")
      .select(
        "id, provider_key, provider_name, source_type, authority_level, base_url, enabled, ingestion_method, default_refresh_minutes, parser_version, terms_notes, last_success_at, last_attempt_at, created_at, updated_at"
      )
      .order("provider_name", { ascending: true }),
    supabase
      .from("road_closures_alerts")
      .select(
        "id, corridor_id, segment_id, source_id, alert_type, severity, title, description, effective_at, expires_at, active, forest_order_number, source_url, source_document_id, raw_payload, created_at, updated_at"
      )
      .eq("corridor_id", corridor.id)
      .eq("active", true)
      .order("effective_at", { ascending: false }),
    supabase
      .from("road_weather_locations")
      .select("id, corridor_id, name, latitude, longitude, elevation_ft, station_identifier, source, active, created_at")
      .eq("corridor_id", corridor.id)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("road_daily_snapshots")
      .select(
        "id, corridor_id, snapshot_date, consolidated_status, gate_status, status_confidence, status_source, min_temperature_f, max_temperature_f, precipitation_24h_in, snowfall_24h_in, max_wind_gust_mph, active_weather_alerts, active_usfs_alerts, road_condition_score, weather_risk_score, overall_access_risk, summary, generated_at, source_snapshot"
      )
      .eq("corridor_id", corridor.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
  ]);

  return {
    corridor: corridor as RoadCorridor,
    currentStatus: (currentStatusResult.data as RoadCurrentStatus | null) ?? fallback?.currentStatus ?? seededRoadCurrentStatus,
    sources: (sourcesResult.data as RoadDataSource[] | null) ?? fallback?.sources ?? seededRoadDataSources,
    activeAlerts: (alertsResult.data as RoadClosureAlert[] | null) ?? fallback?.activeAlerts ?? [],
    weatherLocations:
      (weatherLocationsResult.data as RoadWeatherLocation[] | null) ?? fallback?.weatherLocations ?? seededRoadWeatherLocations,
    latestSnapshot:
      (snapshotsResult.data?.[0] as RoadDailySnapshot | undefined) ?? fallback?.latestSnapshot ?? seededRoadDailySnapshots[0] ?? null
  };
}
