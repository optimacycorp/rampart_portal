"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProjectBySlug, getDocumentsByProjectSlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function createAccessLogEntry(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/access-log?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect(`/projects/${projectSlug}/access-log?error=project-not-found`);
  }

  const accessFeature = `${formData.get("access_feature") ?? ""}`.trim();
  const status = `${formData.get("status") ?? ""}`.trim();
  const logDate = `${formData.get("log_date") ?? ""}`.trim() || null;
  const description = `${formData.get("description") ?? ""}`.trim() || null;
  const roadCondition = `${formData.get("road_condition") ?? ""}`.trim() || null;
  const gateCondition = `${formData.get("gate_condition") ?? ""}`.trim() || null;
  const weather = `${formData.get("weather") ?? ""}`.trim() || null;
  const linkedDocumentId = `${formData.get("linked_document_id") ?? ""}`.trim() || null;

  if (!accessFeature || !status) {
    redirect(`/projects/${projectSlug}/access-log?error=missing-required-fields`);
  }

  if (linkedDocumentId) {
    const documents = await getDocumentsByProjectSlug(projectSlug);
    const linkedDocumentExists = documents.some((document) => document.id === linkedDocumentId);

    if (!linkedDocumentExists) {
      redirect(`/projects/${projectSlug}/access-log?error=document-not-found`);
    }
  }

  const { error } = await supabase.from("access_logs").insert({
    project_id: project.id,
    log_date: logDate,
    access_feature: accessFeature,
    status,
    description,
    road_condition: roadCondition,
    gate_condition: gateCondition,
    weather,
    linked_document_id: linkedDocumentId
  });

  if (error) {
    redirect(`/projects/${projectSlug}/access-log?error=save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/access-log`);
  redirect(`/projects/${projectSlug}/access-log?status=saved`);
}
