"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getSupabaseAdminClient } from "@/lib/supabase";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadProjectDocument(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/documents?error=supabase-not-configured`);
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect(`/projects/${projectSlug}/documents?error=project-not-found`);
  }

  const title = `${formData.get("title") ?? ""}`.trim();
  const documentType = `${formData.get("document_type") ?? ""}`.trim();
  const file = formData.get("file");

  if (!title || !DOCUMENT_TYPE_OPTIONS.includes(documentType as (typeof DOCUMENT_TYPE_OPTIONS)[number])) {
    redirect(`/projects/${projectSlug}/documents?error=invalid-required-fields`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectSlug}/documents?error=file-required`);
  }

  const now = Date.now();
  const storagePath = `${project.slug}/${now}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

  if (uploadError) {
    redirect(`/projects/${projectSlug}/documents?error=storage-upload-failed`);
  }

  const recordDateValue = `${formData.get("record_date") ?? ""}`.trim();
  const receptionNumber = `${formData.get("reception_number") ?? ""}`.trim();
  const book = `${formData.get("book") ?? ""}`.trim();
  const page = `${formData.get("page") ?? ""}`.trim();
  const sourceAgency = `${formData.get("source_agency") ?? ""}`.trim();
  const notes = `${formData.get("notes") ?? ""}`.trim();
  const externalUrl = `${formData.get("external_url") ?? ""}`.trim();

  const { error: insertError } = await supabase.from("documents").insert({
    project_id: project.id,
    title,
    document_type: documentType,
    record_date: recordDateValue || null,
    reception_number: receptionNumber || null,
    book: book || null,
    page: page || null,
    source_agency: sourceAgency || null,
    notes: notes || null,
    external_url: externalUrl || null,
    file_path: storagePath,
    status: "uploaded"
  });

  if (insertError) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    redirect(`/projects/${projectSlug}/documents?error=document-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/documents`);
  redirect(`/projects/${projectSlug}/documents?status=uploaded`);
}
