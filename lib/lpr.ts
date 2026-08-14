import "server-only";

import { seededLprCameras, seededLprDailyStats, seededLprEvents, seededLprKnownVehicles, seededProject } from "@/lib/mock-data";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LprCamera, LprDailyStat, LprEventRecord, LprKnownVehicle } from "@/lib/types";

type LprEventQueryOptions = {
  limit?: number;
  search?: string;
  reviewStatus?: string;
  preservedOnly?: boolean;
};

export async function getLprCamerasByProjectSlug(projectSlug: string): Promise<LprCamera[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededLprCameras : [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("lpr_cameras")
    .select(
      "id, project_id, name, manufacturer, model, latitude, longitude, elevation_ft, install_location, direction_facing, connectivity, power_source, solar_panel_watts, battery_wh, camera_ip, integration_type, active, last_seen_at, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as LprCamera[];
}

export async function getLprKnownVehiclesByProjectSlug(projectSlug: string): Promise<LprKnownVehicle[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededLprKnownVehicles : [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("lpr_known_vehicles")
    .select("id, project_id, plate_text, label, vehicle_kind, owner_name, access_level, notes, active, created_by_user_id, created_by_email, created_at, updated_at")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as LprKnownVehicle[];
}

export async function getLprEventsByProjectSlug(projectSlug: string, limitOrOptions: number | LprEventQueryOptions = 25): Promise<LprEventRecord[]> {
  const supabase = getSupabaseAdminClient();
  const options =
    typeof limitOrOptions === "number"
      ? { limit: limitOrOptions }
      : limitOrOptions;
  const limit = options.limit ?? 25;

  if (!supabase) {
    let fallback = projectSlug === seededProject.slug ? seededLprEvents : [];

    if (options.search?.trim()) {
      const needle = options.search.trim().toLowerCase();
      fallback = fallback.filter((event) =>
        [
          event.plate_text,
          event.camera_name,
          event.known_vehicle?.label,
          event.review?.notes,
          event.vehicle_make,
          event.vehicle_model,
          event.vehicle_color
        ]
          .filter(Boolean)
          .some((value) => `${value}`.toLowerCase().includes(needle))
      );
    }

    if (options.reviewStatus && options.reviewStatus !== "all") {
      fallback = fallback.filter((event) => (event.review?.review_status ?? "pending") === options.reviewStatus);
    }

    if (options.preservedOnly) {
      fallback = fallback.filter((event) => Boolean(event.preserved && !event.preserved.released_at));
    }

    return fallback.slice(0, limit);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data: cameras, error: camerasError } = await supabase.from("lpr_cameras").select("id").eq("project_id", project.id);

  if (camerasError || !cameras?.length) {
    return [];
  }

  const cameraIds = cameras.map((camera) => camera.id);
  let query = supabase
    .from("lpr_events")
    .select(
      "id, camera_id, observed_at, plate_text, plate_confidence, plate_state, vehicle_type, vehicle_make, vehicle_model, vehicle_color, direction, image_path, plate_crop_path, event_latitude, event_longitude, raw_payload, created_at"
    )
    .in("camera_id", cameraIds)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (options.search?.trim()) {
    const escaped = options.search.trim().replace(/[%_]/g, "");
    query = query.or(`plate_text.ilike.%${escaped}%,vehicle_make.ilike.%${escaped}%,vehicle_model.ilike.%${escaped}%,vehicle_color.ilike.%${escaped}%`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const rows = data as LprEventRecord[];
  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera.id]));
  const plateTexts = Array.from(new Set(rows.map((row) => row.plate_text).filter((value): value is string => Boolean(value))));
  const eventIds = rows.map((row) => row.id);

  const [knownVehicleData, reviewData, cameraData, preservedData] = await Promise.all([
    plateTexts.length
      ? supabase
          .from("lpr_known_vehicles")
          .select("id, project_id, plate_text, label, vehicle_kind, owner_name, access_level, notes, active, created_by_user_id, created_by_email, created_at, updated_at")
          .eq("project_id", project.id)
          .in("plate_text", plateTexts)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? supabase
          .from("lpr_event_reviews")
          .select("id, event_id, review_status, matched_known_vehicle_id, notes, reviewed_by_user_id, reviewed_by_email, created_at, updated_at")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? supabase
          .from("lpr_preserved_events")
          .select("id, event_id, case_reference, preservation_reason, preserve_until, notes, released_at, preserved_by_user_id, preserved_by_email, created_at, updated_at")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("lpr_cameras").select("id, name").in("id", Array.from(cameraMap.keys()))
  ]);

  const knownVehicleMap = new Map(
    (((knownVehicleData.data as LprKnownVehicle[] | null) ?? []).map((vehicle) => [vehicle.plate_text, vehicle]))
  );
  const reviewMap = new Map(
    (((reviewData.data as LprEventRecord["review"][] | null) ?? []).filter(Boolean) as NonNullable<LprEventRecord["review"]>[]).map((review) => [review.event_id, review])
  );
  const preservedMap = new Map(
    (((preservedData.data as LprEventRecord["preserved"][] | null) ?? []).filter(Boolean) as NonNullable<LprEventRecord["preserved"]>[]).map((record) => [record.event_id, record])
  );
  const cameraNameMap = new Map(
    (((cameraData.data as Array<{ id: string; name: string }> | null) ?? []).map((camera) => [camera.id, camera.name]))
  );

  let enrichedRows = rows.map((row) => ({
    ...row,
    camera_name: cameraNameMap.get(row.camera_id) ?? null,
    known_vehicle: row.plate_text ? knownVehicleMap.get(row.plate_text) ?? null : null,
    review: reviewMap.get(row.id) ?? null,
    preserved: preservedMap.get(row.id) ?? null
  }));

  if (options.reviewStatus && options.reviewStatus !== "all") {
    enrichedRows = enrichedRows.filter((row) => (row.review?.review_status ?? "pending") === options.reviewStatus);
  }

  if (options.preservedOnly) {
    enrichedRows = enrichedRows.filter((row) => Boolean(row.preserved && !row.preserved.released_at));
  }

  if (options.search?.trim()) {
    const needle = options.search.trim().toLowerCase();
    enrichedRows = enrichedRows.filter((row) =>
      [
        row.plate_text,
        row.camera_name,
        row.known_vehicle?.label,
        row.review?.notes,
        row.preserved?.case_reference,
        row.preserved?.preservation_reason,
        row.vehicle_make,
        row.vehicle_model,
        row.vehicle_color
      ]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(needle))
    );
  }

  return enrichedRows;
}

export async function getLprDailyStatsByProjectSlug(projectSlug: string, limit = 14): Promise<LprDailyStat[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededLprDailyStats.slice(0, limit) : [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data: cameras, error: camerasError } = await supabase.from("lpr_cameras").select("id").eq("project_id", project.id);

  if (camerasError || !cameras?.length) {
    return [];
  }

  const cameraIds = cameras.map((camera) => camera.id);
  const { data, error } = await supabase
    .from("lpr_daily_stats")
    .select(
      "id, camera_id, stat_date, total_vehicles, unique_plates, inbound_count, outbound_count, first_vehicle_at, last_vehicle_at"
    )
    .in("camera_id", cameraIds)
    .order("stat_date", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as LprDailyStat[];
}
