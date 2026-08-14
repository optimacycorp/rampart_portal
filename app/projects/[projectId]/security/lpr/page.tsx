import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug } from "@/lib/documents";
import { getLprCamerasByProjectSlug, getLprDailyStatsByProjectSlug, getLprEventsByProjectSlug, getLprKnownVehiclesByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default async function LprPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, cameras, events, stats, knownVehicles] = await Promise.all([
    getProjectBySlug(projectId),
    getLprCamerasByProjectSlug(projectId),
    getLprEventsByProjectSlug(projectId, 10),
    getLprDailyStatsByProjectSlug(projectId, 7),
    getLprKnownVehiclesByProjectSlug(projectId)
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
  const reviewedEvents = events.filter((event) => event.review).length;
  const preservedEvents = events.filter((event) => event.preserved && !event.preserved.released_at).length;

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
        <MetricCard label="Known vehicles" value={`${knownVehicles.filter((vehicle) => vehicle.active).length}`} hint="Authorized, vendor, watchlist, and blocked registry entries" />
        <MetricCard label="Preserved events" value={`${preservedEvents}`} hint="Currently retained as explicit evidence records" />
        <MetricCard label="Reviewed / needs review" value={`${reviewedEvents} / ${Math.max(events.length - reviewedEvents, unknownVehicleCount)}`} hint="Workflow coverage for the current visible event set" />
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
              <h2 className="text-xl font-semibold text-ink">Sprint 3 privacy and review controls</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Known vehicles can now be registered as authorized, vendor, watchlist, or blocked so event triage is no longer just raw plate review.</li>
              <li>Owner and audit users can record per-event workflow decisions and link captures to known vehicles.</li>
              <li>Raw plate visibility is now intended to stay limited to owner or audit users while others see masked but still useful summaries.</li>
              <li>Preserved events and controlled exports complete the first retention-ready evidence workflow for site vehicle activity.</li>
            </ul>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Suggested camera POST fields</p>
              <p className="mt-2">
                <code className="rounded bg-white px-1 py-0.5 text-xs">camera_name</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">camera_id</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">observed_at</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">plate_text</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">confidence</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">direction</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">image_url</code>, <code className="rounded bg-white px-1 py-0.5 text-xs">latitude</code>, and <code className="rounded bg-white px-1 py-0.5 text-xs">longitude</code>.
              </p>
            </div>
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
              <Link href={`/projects/${projectId}/exports`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Open controlled exports
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
