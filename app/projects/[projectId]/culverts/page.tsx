import { createCulvert } from "@/app/projects/[projectId]/culverts/actions";
import { CulvertForm } from "@/components/CulvertForm";
import { PageHeader } from "@/components/PageHeader";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { getProjectBySlug } from "@/lib/documents";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";

const feedbackText: Record<string, string> = {
  saved: "Culvert record saved.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields": "Culvert ID, inlet point, and outlet point are required.",
  "point-not-found": "The selected inlet or outlet point could not be found.",
  "save-failed": "The culvert record could not be saved."
};

export default async function CulvertsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [project, fieldPoints] = await Promise.all([getProjectBySlug(projectId), getFieldPointsByProjectSlug(projectId)]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Culvert Register"
          title="Project not found"
          description="The requested project slug could not be found."
        />
      </div>
    );
  }

  const culverts = await getCulvertsByProjectId(project.id);
  const pointLookup = new Map(fieldPoints.map((point) => [point.id, point]));
  const action = createCulvert.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Culvert Register"
        title="Drainage asset register"
        description="Track culvert inlet and outlet points, dimensions, ownership, condition, and a slope calculation based on field elevations and length."
      />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {feedbackText[query.status]}
        </div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {feedbackText[query.error]}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Create culvert record</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use inlet and outlet field points to calculate slope automatically, or enter a manual override where
                field judgment is needed.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {fieldPoints.length} points available
            </span>
          </div>
          <div className="mt-5">
            <CulvertForm action={action} fieldPoints={fieldPoints} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-card">
            <h2 className="text-xl font-semibold">Slope calculation</h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              <code className="rounded bg-white/10 px-2 py-1">
                slope_percent = ((inlet_elevation - outlet_elevation) / length_feet) * 100
              </code>
            </p>
            <p className="mt-4 text-sm leading-6 text-white/80">
              Manual override remains available for situations where surveyed elevations, pipe length, or interpreted
              flow path require field judgment.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Registered culverts</h2>
                <p className="mt-2 text-sm text-slate-600">Most recent records appear first.</p>
              </div>
              <span className="text-sm text-slate-500">{culverts.length} culverts</span>
            </div>
            <div className="mt-4 space-y-3">
              {culverts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  No culvert records have been created yet.
                </div>
              ) : null}
              {culverts.map((culvert) => {
                const inletPoint = culvert.inlet_point_id ? pointLookup.get(culvert.inlet_point_id) : null;
                const outletPoint = culvert.outlet_point_id ? pointLookup.get(culvert.outlet_point_id) : null;

                return (
                  <div key={culvert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="font-medium text-slate-800">{culvert.culvert_id}</p>
                        <p className="text-sm text-slate-500">
                          {culvert.material ?? "unknown"} • {culvert.ownership ?? "unknown"} •{" "}
                          {culvert.length_feet != null ? `${culvert.length_feet} ft` : "length pending"}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          Inlet {inletPoint?.point_name ?? "unknown"} • Outlet {outletPoint?.point_name ?? "unknown"}
                        </p>
                        <p className="text-sm text-slate-700">
                          Slope: {culvert.slope_percent != null ? `${culvert.slope_percent}%` : "pending"}
                        </p>
                        {culvert.notes ? <p className="text-sm text-slate-600">{culvert.notes}</p> : null}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        {culvert.condition ?? "Condition pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
