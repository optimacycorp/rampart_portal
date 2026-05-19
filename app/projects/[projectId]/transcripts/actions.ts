"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAutomaticTranscriptionConfigured, transcribeAudioFile } from "@/lib/audio-transcription";
import { getCurrentUserContext, requireUploadManagementRole } from "@/lib/auth-server";
import { ingestTranscriptChunks } from "@/lib/document-chunks";
import { getProjectBySlug } from "@/lib/documents";
import { extractTextFromUploadedFile } from "@/lib/file-text-extraction";
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

async function buildStoredAudioFile(storagePath: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage.from("meeting-media").download(storagePath);

  if (error || !data) {
    return null;
  }

  const fileName = storagePath.split("/").pop() || "meeting-audio";
  const arrayBuffer = await data.arrayBuffer();

  return new File([arrayBuffer], fileName, {
    type: data.type || "application/octet-stream"
  });
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

  const extractedTranscriptFileText = await extractTextFromUploadedFile(transcriptFile instanceof File ? transcriptFile : null);
  let finalTranscriptText = transcriptText || extractedTranscriptFileText || null;
  let transcriptionStatus = finalTranscriptText ? "provided" : audioFilePath ? "audio_uploaded" : "not_requested";
  let transcriptionModel: string | null = null;
  let transcriptionError: string | null = null;

  if (!finalTranscriptText && audioFile instanceof File && audioFile.size > 0) {
    const transcriptionResult = await transcribeAudioFile(audioFile, {
      prompt: `Meeting title: ${title}`
    });

    if (transcriptionResult.ok) {
      finalTranscriptText = transcriptionResult.text;
      transcriptionStatus = "auto_transcribed";
      transcriptionModel = transcriptionResult.model;
      transcriptionError = null;
    } else if (isAutomaticTranscriptionConfigured()) {
      transcriptionStatus = "failed";
      transcriptionModel = transcriptionResult.model ?? null;
      transcriptionError = transcriptionResult.reason;
    }
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
    transcript_text: finalTranscriptText,
    transcription_status: transcriptionStatus,
    transcription_model: transcriptionModel,
    transcription_error: transcriptionError,
    notes,
    created_by_user_id: user.id,
    created_by_email: user.email ?? null
  });

  if (error) {
    if (audioFilePath) await supabase.storage.from("meeting-media").remove([audioFilePath]);
    if (transcriptFilePath) await supabase.storage.from("meeting-media").remove([transcriptFilePath]);
    redirect(`/projects/${projectSlug}/transcripts?error=save-failed`);
  }

  try {
    await ingestTranscriptChunks(projectSlug, transcriptId, {
      extractedText: finalTranscriptText || notes || null,
      sectionLabel: finalTranscriptText ? `${title} transcript text` : `${title} metadata`
    });
  } catch (ingestError) {
    console.error("Automatic transcript assistant ingest failed", ingestError);
  }

  revalidatePath(`/projects/${projectSlug}/transcripts`);
  redirect(
    `/projects/${projectSlug}/transcripts?status=${
      transcriptionStatus === "auto_transcribed"
        ? "uploaded-and-transcribed"
        : transcriptionStatus === "failed"
          ? "uploaded-transcription-failed"
          : "uploaded"
    }`
  );
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

export async function ingestTranscriptForAssistant(projectSlug: string, transcriptId: string) {
  const result = await ingestTranscriptChunks(projectSlug, transcriptId);

  if ("error" in result) {
    redirect(`/projects/${projectSlug}/transcripts?error=assistant-ingest-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/transcripts`);
  redirect(`/projects/${projectSlug}/transcripts?status=assistant-ingested`);
}

export async function transcribeMeetingAudio(projectSlug: string, transcriptId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/transcripts?error=supabase-not-configured`);
  }

  const transcript = await getMeetingTranscriptById(transcriptId);

  if (!transcript) {
    redirect(`/projects/${projectSlug}/transcripts?error=transcript-not-found`);
  }

  if (!transcript.audio_file_path) {
    redirect(`/projects/${projectSlug}/transcripts?error=no-audio-file`);
  }

  const audioFile = await buildStoredAudioFile(transcript.audio_file_path);

  if (!audioFile) {
    redirect(`/projects/${projectSlug}/transcripts?error=audio-download-failed`);
  }

  const transcriptionResult = await transcribeAudioFile(audioFile, {
    prompt: `Meeting title: ${transcript.title}`
  });

  if (!transcriptionResult.ok) {
    await supabase
      .from("meeting_transcripts")
      .update({
        transcription_status: isAutomaticTranscriptionConfigured() ? "failed" : "audio_uploaded",
        transcription_model: transcriptionResult.model ?? null,
        transcription_error: transcriptionResult.reason
      })
      .eq("id", transcript.id);

    revalidatePath(`/projects/${projectSlug}/transcripts`);
    redirect(`/projects/${projectSlug}/transcripts?error=audio-transcription-failed`);
  }

  const { error } = await supabase
    .from("meeting_transcripts")
    .update({
      transcript_text: transcriptionResult.text,
      transcription_status: "auto_transcribed",
      transcription_model: transcriptionResult.model,
      transcription_error: null
    })
    .eq("id", transcript.id);

  if (error) {
    redirect(`/projects/${projectSlug}/transcripts?error=save-failed`);
  }

  try {
    await ingestTranscriptChunks(projectSlug, transcript.id, {
      extractedText: transcriptionResult.text,
      sectionLabel: `${transcript.title} transcript text`
    });
  } catch (ingestError) {
    console.error("Transcript re-ingest failed after auto transcription", ingestError);
  }

  revalidatePath(`/projects/${projectSlug}/transcripts`);
  redirect(`/projects/${projectSlug}/transcripts?status=audio-transcribed`);
}
