import Link from "next/link";
import { deleteFieldPoint } from "@/app/projects/[projectId]/field-points/actions";
import { canManageUploads } from "@/lib/auth-server";
import { DeleteButton } from "@/components/DeleteButton";
import { PageHeader } from "@/components/PageHeader";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";

export default async function FieldPointsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [fieldPoints, canDelete] = await Promise.all([getFieldPointsByProjectSlug(projectId), canManageUploads()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Field Points"
        title="Imported GPS and observation points"
        description="Use this workspace for survey-adjacent field evidence, control references, culvert observations, gates, berms, and photo stations."
      />
      <div className="flex justify-end">
        <Link
          href={`/projects/${projectId}/field-points/import`}
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
        >
          Import CSV
        </Link>
      </div>
      {query.status === "imported" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Field points imported successfully.
        </div>
      ) : null}
      {query.status === "deleted" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Field point deleted.
        </div>
      ) : null}
      {query.error === "forbidden" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          Only owner or audit roles can delete imported field points.
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Point Name</span>
          <span>Type</span>
          <span>Easting</span>
          <span>Northing</span>
          <span>Elevation</span>
          <span>Confidence</span>
          <span>Collected</span>
        </div>
        {fieldPoints.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No field points have been imported yet.</div>
        ) : null}
        {fieldPoints.map((point) => (
          <div key={point.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1.2fr] gap-4 px-5 py-4 text-sm text-slate-700">
            <span>{point.point_name}</span>
            <span>{point.point_type}</span>
            <span>{point.easting ?? "—"}</span>
            <span>{point.northing ?? "—"}</span>
            <span>{point.elevation ?? "—"}</span>
            <span>{point.confidence}</span>
            <div className="flex items-center justify-between gap-3">
              <span>{point.collected_at ? new Date(point.collected_at).toLocaleDateString() : "—"}</span>
              {canDelete ? (
                <form action={deleteFieldPoint.bind(null, projectId, point.id)}>
                  <DeleteButton label="Delete" />
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
