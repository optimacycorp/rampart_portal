import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug } from "@/lib/documents";
import { getLprCamerasByProjectSlug, getLprEventsByProjectSlug } from "@/lib/lpr";

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export default async function LprEventsPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, cameras, events] = await Promise.all([
    getProjectBySlug(projectId),
    getLprCamerasByProjectSlug(projectId),
    getLprEventsByProjectSlug(projectId, 50)
  ]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Security / LPR" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security / LPR"
        title={`${project.name} recent LPR events`}
        description="Private capture stream for portal-managed vehicle activity. Later sprints will add camera-authenticated ingest, evidence preservation, and controlled export."
      />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Retention note:</strong> Use identifiable plate events conservatively. The long-term target is short default retention for raw events and longer retention only for anonymized statistics or explicitly preserved evidence.
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-[1.15fr_0.85fr_0.8fr_0.8fr_0.9fr_1.2fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Observed</span>
          <span>Camera</span>
          <span>Plate</span>
          <span>Confidence</span>
          <span>Direction</span>
          <span>Vehicle</span>
        </div>
        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-600">No LPR events are stored yet.</div>
          ) : (
            events.map((event) => {
              const camera = cameraMap.get(event.camera_id);
              return (
                <div key={event.id} className="grid grid-cols-[1.15fr_0.85fr_0.8fr_0.8fr_0.9fr_1.2fr] gap-4 px-5 py-4 text-sm text-slate-700">
                  <span>{formatDateTime(event.observed_at)}</span>
                  <span>{camera?.name ?? event.camera_id}</span>
                  <span>{event.plate_text ?? "Unread / hidden"}</span>
                  <span>{event.plate_confidence != null ? `${Math.round(event.plate_confidence * 100)}%` : "Unknown"}</span>
                  <span>{event.direction ?? "Unknown"}</span>
                  <span>{[event.vehicle_make, event.vehicle_model, event.vehicle_color, event.vehicle_type].filter(Boolean).join(" ") || "Unknown vehicle"}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
