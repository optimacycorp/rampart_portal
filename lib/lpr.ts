import "server-only";

import { seededLprCameras, seededLprDailyStats, seededLprEvents, seededProject } from "@/lib/mock-data";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LprCamera, LprDailyStat, LprEvent } from "@/lib/types";

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

export async function getLprEventsByProjectSlug(projectSlug: string, limit = 25): Promise<LprEvent[]> {
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

  return data as LprEvent[];
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
