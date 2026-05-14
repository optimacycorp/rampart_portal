import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";

export default function ExportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exports"
        title="Basic export staging"
        description="Prepare simple coordination bundles and evidence summaries without turning the portal into a final opinion or determination engine."
      />
      <DisclaimerBanner />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-3">
          {["Document index export", "Reviewer comment matrix export", "Field evidence summary"].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
