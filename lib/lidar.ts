import { getSupabaseAdminClient } from "@/lib/supabase";
import { LidarScan } from "@/lib/types";
import { getProjectBySlug } from "./documents";

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
      "id, project_id, title, scan_date, equipment, coordinate_system, center_easting, center_northing, center_elevation, raw_file_path, tile_path, preview_image_path, point_count, area_acres, min_elevation, max_elevation, notes, created_at"
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
      "id, project_id, title, scan_date, equipment, coordinate_system, center_easting, center_northing, center_elevation, raw_file_path, tile_path, preview_image_path, point_count, area_acres, min_elevation, max_elevation, notes, created_at"
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
