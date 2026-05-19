import { seededEvidencePhotos, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { EvidencePhoto } from "@/lib/types";
import { getProjectBySlug } from "./documents";

export async function getEvidencePhotosByProjectSlug(projectSlug: string): Promise<EvidencePhoto[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededEvidencePhotos : [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("evidence_photos")
    .select(
      "id, project_id, title, media_kind, mime_type, photo_date, latitude, longitude, easting, northing, direction_facing, category, file_path, notes, linked_point_id, created_by_user_id, created_by_email, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as EvidencePhoto[];
}

export async function getEvidencePhotoById(photoId: string): Promise<EvidencePhoto | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return seededEvidencePhotos.find((photo) => photo.id === photoId) ?? null;
  }

  const { data, error } = await supabase
    .from("evidence_photos")
    .select(
      "id, project_id, title, media_kind, mime_type, photo_date, latitude, longitude, easting, northing, direction_facing, category, file_path, notes, linked_point_id, created_by_user_id, created_by_email, created_at"
    )
    .eq("id", photoId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EvidencePhoto;
}
