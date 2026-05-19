import Link from "next/link";
import {
  deleteMeetingTranscript,
  ingestTranscriptForAssistant,
  transcribeMeetingAudio,
  uploadMeetingTranscript
} from "@/app/projects/[projectId]/transcripts/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MeetingTranscriptUploadForm } from "@/components/MeetingTranscriptUploadForm";
import { PageHeader } from "@/components/PageHeader";
import { isAutomaticTranscriptionConfigured } from "@/lib/audio-transcription";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getAssistantIndexStatusByProjectSlug } from "@/lib/document-chunks";
import { getProjectBySlug } from "@/lib/documents";
import { getMeetingTranscriptsByProjectSlug } from "@/lib/meeting-transcripts";

const feedbackText: Record<string, string> = {
  uploaded: "Meeting transcript uploaded.",
  "uploaded-and-transcribed": "Meeting transcript uploaded and audio was transcribed automatically.",
  "uploaded-transcription-failed":
    "Meeting transcript uploaded, but automatic audio transcription failed. The record was still saved.",
  deleted: "Meeting transcript deleted.",
  "assistant-ingested": "Meeting transcript indexed for assistant search.",
  "audio-transcribed": "Audio was transcribed and the transcript record was updated.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields":
    "A meeting title is required, plus at least one of audio upload, transcript file upload, or transcript text.",
  "storage-upload-failed": "The meeting media file could not be uploaded to storage.",
  "save-failed": "The meeting transcript record could not be saved.",
  "assistant-ingest-failed": "The assistant search index could not be updated for this transcript.",
  "audio-transcription-failed":
    "Audio transcription did not complete. Check the transcript record status for details and try again if needed.",
  "audio-download-failed": "The stored audio file could not be retrieved for transcription.",
  "no-audio-file": "This meeting record does not have an audio file to transcribe.",
  forbidden: "Only the uploader or an audit user can delete uploaded transcript records.",
  "delete-failed": "The meeting transcript could not be deleted.",
  "transcript-not-found": "The requested transcript record could not be found."
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No date";
}

function getTranscriptionStatusLabel(status?: string | null) {
  switch (status) {
    case "provided":
      return "Transcript provided";
    case "auto_transcribed":
      return "Auto transcribed";
    case "audio_uploaded":
      return "Audio uploaded";
    case "failed":
      return "Transcription failed";
    default:
      return "No transcript";
  }
}

function getTranscriptionStatusClasses(status?: string | null) {
  switch (status) {
    case "provided":
      return "bg-emerald-100 text-emerald-700";
    case "auto_transcribed":
      return "bg-sky-100 text-sky-700";
    case "failed":
      return "bg-rose-100 text-rose-700";
    case "audio_uploaded":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function MeetingTranscriptsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [{ user, role }, project, transcripts, assistantIndex] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getMeetingTranscriptsByProjectSlug(projectId),
    getAssistantIndexStatusByProjectSlug(projectId)
  ]);
  const automaticTranscriptionEnabled = isAutomaticTranscriptionConfigured();

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Meeting Transcripts"
          title="Project not found"
          description="The requested project slug does not exist in the current dataset."
        />
      </div>
    );
  }

  const action = uploadMeetingTranscript.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Meeting Transcripts"
        title={`${project.name} meeting transcripts`}
        description="Capture project audio, transcript files, and transcript text so calls and meetings become searchable project evidence."
      />
      <DisclaimerBanner />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {feedbackText[query.status]}
        </div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {feedbackText[query.error]}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Upload transcript record</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add raw audio, a transcript file, pasted transcript text, or any combination of those for a meeting record.
          </p>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {automaticTranscriptionEnabled
              ? "Automatic audio transcription is enabled for supported audio uploads up to 25 MB."
              : "Automatic audio transcription is not configured on this server yet. Audio files can still be stored now and transcribed later."}
          </div>
          <div className="mt-5">
            <MeetingTranscriptUploadForm action={action} />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Transcript library</h2>
              <p className="mt-2 text-sm text-slate-600">Most recent meeting records appear first.</p>
            </div>
            <span className="text-sm text-slate-500">{transcripts.length} transcripts</span>
          </div>
          <div className="mt-4 space-y-4">
            {transcripts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No meeting transcripts have been uploaded yet.
              </div>
            ) : null}
            {transcripts.map((transcript) => {
              const canDelete = role === "audit" || (Boolean(user) && transcript.created_by_user_id === user?.id);
              const indexed = assistantIndex.indexedTranscriptIds.has(transcript.id);

              return (
                <div key={transcript.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-medium text-slate-800">{transcript.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(transcript.meeting_date)} | {transcript.source ?? "Source pending"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Uploaded by {transcript.created_by_email ?? "Unknown"} on{" "}
                        {transcript.created_at ? new Date(transcript.created_at).toLocaleDateString() : "Unknown date"}
                      </p>
                      {transcript.participants ? (
                        <p className="text-sm text-slate-600">Participants: {transcript.participants}</p>
                      ) : null}
                      {transcript.notes ? <p className="text-sm text-slate-600">{transcript.notes}</p> : null}
                      {transcript.transcript_text ? (
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                          {transcript.transcript_text.length > 420
                            ? `${transcript.transcript_text.slice(0, 420)}...`
                            : transcript.transcript_text}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            indexed ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {indexed ? "Indexed" : "Needs indexing"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getTranscriptionStatusClasses(
                            transcript.transcription_status
                          )}`}
                        >
                          {getTranscriptionStatusLabel(transcript.transcription_status)}
                        </span>
                      </div>
                      {transcript.transcription_error ? (
                        <p className="text-sm text-rose-700">{transcript.transcription_error}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {transcript.audio_file_path ? (
                          <Link
                            href={`/api/transcripts/${transcript.id}/download?kind=audio`}
                            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
                          >
                            Open audio
                          </Link>
                        ) : null}
                        {transcript.transcript_file_path ? (
                          <Link
                            href={`/api/transcripts/${transcript.id}/download?kind=transcript`}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Open transcript file
                          </Link>
                        ) : null}
                        {transcript.audio_file_path &&
                        (transcript.transcription_status === "audio_uploaded" ||
                          transcript.transcription_status === "failed" ||
                          !transcript.transcript_text) ? (
                          <form action={transcribeMeetingAudio.bind(null, projectId, transcript.id)}>
                            <button
                              type="submit"
                              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
                            >
                              {transcript.transcription_status === "failed" ? "Retry transcription" : "Transcribe audio"}
                            </button>
                          </form>
                        ) : null}
                        <form action={ingestTranscriptForAssistant.bind(null, projectId, transcript.id)}>
                          <button
                            type="submit"
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Index for assistant
                          </button>
                        </form>
                      </div>
                    </div>
                    {canDelete ? (
                      <form action={deleteMeetingTranscript.bind(null, projectId, transcript.id)}>
                        <DeleteButton label="Delete" />
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
