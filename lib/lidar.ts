import { getSupabaseAdminClient } from "@/lib/supabase";
import { LidarScan } from "@/lib/types";
import { getProjectBySlug } from "./documents";
import { getFieldPointsByProjectSlug } from "./field-points";

export async function getLidarScansByProjectSlug(projectSlug: string): Promise<LidarScan[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("lidar_scans")
    .select(
      "id, project_id, created_by_user_id, created_by_email, title, status, processing_stage, tile_format, scan_date, equipment, coordinate_system, center_easting, center_northing, center_elevation, center_latitude, center_longitude, bbox_west, bbox_south, bbox_east, bbox_north, raw_file_path, tile_path, preview_image_path, point_count, area_acres, min_elevation, max_elevation, notes, created_at, updated_at"
    )
    .eq("project_id", project.id)
    .order("scan_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as LidarScan[];
}

export async function getLidarScanById(scanId: string): Promise<LidarScan | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("lidar_scans")
    .select(
      "id, project_id, created_by_user_id, created_by_email, title, status, processing_stage, tile_format, scan_date, equipment, coordinate_system, center_easting, center_northing, center_elevation, center_latitude, center_longitude, bbox_west, bbox_south, bbox_east, bbox_north, raw_file_path, tile_path, preview_image_path, point_count, area_acres, min_elevation, max_elevation, notes, created_at, updated_at"
    )
    .eq("id", scanId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LidarScan;
}

export function formatStorageOrUrlPath(value?: string | null) {
  const normalized = `${value ?? ""}`.trim();
  return normalized || null;
}

export function isExternalUrl(value?: string | null) {
  return /^https?:\/\//i.test(`${value ?? ""}`.trim());
}

export async function getNearbyFieldPointsForLidarScan(projectSlug: string, scan: LidarScan, limit = 8) {
  if (
    scan.center_easting == null ||
    scan.center_northing == null ||
    !scan.coordinate_system
  ) {
    return [];
  }

  const fieldPoints = await getFieldPointsByProjectSlug(projectSlug);

  return fieldPoints
    .filter(
      (point) =>
        point.easting != null &&
        point.northing != null &&
        point.coordinate_system &&
        point.coordinate_system.trim().toLowerCase() === scan.coordinate_system?.trim().toLowerCase()
    )
    .map((point) => {
      const dx = (point.easting as number) - (scan.center_easting as number);
      const dy = (point.northing as number) - (scan.center_northing as number);
      const distance = Math.sqrt(dx * dx + dy * dy);

      return {
        ...point,
        distanceFromCenter: distance
      };
    })
    .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
    .slice(0, limit);
}
