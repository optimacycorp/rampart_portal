"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

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

  if (!project) {
    redirect(`/projects/${projectSlug}/lidar?error=project-not-found`);
  }

  const title = readString(formData, "title");

  if (!title) {
    redirect(`/projects/${projectSlug}/lidar?error=missing-required-fields`);
  }

  const payload = {
    project_id: project.id,
    title,
    scan_date: readString(formData, "scan_date"),
    equipment: readString(formData, "equipment") ?? "3DMakerPro Eagle Max",
    coordinate_system: readString(formData, "coordinate_system"),
    center_easting: readNumber(formData, "center_easting"),
    center_northing: readNumber(formData, "center_northing"),
    center_elevation: readNumber(formData, "center_elevation"),
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
