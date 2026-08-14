import Link from "next/link";
import type { Route } from "next";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug } from "@/lib/documents";
import { getLprCamerasByProjectSlug, getLprDailyStatsByProjectSlug, getLprEventsByProjectSlug, getLprKnownVehiclesByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  if (!value) return "Not reported";
  return new Date(value).toLocaleString();
}

export default async function ProjectSecurityPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, cameras, events, stats, knownVehicles] = await Promise.all([
    getProjectBySlug(projectId),
    getLprCamerasByProjectSlug(projectId),
    getLprEventsByProjectSlug(projectId, { limit: 50 }),
    getLprDailyStatsByProjectSlug(projectId, 7),
    getLprKnownVehiclesByProjectSlug(projectId)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Road Security" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const activeCameras = cameras.filter((camera) => camera.active).length;
  const preservedEvents = events.filter((event) => event.preserved && !event.preserved.released_at).length;
  const flaggedEvents = events.filter((event) => event.review?.review_status === "flagged" || event.review?.review_status === "watchlist").length;
  const totalVehicles7d = stats.reduce((sum, stat) => sum + (stat.total_vehicles ?? 0), 0);
  const lastSeenAt = cameras
    .map((camera) => camera.last_seen_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const workspaceLinks = [
    {
      href: `/projects/${projectId}/security/lpr`,
      label: "LPR overview",
      description: "Camera health, ingest guidance, recent captures, and privacy-aware security posture."
    },
    {
      href: `/projects/${projectId}/security/lpr/events`,
      label: "Recent events",
      description: "Search plate reads, review matches, preserve evidence, and release retained events."
    },
    {
      href: `/projects/${projectId}/security/lpr/stats`,
      label: "Daily stats",
      description: "Traffic counts, camera activity, and time-based summaries for internal coordination."
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Road Security"
        title={`${project.name} road security`}
        description="Central entry point for LPR camera health, recent vehicle activity, preserved evidence, and privacy-aware traffic summaries."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Private use only:</strong> Security and LPR records should remain access-controlled, minimally retained, and governed separately from public-facing project evidence.
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active cameras" value={`${activeCameras}`} hint="Registered LPR devices currently marked active" />
        <MetricCard label="Recent events" value={`${events.length}`} hint="Most recent retained event rows loaded for this project" />
        <MetricCard label="Flagged / watchlist" value={`${flaggedEvents}`} hint="Events currently marked for closer review" />
        <MetricCard label="Preserved events" value={`${preservedEvents}`} hint="Explicitly retained for evidence continuity" />
        <MetricCard label="Vehicles in 7d" value={`${totalVehicles7d}`} hint="Summed from daily LPR stats records" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Security workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use this page as the top-level landing area for road-security workflows. The LPR subsystem remains the primary evidence and review tool, but it now has a dedicated parent route for navigation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {workspaceLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <h3 className="text-base font-semibold text-ink">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Current posture</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Known vehicles</p>
              <p className="mt-1">{knownVehicles.length} records in the access-control list.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Last camera activity</p>
              <p className="mt-1">{formatDateTime(lastSeenAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Recommended next step</p>
              <p className="mt-1">
                Open <strong>Recent events</strong> to review new reads, preserve important captures, and confirm that active cameras are checking in as expected.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
