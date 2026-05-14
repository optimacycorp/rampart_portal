import { CsvTemplateCard } from "@/components/CsvTemplateCard";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";

export default function FieldPointImportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="GPS Import"
        title="CSV import workflow"
        description="Sprint 1 import flow includes CSV upload, manual column mapping, validation, missing-coordinate flags, preview, and save."
      />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Import steps</h2>
          <div className="mt-4 space-y-3">
            {[
              "1. Upload CSV",
              "2. Map columns to required field point attributes",
              "3. Validate required fields and flag missing coordinate values",
              "4. Preview parsed records before save",
              "5. Save accepted rows to field_points"
            ].map((step) => (
              <div key={step} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {step}
              </div>
            ))}
          </div>
        </div>
        <CsvTemplateCard />
      </div>
      <DisclaimerBanner />
    </div>
  );
}
