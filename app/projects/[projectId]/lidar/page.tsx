import Link from "next/link";
import { createLidarScan } from "@/app/projects/[projectId]/lidar/actions";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { LidarScanForm } from "@/components/LidarScanForm";
import { PageHeader } from "@/components/PageHeader";
import { LIDAR_DISCLAIMER } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getLidarScansByProjectSlug } from "@/lib/lidar";

const feedbackText: Record<string, string> = {
  created: "LiDAR scan metadata saved.",
  deleted: "LiDAR scan deleted.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields": "Scan title is required.",
  forbidden: "Only the uploader or an audit user can manage LiDAR scan records.",
  "scan-not-found": "The requested LiDAR scan record could not be found.",
  "lidar-save-failed": "The LiDAR scan metadata could not be saved.",
  "lidar-delete-failed": "The LiDAR scan could not be deleted."
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No scan date";
}

export default async function LidarPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [project, scans] = await Promise.all([getProjectBySlug(projectId), getLidarScansByProjectSlug(projectId)]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="LiDAR" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  const action = createLidarScan.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="LiDAR"
        title={`${project.name} LiDAR scan library`}
        description="Register Eagle Max or other point cloud scans as large external assets with lightweight metadata, preview imagery, and Potree-ready tile paths."
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
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Register a LiDAR scan</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save lightweight scan metadata and object-storage paths for raw archives, Potree tiles, and preview images. Use this register for processed point cloud deliverables that are too large to treat like normal uploads.
          </p>
          <div className="mt-5">
            <LidarScanForm action={action} />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Scan library</h2>
              <p className="mt-2 text-sm text-slate-600">Open a scan to inspect metadata, preview imagery, and launch the Potree viewer.</p>
            </div>
            <span className="text-sm text-slate-500">{scans.length} scans</span>
          </div>
          <div className="mt-5 space-y-4">
            {scans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No LiDAR scans have been registered yet.
              </div>
            ) : null}
            {scans.map((scan) => (
              <article key={scan.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                {scan.preview_image_path ? (
                  <div className="bg-slate-100">
                    <img
                      src={scan.preview_image_path}
                      alt={scan.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
                    Preview image not provided
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-800">{scan.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(scan.scan_date)} | {scan.equipment ?? "Equipment pending"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {(scan.status ?? "registered").replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {(scan.processing_stage ?? "raw_uploaded").replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {(scan.tile_format ?? "potree").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Link href={`/projects/${projectId}/lidar/${scan.id}`} className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white">
                      Open scan
                    </Link>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Point count: {scan.point_count?.toLocaleString() ?? "Unknown"}</p>
                    <p>Area acres: {scan.area_acres ?? "Unknown"}</p>
                    <p>Min / Max elev: {scan.min_elevation ?? "?"} / {scan.max_elevation ?? "?"}</p>
                    <p>Center elev: {scan.center_elevation ?? "Unknown"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scan.tile_path ? (
                      <a
                        href={scan.tile_path}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Tile path
                      </a>
                    ) : null}
                    {scan.raw_file_path ? (
                      <a
                        href={scan.raw_file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
                      >
                        Raw archive
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
