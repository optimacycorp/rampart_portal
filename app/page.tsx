import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { ProjectAssistant } from "@/components/ProjectAssistant";
import { seededFieldPoints, seededProject, seededReviewerComments } from "@/lib/mock-data";

const metrics = [
  {
    label: "Open reviewer comments",
    value: `${seededReviewerComments.filter((item) => item.status !== "resolved").length}`,
    hint: "Current active coordination items"
  },
  {
    label: "Critical comments",
    value: `${seededReviewerComments.filter((item) => item.priority === "critical").length}`,
    hint: "Highest priority follow-up"
  },
  {
    label: "Documents uploaded",
    value: "12",
    hint: "Placeholder count until Supabase documents are connected"
  },
  {
    label: "Field points collected",
    value: `${seededFieldPoints.length}`,
    hint: "Seeded Emlid-ready examples"
  },
  {
    label: "Culverts logged",
    value: "1",
    hint: "Register route prepared for Sprint 1"
  },
  {
    label: "Access log entries",
    value: "4",
    hint: "Initial route scaffold for road and gate observations"
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Evidence portal overview"
        description="Track project evidence in one place so planning, drainage, access, and field coordination work from the same record set."
      />
      <ProjectAssistant
        embedded
        projectSlug={seededProject.slug}
        title="Project Analysis"
        description="Ask status and evidence questions here and get linked, coordination-only answers grounded in project records."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Recent uploads</h2>
          <div className="mt-4 space-y-3">
            {[
              "Access Exhibit Index",
              "Drainage Observation Log",
              "USFS Coordination Notes",
              "Photo Station Set 01"
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{item}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Uploaded</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-pine to-ink p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">Primary project</p>
          <h2 className="mt-3 text-2xl font-semibold">{seededProject.name}</h2>
          <p className="mt-3 text-sm leading-6 text-white/80">{seededProject.description}</p>
          <div className="mt-6 space-y-2 text-sm text-white/80">
            <p>Parcel: {seededProject.parcel_number}</p>
            <p>{seededProject.address}</p>
            <p>{seededProject.county}, {seededProject.state}</p>
          </div>
          <Link
            href={`/projects/${seededProject.slug}`}
            className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            Open project workspace
          </Link>
        </div>
      </section>
    </div>
  );
}
