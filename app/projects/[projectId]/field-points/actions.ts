"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { validateFieldPointImportRow } from "@/lib/field-point-import";
import { getFieldPointById } from "@/lib/field-points";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { FieldPointImportRow } from "@/lib/types";

export async function importFieldPoints(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/field-points/import?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);
  const { user } = await getCurrentUserContext();

  if (!project || !user) {
    redirect(`/projects/${projectSlug}/field-points/import?error=project-not-found`);
  }

  const payload = `${formData.get("rows_json") ?? ""}`;

  if (!payload) {
    redirect(`/projects/${projectSlug}/field-points/import?error=no-preview-data`);
  }

  let rows: FieldPointImportRow[] = [];

  try {
    rows = JSON.parse(payload) as FieldPointImportRow[];
  } catch {
    redirect(`/projects/${projectSlug}/field-points/import?error=invalid-preview-data`);
  }

  const validRows = rows
    .map((row) => validateFieldPointImportRow(row))
    .filter((row) => row.validationIssues.length === 0)
    .map((row) => ({
      project_id: project.id,
      uploaded_by_user_id: user.id,
      uploaded_by_email: user.email ?? null,
      import_source_file: `${formData.get("source_file_name") ?? ""}`.trim() || null,
      point_name: row.point_name,
      point_type: row.point_type,
      easting: row.easting ?? null,
      northing: row.northing ?? null,
      elevation: row.elevation ?? null,
      coordinate_system: row.coordinate_system || null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      description: row.description ?? null,
      source_equipment: row.source_equipment ?? null,
      collection_method: row.collection_method ?? null,
      collected_at: row.collected_at || null,
      confidence: row.confidence || "field_observed"
    }));

  if (validRows.length === 0) {
    redirect(`/projects/${projectSlug}/field-points/import?error=no-valid-rows`);
  }

  const { error } = await supabase.from("field_points").insert(validRows);

  if (error) {
    redirect(`/projects/${projectSlug}/field-points/import?error=save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/field-points`);
  revalidatePath(`/projects/${projectSlug}/field-points/import`);
  redirect(`/projects/${projectSlug}/field-points?status=imported`);
}

export async function deleteFieldPoint(projectSlug: string, fieldPointId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/field-points?error=supabase-not-configured`);
  }

  try {
    const fieldPoint = await getFieldPointById(fieldPointId);
    await requireUploadManagementRole(fieldPoint?.uploaded_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/field-points?error=forbidden`);
  }

  const { error } = await supabase.from("field_points").delete().eq("id", fieldPointId);

  if (error) {
    redirect(`/projects/${projectSlug}/field-points?error=delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/field-points`);
  revalidatePath(`/projects/${projectSlug}/map`);
  redirect(`/projects/${projectSlug}/field-points?status=deleted`);
}
