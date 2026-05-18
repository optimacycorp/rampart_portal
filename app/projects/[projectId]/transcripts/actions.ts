"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { getMeetingTranscriptById } from "@/lib/meeting-transcripts";
import { getSupabaseAdminClient } from "@/lib/supabase";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadOptionalFile(projectSlug: string, transcriptId: string, file: FormDataEntryValue | null, prefix: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !(file instanceof File) || file.size === 0) {
    return null;
  }

  const storagePath = `${projectSlug}/transcripts/${transcriptId}-${prefix}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from("meeting-media").upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`upload-failed:${prefix}`);
  }

  return storagePath;
}

export async function uploadMeetingTranscript(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/transcripts?error=supabase-not-configured`);
  }

  const [project, { user }] = await Promise.all([getProjectBySlug(projectSlug), getCurrentUserContext()]);

  if (!project || !user) {
    redirect(`/projects/${projectSlug}/transcripts?error=project-not-found`);
  }

  const title = `${formData.get("title") ?? ""}`.trim();
  const meetingDate = `${formData.get("meeting_date") ?? ""}`.trim() || null;
  const participants = `${formData.get("participants") ?? ""}`.trim() || null;
  const source = `${formData.get("source") ?? ""}`.trim() || null;
  const transcriptText = `${formData.get("transcript_text") ?? ""}`.trim() || null;
  const notes = `${formData.get("notes") ?? ""}`.trim() || null;
  const audioFile = formData.get("audio_file");
  const transcriptFile = formData.get("transcript_file");

  if (!title || (!(audioFile instanceof File) || audioFile.size === 0) && (!(transcriptFile instanceof File) || transcriptFile.size === 0) && !transcriptText) {
    redirect(`/projects/${projectSlug}/transcripts?error=missing-required-fields`);
  }

  const transcriptId = crypto.randomUUID();
  let audioFilePath: string | null = null;
  let transcriptFilePath: string | null = null;

  try {
    audioFilePath = await uploadOptionalFile(project.slug, transcriptId, audioFile, "audio");
    transcriptFilePath = await uploadOptionalFile(project.slug, transcriptId, transcriptFile, "transcript");
  } catch (error) {
    redirect(`/projects/${projectSlug}/transcripts?error=storage-upload-failed`);
  }

  const { error } = await supabase.from("meeting_transcripts").insert({
    id: transcriptId,
    project_id: project.id,
    title,
    meeting_date: meetingDate,
    participants,
    source,
    audio_file_path: audioFilePath,
    transcript_file_path: transcriptFilePath,
    transcript_text: transcriptText,
    notes,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null
  });

  if (error) {
    if (audioFilePath) await supabase.storage.from("meeting-media").remove([audioFilePath]);
    if (transcriptFilePath) await supabase.storage.from("meeting-media").remove([transcriptFilePath]);
    redirect(`/projects/${projectSlug}/transcripts?error=save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/transcripts`);
  redirect(`/projects/${projectSlug}/transcripts?status=uploaded`);
}

export async function deleteMeetingTranscript(projectSlug: string, transcriptId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/transcripts?error=supabase-not-configured`);
  }

  const transcript = await getMeetingTranscriptById(transcriptId);

  if (!transcript) {
    redirect(`/projects/${projectSlug}/transcripts?error=transcript-not-found`);
  }

  try {
    await requireUploadManagementRole(transcript.created_by_user_id);
  } catch {
    redirect(`/projects/${projectSlug}/transcripts?error=forbidden`);
  }

  const filePaths = [transcript.audio_file_path, transcript.transcript_file_path].filter(Boolean) as string[];

  if (filePaths.length > 0) {
    await supabase.storage.from("meeting-media").remove(filePaths);
  }

  const { error } = await supabase.from("meeting_transcripts").delete().eq("id", transcriptId);

  if (error) {
    redirect(`/projects/${projectSlug}/transcripts?error=delete-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/transcripts`);
  redirect(`/projects/${projectSlug}/transcripts?status=deleted`);
}
