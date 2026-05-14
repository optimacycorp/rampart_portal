import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";

export default function DocumentDetailPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document Detail"
        title="Access Exhibit Index"
        description="Document detail pages are ready to display metadata, notes, storage links, and linked reviewer comments."
      />
      <DisclaimerBanner />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Document type: easement",
            "Record date: pending",
            "Reception number: pending",
            "Source agency: El Paso County",
            "Status: uploaded",
            "Linked reviewer comments: 1"
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
