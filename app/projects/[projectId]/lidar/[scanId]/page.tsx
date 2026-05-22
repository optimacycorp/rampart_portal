import Link from "next/link";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { PotreeViewer } from "@/components/PotreeViewer";
import { LIDAR_DISCLAIMER } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getLidarScanById } from "@/lib/lidar";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No scan date";
}

export default async function LidarScanDetailPage({
  params
}: {
  params: Promise<{ projectId: string; scanId: string }>;
}) {
  const { projectId, scanId } = await params;
  const [project, scan] = await Promise.all([getProjectBySlug(projectId), getLidarScanById(scanId)]);

  if (!project || !scan) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="LiDAR" title="Scan not found" description="The requested LiDAR scan record could not be found." />
      </div>
    );
  }

  const metadataRows = [
    `Scan date: ${formatDate(scan.scan_date)}`,
    `Equipment: ${scan.equipment ?? "Unknown"}`,
    `Coordinate system: ${scan.coordinate_system ?? "Unknown"}`,
    `Center easting: ${scan.center_easting ?? "Unknown"}`,
    `Center northing: ${scan.center_northing ?? "Unknown"}`,
    `Center elevation: ${scan.center_elevation ?? "Unknown"}`,
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
            <h2 className="text-lg font-semibold text-ink">Selection / linked stats</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use Potree tools to inspect coordinates, profiles, clipping, and elevation changes. Record linked GPS control, culverts, berms, and photos in the scan notes for this MVP.
            </p>
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
        </aside>
      </div>
    </div>
  );
}
