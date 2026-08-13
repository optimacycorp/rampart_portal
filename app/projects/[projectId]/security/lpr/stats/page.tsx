import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug } from "@/lib/documents";
import { getLprDailyStatsByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default async function LprStatsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, stats] = await Promise.all([
    getProjectBySlug(projectId),
    getLprDailyStatsByProjectSlug(projectId, 14)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Security / LPR" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const vehicles14d = stats.reduce((sum, stat) => sum + (stat.total_vehicles ?? 0), 0);
  const unique14d = stats.reduce((sum, stat) => sum + (stat.unique_plates ?? 0), 0);
  const inbound14d = stats.reduce((sum, stat) => sum + (stat.inbound_count ?? 0), 0);
  const outbound14d = stats.reduce((sum, stat) => sum + (stat.outbound_count ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security / LPR"
        title={`${project.name} daily traffic stats`}
        description="Privacy-friendly vehicle activity summaries designed to remain useful for coordination without exposing raw plate events by default."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vehicles / 14 days" value={`${vehicles14d}`} hint="Summed daily vehicle counts" />
        <MetricCard label="Unique plates / 14 days" value={`${unique14d}`} hint="Privacy-aware uniqueness counts by day" />
        <MetricCard label="Inbound / 14 days" value={`${inbound14d}`} hint="Observed inbound movements" />
        <MetricCard label="Outbound / 14 days" value={`${outbound14d}`} hint="Observed outbound movements" />
      </section>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_1fr_1fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Date</span>
          <span>Total</span>
          <span>Unique</span>
          <span>In / Out</span>
          <span>First vehicle</span>
          <span>Last vehicle</span>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-600">No daily LPR statistics are stored yet.</div>
          ) : (
            stats.map((stat) => (
              <div key={stat.id} className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_1fr_1fr] gap-4 px-5 py-4 text-sm text-slate-700">
                <span>{stat.stat_date}</span>
                <span>{stat.total_vehicles ?? 0}</span>
                <span>{stat.unique_plates ?? 0}</span>
                <span>
                  {(stat.inbound_count ?? 0)} / {(stat.outbound_count ?? 0)}
                </span>
                <span>{formatDateTime(stat.first_vehicle_at)}</span>
                <span>{formatDateTime(stat.last_vehicle_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
