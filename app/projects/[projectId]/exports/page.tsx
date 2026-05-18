import Link from "next/link";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getEvidencePhotosByProjectSlug } from "@/lib/evidence-photos";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { getMeetingTranscriptsByProjectSlug } from "@/lib/meeting-transcripts";
import { getProjectTasksByProjectSlug } from "@/lib/project-tasks";
import { getReviewerCommentsByProjectSlug } from "@/lib/reviewer-comments";

const exportCards = [
  {
    kind: "document-index",
    title: "Document Index CSV",
    description: "Document title, type, version, record metadata, source agency, uploader, and notes."
  },
  {
    kind: "reviewer-comments",
    title: "Reviewer Comment Matrix CSV",
    description: "Application items, departments, priorities, status, responsible parties, and linked documents."
  },
  {
    kind: "field-evidence-summary",
    title: "Field Evidence Summary",
    description: "Markdown summary of field points, culverts, access logs, photo evidence, transcripts, and open tasks."
  }
] as const;

export default async function ExportsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, documents, comments, fieldPoints, accessLogs, photos, tasks, transcripts] = await Promise.all([
    getProjectBySlug(projectId),
    getDocumentsByProjectSlug(projectId),
    getReviewerCommentsByProjectSlug(projectId),
    getFieldPointsByProjectSlug(projectId),
    getAccessLogsByProjectSlug(projectId),
    getEvidencePhotosByProjectSlug(projectId),
    getProjectTasksByProjectSlug(projectId),
    getMeetingTranscriptsByProjectSlug(projectId)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Exports"
          title="Project not found"
          description="The requested project slug does not exist in the current dataset."
        />
      </div>
    );
  }

  const culverts = await getCulvertsByProjectId(project.id);
  const openComments = comments.filter((comment) => comment.status !== "resolved");
  const openTasks = tasks.filter((task) => task.status !== "resolved" && task.status !== "closed");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exports"
        title={`${project.name} coordination exports`}
        description="Prepare simple coordination bundles and evidence summaries without turning the portal into a final opinion or determination engine."
      />
      <DisclaimerBanner />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Documents</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{documents.length}</p>
          <p className="mt-2 text-sm text-slate-600">Records available for export indexing.</p>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Open Comments</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{openComments.length}</p>
          <p className="mt-2 text-sm text-slate-600">Active review items included in comment exports.</p>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Field Evidence</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{fieldPoints.length + culverts.length + photos.length}</p>
          <p className="mt-2 text-sm text-slate-600">Points, culverts, and photos summarized together.</p>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Coordination Records</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{accessLogs.length + transcripts.length + openTasks.length}</p>
          <p className="mt-2 text-sm text-slate-600">Access logs, transcripts, and active tasks in summary exports.</p>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {exportCards.map((card) => (
          <article key={card.kind} className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Download export</p>
            <h2 className="mt-3 text-xl font-semibold text-ink">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
            <Link
              href={`/api/exports/${card.kind}?projectId=${project.slug}`}
              className="mt-6 inline-flex rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
            >
              Download
            </Link>
          </article>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">What the field evidence summary includes</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <p>Open reviewer comments with departments, priorities, and responsible parties.</p>
            <p>Field points with collection dates and confidence levels.</p>
            <p>Culverts, access logs, photo evidence, meeting transcripts, and active project tasks.</p>
            <p>The export is intentionally a coordination summary, not a legal, surveying, engineering, or approval conclusion.</p>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-slate-900 p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Current export snapshot</p>
          <div className="mt-4 space-y-3 text-sm text-white/85">
            <p>{documents.length} documents in the current index.</p>
            <p>{openComments.length} open reviewer comments ready for matrix export.</p>
            <p>{fieldPoints.length} field points, {culverts.length} culverts, and {photos.length} photo records in the field summary.</p>
            <p>{accessLogs.length} access logs, {transcripts.length} meeting transcripts, and {openTasks.length} active tasks included in the coordination summary.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
