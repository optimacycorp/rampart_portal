import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { ProjectAssistant } from "@/components/ProjectAssistant";
import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { getAssistantIndexStatusByProjectSlug } from "@/lib/document-chunks";
import { getDocumentsByProjectSlug, getProjectBySlug } from "@/lib/documents";
import { getEvidencePhotosByProjectSlug } from "@/lib/evidence-photos";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { getMeetingTranscriptsByProjectSlug } from "@/lib/meeting-transcripts";
import { getReviewerCommentsByProjectSlug } from "@/lib/reviewer-comments";

const PRIMARY_PROJECT_SLUG = "3245-rampart-range-road";

type RecentUpload = {
  id: string;
  label: string;
  href: string;
  typeLabel: string;
  createdAt: string | undefined;
};

function asRecentUploads(projectSlug: string, uploads: RecentUpload[]) {
  return uploads
    .filter((item) => item.createdAt)
    .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
    .slice(0, 6);
}

export default async function DashboardPage() {
  const project = await getProjectBySlug(PRIMARY_PROJECT_SLUG);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Dashboard"
          title="Evidence portal overview"
          description="The primary project record could not be found."
        />
      </div>
    );
  }

  const [documents, comments, fieldPoints, accessLogs, photos, transcripts, assistantIndex] = await Promise.all([
    getDocumentsByProjectSlug(project.slug),
    getReviewerCommentsByProjectSlug(project.slug),
    getFieldPointsByProjectSlug(project.slug),
    getAccessLogsByProjectSlug(project.slug),
    getEvidencePhotosByProjectSlug(project.slug),
    getMeetingTranscriptsByProjectSlug(project.slug),
    getAssistantIndexStatusByProjectSlug(project.slug)
  ]);

  const culverts = await getCulvertsByProjectId(project.id);
  const openComments = comments.filter((item) => item.status !== "resolved");
  const criticalComments = comments.filter((item) => item.priority === "critical" && item.status !== "resolved");
  const needsIndexing =
    Math.max(documents.length - assistantIndex.indexedDocumentIds.size, 0) +
    Math.max(transcripts.length - assistantIndex.indexedTranscriptIds.size, 0);

  const metrics = [
    {
      label: "Open reviewer comments",
      value: `${openComments.length}`,
      hint: "Current active coordination items"
    },
    {
      label: "Critical comments",
      value: `${criticalComments.length}`,
      hint: "Highest priority follow-up"
    },
    {
      label: "Documents uploaded",
      value: `${documents.length}`,
      hint: "Current project document records"
    },
    {
      label: "Field points collected",
      value: `${fieldPoints.length}`,
      hint: "Imported field evidence records"
    },
    {
      label: "Culverts logged",
      value: `${culverts.length}`,
      hint: "Registered culvert records"
    },
    {
      label: "Access log entries",
      value: `${accessLogs.length}`,
      hint: "Road, gate, and access observations"
    },
    {
      label: "Photo evidence",
      value: `${photos.length}`,
      hint: "Stored project photo records"
    },
    {
      label: "Meeting transcripts",
      value: `${transcripts.length}`,
      hint: "Uploaded meeting audio and transcript records"
    },
    {
      label: "Indexed records",
      value: `${assistantIndex.indexedDocumentIds.size + assistantIndex.indexedTranscriptIds.size}`,
      hint: "Documents and transcripts searchable by the assistant"
    },
    {
      label: "Needs indexing",
      value: `${needsIndexing}`,
      hint: "Records still missing assistant search coverage"
    }
  ];

  const recentUploads = asRecentUploads(project.slug, [
    ...documents.map((document) => ({
      id: document.id,
      label: document.title,
      href: `/projects/${project.slug}/documents/${document.id}`,
      typeLabel: "Document",
      createdAt: document.created_at
    })),
    ...photos.map((photo) => ({
      id: photo.id,
      label: photo.title,
      href: `/projects/${project.slug}/photos`,
      typeLabel: "Photo",
      createdAt: photo.created_at
    })),
    ...transcripts.map((transcript) => ({
      id: transcript.id,
      label: transcript.title,
      href: `/projects/${project.slug}/transcripts`,
      typeLabel: "Transcript",
      createdAt: transcript.created_at
    }))
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Evidence portal overview"
        description="Track project evidence in one place so planning, drainage, access, and field coordination work from the same record set."
      />
      <ProjectAssistant
        embedded
        projectSlug={project.slug}
        title="Project Analysis"
        description="Ask status and evidence questions here and get linked, coordination-only answers grounded in project records."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Recent uploads</h2>
          <div className="mt-4 space-y-3">
            {recentUploads.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No recent uploads are available yet.
              </div>
            ) : null}
            {recentUploads.map((item) => (
              <Link
                key={`${item.typeLabel}-${item.id}`}
                href={item.href}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
              >
                <div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.typeLabel} | {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Unknown date"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.typeLabel}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-pine to-ink p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">Primary project</p>
          <h2 className="mt-3 text-2xl font-semibold">{project.name}</h2>
          <p className="mt-3 text-sm leading-6 text-white/80">{project.description}</p>
          <div className="mt-6 space-y-2 text-sm text-white/80">
            <p>Parcel: {project.parcel_number}</p>
            <p>{project.address}</p>
            <p>
              {project.county}, {project.state}
            </p>
          </div>
          <Link
            href={`/projects/${project.slug}`}
            className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            Open project workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
