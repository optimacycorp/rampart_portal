import Link from "next/link";
import type { Route } from "next";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { seededProject, seededReviewerComments } from "@/lib/mock-data";

const projectLinks = [
  { href: "documents", label: "Documents", hint: "Upload and organize recorded instruments and reports." },
  { href: "comments", label: "Reviewer Comments", hint: "Track city, utility, fire, and USFS review items." },
  { href: "map", label: "Field Evidence Map", hint: "Preview field points and map-ready evidence layers." },
  { href: "field-points", label: "Field Points", hint: "Import and validate Emlid or survey-adjacent GPS points." },
  { href: "culverts", label: "Culverts", hint: "Register culvert assets with inlet and outlet references." },
  { href: "access-log", label: "Access Log", hint: "Capture FS 0300 road, gate, and access observations." },
  { href: "transcripts", label: "Meeting Transcripts", hint: "Store meeting audio, transcript files, and pasted transcript text." },
  { href: "photos", label: "Photo Library", hint: "Store categorized evidence photography and linked stations." },
  { href: "exports", label: "Exports", hint: "Prepare lightweight coordination reports and record bundles." }
];

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Project Workspace"
        title={seededProject.name}
        description={seededProject.description}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Reviewer applications" value="4" hint="Seeded application reference list" />
        <MetricCard
          label="Open comments"
          value={`${seededReviewerComments.filter((item) => item.status !== "resolved").length}`}
          hint="Editable matrix scaffolded in Sprint 1"
        />
        <MetricCard label="Storage buckets" value="4" hint="project-documents, field-photos, lidar-scans, exports" />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {projectLinks.map((item) => (
          <Link
            key={item.href}
            href={`/projects/${projectId}/${item.href}` as Route}
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card transition hover:-translate-y-0.5 hover:bg-white"
          >
            <h2 className="text-lg font-semibold text-ink">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.hint}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
