"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getReviewerCommentById } from "@/lib/reviewer-comments";
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
  const { user } = await getCurrentUserContext();

  if (!project || !user) {
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
    due_date: readValue(formData, "due_date") || null,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null
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

export async function deleteReviewerComment(projectSlug: string, commentId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/comments?error=supabase-not-configured`);
  }

  const comment = await getReviewerCommentById(commentId);

  if (!comment) {
    redirect(`/projects/${projectSlug}/comments?error=comment-not-found`);
  }

  try {
    await requireUploadManagementRole(comment.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/comments?error=forbidden`);
  }

  const { error } = await supabase.from("reviewer_comments").delete().eq("id", commentId);

  if (error) {
    redirect(`/projects/${projectSlug}/comments?error=comment-delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/comments`);
  redirect(`/projects/${projectSlug}/comments?status=deleted`);
}
