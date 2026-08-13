import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug } from "@/lib/documents";
import { getLprCamerasByProjectSlug, getLprDailyStatsByProjectSlug, getLprEventsByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default async function LprPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, cameras, events, stats] = await Promise.all([
    getProjectBySlug(projectId),
    getLprCamerasByProjectSlug(projectId),
    getLprEventsByProjectSlug(projectId, 10),
    getLprDailyStatsByProjectSlug(projectId, 7)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Security / LPR" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const todayStats = stats[0] ?? null;
  const vehicles7d = stats.reduce((sum, stat) => sum + (stat.total_vehicles ?? 0), 0);
  const unknownVehicleCount = events.filter((event) => !event.plate_text || (event.plate_confidence ?? 0) < 0.8).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security / LPR"
        title={`${project.name} vehicle activity`}
        description="Private, authenticated LPR workspace for camera health, recent captures, and privacy-aware traffic summaries. Coordination and security use only."
      />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Private use only:</strong> LPR records should remain restricted, minimally retained, and separately governed from public-facing project evidence. This module is for internal coordination, site security, and preserved evidence workflows only.
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active cameras" value={`${cameras.filter((camera) => camera.active).length}`} hint="Registered LPR devices currently marked active" />
        <MetricCard label="Vehicles today" value={`${todayStats?.total_vehicles ?? 0}`} hint="Privacy-friendly daily traffic count" />
        <MetricCard label="Vehicles last 7 days" value={`${vehicles7d}`} hint="Aggregated count from retained daily stats" />
        <MetricCard label="Recent captures" value={`${events.length}`} hint="Latest visible event rows in the portal" />
        <MetricCard label="Needs review" value={`${unknownVehicleCount}`} hint="Fallback proxy for uncertain or incomplete recent recognition events" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Camera library</h2>
              <p className="mt-2 text-sm text-slate-600">Sprint 1 establishes the register for solar LPR cameras, power budgets, network path, and last-seen telemetry.</p>
            </div>
            <span className="text-sm text-slate-500">{cameras.length} cameras</span>
          </div>
          <div className="mt-5 space-y-4">
            {cameras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No LPR cameras have been registered yet.
              </div>
            ) : (
              cameras.map((camera) => (
                <article key={camera.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{camera.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {camera.manufacturer ?? "Manufacturer pending"} {camera.model ?? ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${camera.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>
                      {camera.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Connectivity: {camera.connectivity ?? "Pending"}</p>
                    <p>Power: {camera.power_source ?? "Pending"}</p>
                    <p>Solar / Battery: {camera.solar_panel_watts ?? "?"} W / {camera.battery_wh ?? "?"} Wh</p>
                    <p>Last seen: {formatDateTime(camera.last_seen_at)}</p>
                    <p>Facing: {camera.direction_facing ?? "Pending"}</p>
                    <p>Location: {camera.install_location ?? "Pending"}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Sprint 1 delivered</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>LPR foundation schema is now in place for cameras, raw events, and privacy-friendly daily stats.</li>
              <li>The portal now has a dedicated Security / LPR workspace instead of burying vehicle activity inside general evidence records.</li>
              <li>Future sprints can now add Milesight ingest, retention controls, known vehicles, audit logging, and evidence preservation without reshaping the foundation.</li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Views</h2>
            <div className="mt-4 grid gap-3">
              <Link href={`/projects/${projectId}/security/lpr/events`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Open recent LPR events
              </Link>
              <Link href={`/projects/${projectId}/security/lpr/stats`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Open daily traffic stats
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
