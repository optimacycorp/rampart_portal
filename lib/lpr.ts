import "server-only";

import { seededLprCameras, seededLprDailyStats, seededLprEvents, seededLprKnownVehicles, seededProject } from "@/lib/mock-data";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LprCamera, LprDailyStat, LprEventRecord, LprKnownVehicle } from "@/lib/types";

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

export async function getLprEventsByProjectSlug(projectSlug: string, limit = 25): Promise<LprEventRecord[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededLprEvents.slice(0, limit) : [];
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
    .from("lpr_events")
    .select(
      "id, camera_id, observed_at, plate_text, plate_confidence, plate_state, vehicle_type, vehicle_make, vehicle_model, vehicle_color, direction, image_path, plate_crop_path, event_latitude, event_longitude, raw_payload, created_at"
    )
    .in("camera_id", cameraIds)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const rows = data as LprEventRecord[];
  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera.id]));
  const plateTexts = Array.from(new Set(rows.map((row) => row.plate_text).filter((value): value is string => Boolean(value))));
  const eventIds = rows.map((row) => row.id);

  const [knownVehicleData, reviewData, cameraData] = await Promise.all([
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
    supabase.from("lpr_cameras").select("id, name").in("id", Array.from(cameraMap.keys()))
  ]);

  const knownVehicleMap = new Map(
    (((knownVehicleData.data as LprKnownVehicle[] | null) ?? []).map((vehicle) => [vehicle.plate_text, vehicle]))
  );
  const reviewMap = new Map(
    (((reviewData.data as LprEventRecord["review"][] | null) ?? []).filter(Boolean) as NonNullable<LprEventRecord["review"]>[]).map((review) => [review.event_id, review])
  );
  const cameraNameMap = new Map(
    (((cameraData.data as Array<{ id: string; name: string }> | null) ?? []).map((camera) => [camera.id, camera.name]))
  );

  return rows.map((row) => ({
    ...row,
    camera_name: cameraNameMap.get(row.camera_id) ?? null,
    known_vehicle: row.plate_text ? knownVehicleMap.get(row.plate_text) ?? null : null,
    review: reviewMap.get(row.id) ?? null
  }));
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
