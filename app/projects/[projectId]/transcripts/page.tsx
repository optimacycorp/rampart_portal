import Link from "next/link";
import { deleteMeetingTranscript, uploadMeetingTranscript } from "@/app/projects/[projectId]/transcripts/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MeetingTranscriptUploadForm } from "@/components/MeetingTranscriptUploadForm";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getMeetingTranscriptsByProjectSlug } from "@/lib/meeting-transcripts";
import { getProjectBySlug } from "@/lib/documents";

const feedbackText: Record<string, string> = {
  uploaded: "Meeting transcript uploaded.",
  deleted: "Meeting transcript deleted.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields":
    "A meeting title is required, plus at least one of audio upload, transcript file upload, or transcript text.",
  "storage-upload-failed": "The meeting media file could not be uploaded to storage.",
  "save-failed": "The meeting transcript record could not be saved.",
  forbidden: "Only the uploader or an audit user can delete uploaded transcript records.",
  "delete-failed": "The meeting transcript could not be deleted.",
  "transcript-not-found": "The requested transcript record could not be found."
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No date";
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
  const [{ user, role }, project, transcripts] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getMeetingTranscriptsByProjectSlug(projectId)
  ]);

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
