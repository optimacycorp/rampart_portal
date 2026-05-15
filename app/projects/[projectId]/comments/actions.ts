"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

function readValue(formData: FormData, key: string) {
  return `${formData.get(key) ?? ""}`.trim();
}

export async function createReviewerComment(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/comments?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect(`/projects/${projectSlug}/comments?error=project-not-found`);
  }

  const payload = {
    project_id: project.id,
    application_number: readValue(formData, "application_number"),
    comment_id: readValue(formData, "comment_id"),
    reviewer_name: readValue(formData, "reviewer_name"),
    department: readValue(formData, "department"),
    priority: readValue(formData, "priority") || "medium",
    status: readValue(formData, "status") || "open",
    comment_text: readValue(formData, "comment_text"),
    response_text: readValue(formData, "response_text") || null,
    responsible_party: readValue(formData, "responsible_party"),
    linked_document_id: readValue(formData, "linked_document_id") || null,
    due_date: readValue(formData, "due_date") || null
  };

  if (!payload.comment_text || !payload.comment_id || !payload.reviewer_name || !payload.department) {
    redirect(`/projects/${projectSlug}/comments?error=missing-required-fields`);
  }

  const { error } = await supabase.from("reviewer_comments").insert(payload);

  if (error) {
    redirect(`/projects/${projectSlug}/comments?error=comment-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/comments`);
  redirect(`/projects/${projectSlug}/comments?status=created`);
}

export async function updateReviewerComment(projectSlug: string, commentId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/comments?error=supabase-not-configured`);
  }

  const payload = {
    application_number: readValue(formData, "application_number"),
    comment_id: readValue(formData, "comment_id"),
    reviewer_name: readValue(formData, "reviewer_name"),
    department: readValue(formData, "department"),
    priority: readValue(formData, "priority") || "medium",
    status: readValue(formData, "status") || "open",
    comment_text: readValue(formData, "comment_text"),
    response_text: readValue(formData, "response_text") || null,
    responsible_party: readValue(formData, "responsible_party"),
    linked_document_id: readValue(formData, "linked_document_id") || null,
    due_date: readValue(formData, "due_date") || null,
    updated_at: new Date().toISOString()
  };

  if (!payload.comment_text || !payload.comment_id || !payload.reviewer_name || !payload.department) {
    redirect(`/projects/${projectSlug}/comments?error=missing-required-fields`);
  }

  const { error } = await supabase.from("reviewer_comments").update(payload).eq("id", commentId);

  if (error) {
    redirect(`/projects/${projectSlug}/comments?error=comment-update-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/comments`);
  redirect(`/projects/${projectSlug}/comments?status=updated`);
}
