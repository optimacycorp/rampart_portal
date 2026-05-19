import { seededMeetingTranscripts, seededProject } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { MeetingTranscript } from "@/lib/types";

export async function getMeetingTranscriptsByProjectSlug(projectSlug: string): Promise<MeetingTranscript[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return projectSlug === seededProject.slug ? seededMeetingTranscripts : [];
  }

  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).single();

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("meeting_transcripts")
    .select(
      "id, project_id, title, meeting_date, participants, source, audio_file_path, transcript_file_path, transcript_text, transcription_status, transcription_model, transcription_error, notes, created_by_user_id, created_by_email, created_at, updated_at"
    )
    .eq("project_id", project.id)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as MeetingTranscript[];
}

export async function getMeetingTranscriptById(transcriptId: string): Promise<MeetingTranscript | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return seededMeetingTranscripts.find((transcript) => transcript.id === transcriptId) ?? null;
  }

  const { data, error } = await supabase
    .from("meeting_transcripts")
    .select(
      "id, project_id, title, meeting_date, participants, source, audio_file_path, transcript_file_path, transcript_text, transcription_status, transcription_model, transcription_error, notes, created_by_user_id, created_by_email, created_at, updated_at"
    )
    .eq("id", transcriptId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as MeetingTranscript;
}
