import Link from "next/link";
import { deleteFieldPoint } from "@/app/projects/[projectId]/field-points/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function FieldPointsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string; batch?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [{ user, role }, fieldPoints] = await Promise.all([getCurrentUserContext(), getFieldPointsByProjectSlug(projectId)]);
  const batchOptions = Array.from(
    new Set(fieldPoints.map((point) => point.import_batch_name).filter((value): value is string => Boolean(value)))
  ).sort();
  const filteredPoints = query.batch
    ? fieldPoints.filter((point) => point.import_batch_name === query.batch)
    : fieldPoints;
  const visiblePoints = filteredPoints.slice(0, 10);
  const hiddenPoints = filteredPoints.slice(10);

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
      {batchOptions.length > 0 ? (
        <form className="flex items-center gap-3" method="get">
          <label className="text-sm font-medium text-slate-700" htmlFor="batch">
            Import batch
          </label>
          <select
            id="batch"
            name="batch"
            defaultValue={query.batch ?? ""}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-pine"
          >
            <option value="">All batches</option>
            {batchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
          {query.batch ? (
            <Link href={`/projects/${projectId}/field-points`} className="text-sm font-medium text-pine">
              Clear
            </Link>
          ) : null}
        </form>
      ) : null}
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
          Only the uploader or an audit user can delete imported field points.
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-card">
        <div className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.9fr_1.2fr_1.2fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Point Name</span>
          <span>Type</span>
          <span>Easting</span>
          <span>Northing</span>
          <span>Elevation</span>
          <span>Collected</span>
          <span>Uploaded</span>
          <span>Uploader</span>
        </div>
        {filteredPoints.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No field points have been imported yet.</div>
        ) : null}
        {visiblePoints.map((point) => {
          const canDelete = role === "audit" || (Boolean(user) && point.uploaded_by_user_id === user?.id);

          return (
            <div
              key={point.id}
              className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.9fr_1.2fr_1.2fr_1.2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700"
            >
              <div>
                <div className="font-medium text-slate-800">{point.point_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {(point.import_batch_name ?? "Unnamed batch")} • {point.import_source_file ?? "Manual import"}
                </div>
              </div>
              <span>{point.point_type}</span>
              <span>{point.easting ?? "—"}</span>
              <span>{point.northing ?? "—"}</span>
              <span>{point.elevation ?? "—"}</span>
              <span>{formatDate(point.collected_at)}</span>
              <span>{formatDate(point.created_at)}</span>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-600">{point.uploaded_by_email ?? "Unknown"}</span>
                {canDelete ? (
                  <form action={deleteFieldPoint.bind(null, projectId, point.id)}>
                    <DeleteButton label="Delete" />
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {hiddenPoints.length > 0 ? (
        <details className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-card">
          <summary className="cursor-pointer text-sm font-semibold text-pine">
            More points: expand or collapse {hiddenPoints.length} additional rows
          </summary>
          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200">
            {hiddenPoints.map((point) => {
              const canDelete = role === "audit" || (Boolean(user) && point.uploaded_by_user_id === user?.id);

              return (
                <div
                  key={point.id}
                  className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.9fr_1.2fr_1.2fr_1.2fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-slate-800">{point.point_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {(point.import_batch_name ?? "Unnamed batch")} • {point.import_source_file ?? "Manual import"}
                    </div>
                  </div>
                  <span>{point.point_type}</span>
                  <span>{point.easting ?? "—"}</span>
                  <span>{point.northing ?? "—"}</span>
                  <span>{point.elevation ?? "—"}</span>
                  <span>{formatDate(point.collected_at)}</span>
                  <span>{formatDate(point.created_at)}</span>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">{point.uploaded_by_email ?? "Unknown"}</span>
                    {canDelete ? (
                      <form action={deleteFieldPoint.bind(null, projectId, point.id)}>
                        <DeleteButton label="Delete" />
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
