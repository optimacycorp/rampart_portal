"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/constants";
import { ingestDocumentChunks } from "@/lib/document-chunks";
import { getDocumentById, getDocumentVersions, getProjectBySlug } from "@/lib/documents";
import { extractTextFromUploadedFile } from "@/lib/file-text-extraction";
import { syncImportedReviewerCommentsFromDocument } from "@/lib/reviewer-comment-import";
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
  const { user } = await getCurrentUserContext();

  if (!project || !user) {
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

  const { data: documentInsert, error: insertError } = await supabase
    .from("documents")
    .insert({
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
      created_by_user_id: user.id,
      created_by_email: user.email ?? null,
      file_path: storagePath,
      status: "uploaded",
      current_version_number: 1
    })
    .select("id")
    .single();

  if (insertError || !documentInsert) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    redirect(`/projects/${projectSlug}/documents?error=document-save-failed`);
  }

  const { error: versionInsertError } = await supabase.from("document_versions").insert({
    document_id: documentInsert.id,
    uploaded_by_user_id: user.id,
    uploaded_by_email: user.email ?? null,
    version_number: 1,
    file_path: storagePath,
    notes: notes || null,
    is_current: true
  });

  if (versionInsertError) {
    await supabase.from("documents").delete().eq("id", documentInsert.id);
    await supabase.storage.from("project-documents").remove([storagePath]);
    redirect(`/projects/${projectSlug}/documents?error=document-version-save-failed`);
  }

  try {
    const extractedText = await extractTextFromUploadedFile(file);
    const ingestResult = await ingestDocumentChunks(projectSlug, documentInsert.id, {
      extractedText,
      sectionLabel: extractedText ? `${title} uploaded text` : `${title} metadata`
    });
    if ("error" in ingestResult) {
      console.error("Automatic document assistant ingest failed", ingestResult.error);
    }

    const importResult = await syncImportedReviewerCommentsFromDocument({
      projectSlug,
      documentId: documentInsert.id,
      createdByUserId: user.id,
      createdByEmail: user.email ?? null,
      extractedText
    });

    revalidatePath(`/projects/${projectSlug}/comments`);
    revalidatePath(`/projects/${projectSlug}/documents`);
    redirect(
      `/projects/${projectSlug}/documents?status=${
        importResult.importedCount > 0 ? "uploaded-comments-imported" : "uploaded"
      }`
    );
  } catch (error) {
    console.error("Automatic document assistant ingest or comment import failed", error);
    revalidatePath(`/projects/${projectSlug}/documents`);
    redirect(`/projects/${projectSlug}/documents?error=comment-import-failed`);
  }
}

export async function uploadDocumentVersion(projectSlug: string, documentId: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=supabase-not-configured`);
  }

  const [project, document, existingVersions] = await Promise.all([
    getProjectBySlug(projectSlug),
    getDocumentById(documentId),
    getDocumentVersions(documentId)
  ]);
  const { user } = await getCurrentUserContext();

  if (!project || !document || !user) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=document-not-found`);
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=file-required`);
  }

  const versionNotes = `${formData.get("version_notes") ?? ""}`.trim();
  const now = Date.now();
  const nextVersionNumber = Math.max(...existingVersions.map((version) => version.version_number), 0) + 1;
  const storagePath = `${project.slug}/${documentId}/v${nextVersionNumber}-${now}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

  if (uploadError) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=storage-upload-failed`);
  }

  if (existingVersions.length > 0) {
    const { error: clearCurrentError } = await supabase
      .from("document_versions")
      .update({
        is_current: false,
        superseded_at: new Date().toISOString()
      })
      .eq("document_id", documentId)
      .eq("is_current", true);

    if (clearCurrentError) {
      await supabase.storage.from("project-documents").remove([storagePath]);
      redirect(`/projects/${projectSlug}/documents/${documentId}?error=document-version-save-failed`);
    }
  }

  const { error: versionInsertError } = await supabase.from("document_versions").insert({
    document_id: documentId,
    uploaded_by_user_id: user.id,
    uploaded_by_email: user.email ?? null,
    version_number: nextVersionNumber,
    file_path: storagePath,
    notes: versionNotes || null,
    is_current: true
  });

  if (versionInsertError) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=document-version-save-failed`);
  }

  const { error: documentUpdateError } = await supabase
    .from("documents")
    .update({
      file_path: storagePath,
      current_version_number: nextVersionNumber,
      updated_at: new Date().toISOString()
    })
    .eq("id", documentId);

  if (documentUpdateError) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=document-save-failed`);
  }

  try {
    const extractedText = await extractTextFromUploadedFile(file);
    const ingestResult = await ingestDocumentChunks(projectSlug, documentId, {
      extractedText: extractedText || versionNotes || null,
      sectionLabel: extractedText ? `${document.title} version ${nextVersionNumber} text` : `${document.title} metadata`
    });
    if ("error" in ingestResult) {
      console.error("Automatic document version assistant ingest failed", ingestResult.error);
    }

    const importResult = await syncImportedReviewerCommentsFromDocument({
      projectSlug,
      documentId,
      createdByUserId: user.id,
      createdByEmail: user.email ?? null,
      extractedText
    });

    revalidatePath(`/projects/${projectSlug}/comments`);
    revalidatePath(`/projects/${projectSlug}/documents`);
    revalidatePath(`/projects/${projectSlug}/documents/${documentId}`);
    redirect(
      `/projects/${projectSlug}/documents/${documentId}?status=${
        importResult.importedCount > 0 ? "version-uploaded-comments-imported" : "version-uploaded"
      }`
    );
  } catch (error) {
    console.error("Automatic document version ingest or comment import failed", error);
    revalidatePath(`/projects/${projectSlug}/documents/${documentId}`);
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=comment-import-failed`);
  }
}

export async function deleteProjectDocument(projectSlug: string, documentId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/documents?error=supabase-not-configured`);
  }

  const document = await getDocumentById(documentId);

  if (!document) {
    redirect(`/projects/${projectSlug}/documents?error=document-not-found`);
  }

  try {
    await requireUploadManagementRole(document.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/documents?error=forbidden`);
  }

  const versions = await getDocumentVersions(documentId);

  const filePaths = versions.map((version) => version.file_path).filter(Boolean);

  if (filePaths.length > 0) {
    await supabase.storage.from("project-documents").remove(filePaths);
  }

  await supabase.from("reviewer_comments").delete().eq("imported_from_document_id", documentId);
  await supabase
    .from("reviewer_comments")
    .update({ linked_document_id: null, updated_at: new Date().toISOString() })
    .eq("linked_document_id", documentId)
    .is("imported_from_document_id", null);

  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  if (error) {
    redirect(`/projects/${projectSlug}/documents?error=document-delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/documents`);
  revalidatePath(`/projects/${projectSlug}/documents/${documentId}`);
  redirect(`/projects/${projectSlug}/documents?status=deleted`);
}

export async function ingestDocumentForAssistant(projectSlug: string, documentId: string) {
  const result = await ingestDocumentChunks(projectSlug, documentId);

  if ("error" in result) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=assistant-ingest-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/documents/${documentId}`);
  redirect(`/projects/${projectSlug}/documents/${documentId}?status=assistant-ingested`);
}

export async function reimportDocumentCommentsAndIndex(projectSlug: string, documentId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=supabase-not-configured`);
  }

  const [document, versions] = await Promise.all([getDocumentById(documentId), getDocumentVersions(documentId)]);

  if (!document) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=document-not-found`);
  }

  const currentVersion = versions.find((version) => version.is_current) ?? versions[0];
  const filePath = currentVersion?.file_path ?? document.file_path;

  if (!filePath) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=file-required`);
  }

  const { data, error } = await supabase.storage.from("project-documents").download(filePath);

  if (error || !data) {
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=storage-upload-failed`);
  }

  const fileName = filePath.split("/").pop() || `${document.title}.pdf`;
  const downloadedFile = new File([await data.arrayBuffer()], fileName, {
    type: data.type || "application/octet-stream"
  });

  try {
    const extractedText = await extractTextFromUploadedFile(downloadedFile);
    const ingestResult = await ingestDocumentChunks(projectSlug, documentId, {
      extractedText,
      sectionLabel: extractedText ? `${document.title} uploaded text` : `${document.title} metadata`
    });
    if ("error" in ingestResult) {
      throw new Error(ingestResult.error);
    }

    await syncImportedReviewerCommentsFromDocument({
      projectSlug,
      documentId,
      createdByUserId: document.created_by_user_id ?? null,
      createdByEmail: document.created_by_email ?? null,
      extractedText
    });
  } catch (ingestError) {
    console.error("Document re-import and re-index failed", ingestError);
    redirect(`/projects/${projectSlug}/documents/${documentId}?error=assistant-ingest-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/documents`);
  revalidatePath(`/projects/${projectSlug}/documents/${documentId}`);
  revalidatePath(`/projects/${projectSlug}/comments`);
  redirect(`/projects/${projectSlug}/documents/${documentId}?status=reimported-and-indexed`);
}
