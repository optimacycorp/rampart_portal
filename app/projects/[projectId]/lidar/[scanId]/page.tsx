import Link from "next/link";
import { deleteLidarScan, updateLidarScan } from "@/app/projects/[projectId]/lidar/actions";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { FormActionButton } from "@/components/FormActionButton";
import { LidarScanInsetMap } from "@/components/LidarScanInsetMap";
import { LidarScanForm } from "@/components/LidarScanForm";
import { PageHeader } from "@/components/PageHeader";
import { PotreeViewer } from "@/components/PotreeViewer";
import { getCurrentUserContext } from "@/lib/auth-server";
import { LIDAR_DISCLAIMER } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getLidarScanById, getNearbyFieldPointsForLidarScan } from "@/lib/lidar";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No scan date";
}

export default async function LidarScanDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string; scanId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId, scanId } = await params;
  const query = await searchParams;
  const [project, scan, { user, role }] = await Promise.all([
    getProjectBySlug(projectId),
    getLidarScanById(scanId),
    getCurrentUserContext()
  ]);

  if (!project || !scan) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="LiDAR" title="Scan not found" description="The requested LiDAR scan record could not be found." />
      </div>
    );
  }

  const nearbyFieldPoints = await getNearbyFieldPointsForLidarScan(projectId, scan, 8);
  const canManage = role === "audit" || (Boolean(user) && scan.created_by_user_id === user?.id);
  const updateAction = updateLidarScan.bind(null, projectId, scanId);

  const feedbackText: Record<string, string> = {
    updated: "LiDAR scan metadata updated.",
    forbidden: "Only the uploader or an audit user can manage LiDAR scan records.",
    "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
    "scan-not-found": "The requested LiDAR scan record could not be found.",
    "missing-required-fields": "Scan title is required.",
    "lidar-save-failed": "The LiDAR scan metadata could not be saved."
  };

  const metadataRows = [
    `Status: ${scan.status ?? "registered"}`,
    `Processing stage: ${scan.processing_stage ?? "raw_uploaded"}`,
    `Tile format: ${scan.tile_format ?? "potree"}`,
    `Scan date: ${formatDate(scan.scan_date)}`,
    `Equipment: ${scan.equipment ?? "Unknown"}`,
    `Coordinate system: ${scan.coordinate_system ?? "Unknown"}`,
    `Center easting: ${scan.center_easting ?? "Unknown"}`,
    `Center northing: ${scan.center_northing ?? "Unknown"}`,
    `Center elevation: ${scan.center_elevation ?? "Unknown"}`,
    `Center latitude: ${scan.center_latitude ?? "Unknown"}`,
    `Center longitude: ${scan.center_longitude ?? "Unknown"}`,
    `Point count: ${scan.point_count?.toLocaleString() ?? "Unknown"}`,
    `Area acres: ${scan.area_acres ?? "Unknown"}`,
    `Min elevation: ${scan.min_elevation ?? "Unknown"}`,
    `Max elevation: ${scan.max_elevation ?? "Unknown"}`
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="LiDAR Detail"
        title={scan.title}
        description="Review scan metadata, open raw or tiled assets, and inspect the point cloud in a Potree-ready viewer."
      />
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>LiDAR coordination notice:</strong> {LIDAR_DISCLAIMER}
      </div>
      <DisclaimerBanner />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedbackText[query.status]}</div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{feedbackText[query.error]}</div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[0.32fr_1fr_0.36fr]">
        <aside className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-ink">Scan metadata</h2>
            <p className="mt-2 text-sm text-slate-600">Stored as coordination evidence metadata with external object-storage links.</p>
          </div>
          <div className="space-y-3">
            {metadataRows.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Uploaded by {scan.created_by_email ?? "Unknown"}<br />
            Created {new Date(scan.created_at).toLocaleString()}
            {scan.updated_at ? ` • Updated ${new Date(scan.updated_at).toLocaleString()}` : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {scan.raw_file_path ? (
              <a href={scan.raw_file_path} target="_blank" rel="noreferrer" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Raw archive
              </a>
            ) : null}
            {scan.tile_path ? (
              <a href={scan.tile_path} target="_blank" rel="noreferrer" className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white">
                Tile path
              </a>
            ) : null}
          </div>
          {canManage ? (
            <form action={deleteLidarScan.bind(null, projectId, scanId)}>
              <FormActionButton
                idleLabel="Delete scan"
                pendingLabel="Deleting..."
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          ) : (
            <p className="text-sm text-slate-500">Only the uploader or an audit user can edit or delete this scan.</p>
          )}
          <Link href={`/projects/${projectId}/lidar`} className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            Back to scan library
          </Link>
        </aside>
        <main className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">Potree point cloud viewer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Load a Potree <code>cloud.js</code> or accessible point tile URL to navigate the scan in-browser. This is intended for coordination review rather than certified measurements.
            </p>
          </div>
          <PotreeViewer tilePath={scan.tile_path} title={scan.title} />
        </main>
        <aside className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-card">
          <div>
            <h2 className="text-lg font-semibold text-ink">Context / linked evidence</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use Potree tools to inspect coordinates, profiles, clipping, and elevation changes. The inset map and nearby field points below give this scan practical site context for coordination review.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Inset map / footprint</h3>
            <LidarScanInsetMap
              centerLatitude={scan.center_latitude}
              centerLongitude={scan.center_longitude}
              bboxWest={scan.bbox_west}
              bboxSouth={scan.bbox_south}
              bboxEast={scan.bbox_east}
              bboxNorth={scan.bbox_north}
              title={scan.title}
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Nearby field points</h3>
            <div className="space-y-3">
              {nearbyFieldPoints.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                  No nearby field points could be linked automatically yet. Add center easting, northing, and matching coordinate system metadata to compare LiDAR scans against imported GPS points.
                </div>
              ) : (
                nearbyFieldPoints.map((point) => (
                  <div key={point.id} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{point.point_name}</p>
                        <p className="mt-1 text-slate-500">
                          {point.point_type} | {point.confidence}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {(point.distanceFromCenter as number).toFixed(1)} ft
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">
                      Elevation: {point.elevation ?? "Unknown"} | Easting: {point.easting ?? "Unknown"} | Northing: {point.northing ?? "Unknown"}
                    </p>
                    {point.description ? <p className="mt-2 text-slate-600">{point.description}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
            {scan.notes ?? "No LiDAR scan notes entered yet."}
          </div>
          {scan.preview_image_path ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <img src={scan.preview_image_path} alt={`${scan.title} preview`} className="w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No preview image provided.
            </div>
          )}
          {canManage ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">Edit LiDAR metadata</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Update scan status, processing stage, map-ready footprint values, and external asset links without re-registering the scan.
              </p>
              <div className="mt-5">
                <LidarScanForm
                  action={updateAction}
                  initialValues={scan}
                  submitLabel="Save LiDAR updates"
                />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
