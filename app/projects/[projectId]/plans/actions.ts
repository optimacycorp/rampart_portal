"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth-server";
import { PLAN_TYPE_OPTIONS } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getPlanById, getPlanByProjectSlugAndType, getPlanVersions } from "@/lib/plans";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ProjectPlanType } from "@/lib/types";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadProjectPlan(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/plans?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);
  const { user } = await getCurrentUserContext();

  if (!project || !user) {
    redirect(`/projects/${projectSlug}/plans?error=project-not-found`);
  }

  const planType = `${formData.get("plan_type") ?? ""}`.trim() as ProjectPlanType;
  const title = `${formData.get("title") ?? ""}`.trim();
  const description = `${formData.get("description") ?? ""}`.trim();
  const file = formData.get("file");

  if (!PLAN_TYPE_OPTIONS.includes(planType) || !title) {
    redirect(`/projects/${projectSlug}/plans?error=invalid-required-fields`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectSlug}/plans?error=file-required`);
  }

  const existingPlan = await getPlanByProjectSlugAndType(projectSlug, planType);

  if (existingPlan) {
    redirect(`/projects/${projectSlug}/plans?error=plan-already-exists`);
  }

  const now = Date.now();
  const storagePath = `${project.slug}/plans/${planType}/v1-${now}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("project-plans").upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    redirect(`/projects/${projectSlug}/plans?error=storage-upload-failed`);
  }

  const { data: planInsert, error: planInsertError } = await supabase
    .from("project_plans")
    .insert({
      project_id: project.id,
      plan_type: planType,
      title,
      description: description || null,
      current_version_number: 1,
      current_file_path: storagePath,
      current_mime_type: file.type || "application/octet-stream",
      current_file_name: file.name,
      created_by_user_id: user.id,
      created_by_email: user.email ?? null
    })
    .select("id")
    .single();

  if (planInsertError || !planInsert) {
    await supabase.storage.from("project-plans").remove([storagePath]);
    redirect(`/projects/${projectSlug}/plans?error=plan-save-failed`);
  }

  const { error: versionError } = await supabase.from("project_plan_versions").insert({
    plan_id: planInsert.id,
    uploaded_by_user_id: user.id,
    uploaded_by_email: user.email ?? null,
    version_number: 1,
    file_path: storagePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    notes: description || null,
    is_current: true
  });

  if (versionError) {
    await supabase.from("project_plans").delete().eq("id", planInsert.id);
    await supabase.storage.from("project-plans").remove([storagePath]);
    redirect(`/projects/${projectSlug}/plans?error=plan-version-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/plans`);
  redirect(`/projects/${projectSlug}/plans?status=uploaded&planType=${planType}`);
}

export async function uploadPlanVersion(projectSlug: string, planId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/plans?error=supabase-not-configured`);
  }

  const [project, plan, existingVersions] = await Promise.all([
    getProjectBySlug(projectSlug),
    getPlanById(planId),
    getPlanVersions(planId)
  ]);
  const { user } = await getCurrentUserContext();

  if (!project || !plan || !user) {
    redirect(`/projects/${projectSlug}/plans?error=plan-not-found`);
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectSlug}/plans?error=file-required`);
  }

  const versionNotes = `${formData.get("version_notes") ?? ""}`.trim();
  const nextVersionNumber = Math.max(...existingVersions.map((version) => version.version_number), 0) + 1;
  const now = Date.now();
  const storagePath = `${project.slug}/plans/${plan.plan_type}/v${nextVersionNumber}-${now}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("project-plans").upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    redirect(`/projects/${projectSlug}/plans?error=storage-upload-failed`);
  }

  if (existingVersions.length > 0) {
    const { error: clearCurrentError } = await supabase
      .from("project_plan_versions")
      .update({
        is_current: false,
        superseded_at: new Date().toISOString()
      })
      .eq("plan_id", planId)
      .eq("is_current", true);

    if (clearCurrentError) {
      await supabase.storage.from("project-plans").remove([storagePath]);
      redirect(`/projects/${projectSlug}/plans?error=plan-version-save-failed`);
    }
  }

  const { error: versionError } = await supabase.from("project_plan_versions").insert({
    plan_id: planId,
    uploaded_by_user_id: user.id,
    uploaded_by_email: user.email ?? null,
    version_number: nextVersionNumber,
    file_path: storagePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    notes: versionNotes || null,
    is_current: true
  });

  if (versionError) {
    await supabase.storage.from("project-plans").remove([storagePath]);
    redirect(`/projects/${projectSlug}/plans?error=plan-version-save-failed`);
  }

  const { error: updateError } = await supabase
    .from("project_plans")
    .update({
      current_version_number: nextVersionNumber,
      current_file_path: storagePath,
      current_mime_type: file.type || "application/octet-stream",
      current_file_name: file.name,
      updated_at: new Date().toISOString()
    })
    .eq("id", planId);

  if (updateError) {
    redirect(`/projects/${projectSlug}/plans?error=plan-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/plans`);
  redirect(`/projects/${projectSlug}/plans?status=version-uploaded&planType=${plan.plan_type}`);
}
