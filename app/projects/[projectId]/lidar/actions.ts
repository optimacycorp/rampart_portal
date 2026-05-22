"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getLidarScanById } from "@/lib/lidar";

function readString(formData: FormData, key: string) {
  const value = `${formData.get(key) ?? ""}`.trim();
  return value || null;
}

function readNumber(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createLidarScan(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/lidar?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);
  const { user } = await getCurrentUserContext();

  if (!project || !user) {
    redirect(`/projects/${projectSlug}/lidar?error=project-not-found`);
  }

  const title = readString(formData, "title");

  if (!title) {
    redirect(`/projects/${projectSlug}/lidar?error=missing-required-fields`);
  }

  const payload = {
    project_id: project.id,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null,
    title,
    status: readString(formData, "status") ?? "registered",
    processing_stage: readString(formData, "processing_stage") ?? "raw_uploaded",
    tile_format: readString(formData, "tile_format") ?? "potree",
    scan_date: readString(formData, "scan_date"),
    equipment: readString(formData, "equipment") ?? "3DMakerPro Eagle Max",
    coordinate_system: readString(formData, "coordinate_system"),
    center_easting: readNumber(formData, "center_easting"),
    center_northing: readNumber(formData, "center_northing"),
    center_elevation: readNumber(formData, "center_elevation"),
    center_latitude: readNumber(formData, "center_latitude"),
    center_longitude: readNumber(formData, "center_longitude"),
    bbox_west: readNumber(formData, "bbox_west"),
    bbox_south: readNumber(formData, "bbox_south"),
    bbox_east: readNumber(formData, "bbox_east"),
    bbox_north: readNumber(formData, "bbox_north"),
    raw_file_path: readString(formData, "raw_file_path"),
    tile_path: readString(formData, "tile_path"),
    preview_image_path: readString(formData, "preview_image_path"),
    point_count: readNumber(formData, "point_count"),
    area_acres: readNumber(formData, "area_acres"),
    min_elevation: readNumber(formData, "min_elevation"),
    max_elevation: readNumber(formData, "max_elevation"),
    notes: readString(formData, "notes")
  };

  const { data, error } = await supabase.from("lidar_scans").insert(payload).select("id").single();

  if (error || !data) {
    redirect(`/projects/${projectSlug}/lidar?error=lidar-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/lidar`);
  redirect(`/projects/${projectSlug}/lidar?status=created&scan=${data.id}`);
}

export async function updateLidarScan(projectSlug: string, scanId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/lidar/${scanId}?error=supabase-not-configured`);
  }

  const scan = await getLidarScanById(scanId);

  if (!scan) {
    redirect(`/projects/${projectSlug}/lidar/${scanId}?error=scan-not-found`);
  }

  try {
    await requireUploadManagementRole(scan.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/lidar/${scanId}?error=forbidden`);
  }

  const title = readString(formData, "title");

  if (!title) {
    redirect(`/projects/${projectSlug}/lidar/${scanId}?error=missing-required-fields`);
  }

  const { error } = await supabase
    .from("lidar_scans")
    .update({
      title,
      status: readString(formData, "status") ?? "registered",
      processing_stage: readString(formData, "processing_stage") ?? "raw_uploaded",
      tile_format: readString(formData, "tile_format") ?? "potree",
      scan_date: readString(formData, "scan_date"),
      equipment: readString(formData, "equipment") ?? "3DMakerPro Eagle Max",
      coordinate_system: readString(formData, "coordinate_system"),
      center_easting: readNumber(formData, "center_easting"),
      center_northing: readNumber(formData, "center_northing"),
      center_elevation: readNumber(formData, "center_elevation"),
      center_latitude: readNumber(formData, "center_latitude"),
      center_longitude: readNumber(formData, "center_longitude"),
      bbox_west: readNumber(formData, "bbox_west"),
      bbox_south: readNumber(formData, "bbox_south"),
      bbox_east: readNumber(formData, "bbox_east"),
      bbox_north: readNumber(formData, "bbox_north"),
      raw_file_path: readString(formData, "raw_file_path"),
      tile_path: readString(formData, "tile_path"),
      preview_image_path: readString(formData, "preview_image_path"),
      point_count: readNumber(formData, "point_count"),
      area_acres: readNumber(formData, "area_acres"),
      min_elevation: readNumber(formData, "min_elevation"),
      max_elevation: readNumber(formData, "max_elevation"),
      notes: readString(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", scanId);

  if (error) {
    redirect(`/projects/${projectSlug}/lidar/${scanId}?error=lidar-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/lidar`);
  revalidatePath(`/projects/${projectSlug}/lidar/${scanId}`);
  redirect(`/projects/${projectSlug}/lidar/${scanId}?status=updated`);
}

export async function deleteLidarScan(projectSlug: string, scanId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/lidar?error=supabase-not-configured`);
  }

  const scan = await getLidarScanById(scanId);

  if (!scan) {
    redirect(`/projects/${projectSlug}/lidar?error=scan-not-found`);
  }

  try {
    await requireUploadManagementRole(scan.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/lidar?error=forbidden`);
  }

  const { error } = await supabase.from("lidar_scans").delete().eq("id", scanId);

  if (error) {
    redirect(`/projects/${projectSlug}/lidar?error=lidar-delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/lidar`);
  redirect(`/projects/${projectSlug}/lidar?status=deleted`);
}
