import { PageHeader } from "@/components/PageHeader";

export default function CulvertsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Culvert Register"
        title="Drainage asset register"
        description="Track culvert inlet and outlet points, dimensions, ownership, condition, and a slope calculation based on field elevations and length."
      />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Form fields</h2>
          <div className="mt-4 grid gap-3">
            {[
              "Culvert ID",
              "Inlet point",
              "Outlet point",
              "Diameter",
              "Material",
              "Length",
              "Slope",
              "Condition",
              "Ownership",
              "Flow direction",
              "Notes",
              "Photos"
            ].map((field) => (
              <div key={field} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {field}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-card">
          <h2 className="text-xl font-semibold">Slope calculation</h2>
          <p className="mt-3 text-sm leading-6 text-white/80">
            <code className="rounded bg-white/10 px-2 py-1">
              slope_percent = ((inlet_elevation - outlet_elevation) / length_feet) * 100
            </code>
          </p>
          <p className="mt-4 text-sm leading-6 text-white/80">
            Manual override should remain available for cases where surveyed elevations, pipe length, or interpreted
            flow path require field judgment.
          </p>
        </div>
      </div>
    </div>
  );
}
