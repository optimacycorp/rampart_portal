"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { PHOTO_CATEGORY_OPTIONS } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getEvidencePhotoById } from "@/lib/evidence-photos";
import { getSupabaseAdminClient } from "@/lib/supabase";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const normalized = `${value ?? ""}`.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function uploadEvidencePhoto(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/photos?error=supabase-not-configured`);
  }

  const [project, { user }] = await Promise.all([getProjectBySlug(projectSlug), getCurrentUserContext()]);

  if (!project || !user) {
    redirect(`/projects/${projectSlug}/photos?error=project-not-found`);
  }

  const title = `${formData.get("title") ?? ""}`.trim();
  const category = `${formData.get("category") ?? ""}`.trim();
  const file = formData.get("file");

  if (!title || !PHOTO_CATEGORY_OPTIONS.includes(category as (typeof PHOTO_CATEGORY_OPTIONS)[number])) {
    redirect(`/projects/${projectSlug}/photos?error=invalid-required-fields`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectSlug}/photos?error=file-required`);
  }

  const photoId = crypto.randomUUID();
  const storagePath = `${project.slug}/photos/${photoId}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("field-photos").upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    redirect(`/projects/${projectSlug}/photos?error=storage-upload-failed`);
  }

  const { error } = await supabase.from("evidence_photos").insert({
    id: photoId,
    project_id: project.id,
    title,
    photo_date: `${formData.get("photo_date") ?? ""}`.trim() || null,
    latitude: parseOptionalNumber(formData.get("latitude")),
    longitude: parseOptionalNumber(formData.get("longitude")),
    easting: parseOptionalNumber(formData.get("easting")),
    northing: parseOptionalNumber(formData.get("northing")),
    direction_facing: `${formData.get("direction_facing") ?? ""}`.trim() || null,
    category,
    file_path: storagePath,
    notes: `${formData.get("notes") ?? ""}`.trim() || null,
    linked_point_id: `${formData.get("linked_point_id") ?? ""}`.trim() || null,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null
  });

  if (error) {
    await supabase.storage.from("field-photos").remove([storagePath]);
    redirect(`/projects/${projectSlug}/photos?error=photo-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/photos`);
  redirect(`/projects/${projectSlug}/photos?status=uploaded`);
}

export async function deleteEvidencePhoto(projectSlug: string, photoId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/photos?error=supabase-not-configured`);
  }

  const photo = await getEvidencePhotoById(photoId);

  if (!photo) {
    redirect(`/projects/${projectSlug}/photos?error=photo-not-found`);
  }

  try {
    await requireUploadManagementRole(photo.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/photos?error=forbidden`);
  }

  if (photo.file_path) {
    await supabase.storage.from("field-photos").remove([photo.file_path]);
  }

  const { error } = await supabase.from("evidence_photos").delete().eq("id", photoId);

  if (error) {
    redirect(`/projects/${projectSlug}/photos?error=delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/photos`);
  redirect(`/projects/${projectSlug}/photos?status=deleted`);
}
