import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";

const documents = [
  {
    title: "Access Exhibit Index",
    type: "easement",
    source: "El Paso County",
    status: "uploaded"
  },
  {
    title: "Drainage Observation Log",
    type: "drainage_report",
    source: "Project Team",
    status: "uploaded"
  }
];

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Documents"
        title="Project documents"
        description="Upload and organize deeds, easements, surveys, plats, drainage materials, agency correspondence, and supporting evidence files."
      />
      <DisclaimerBanner />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Upload form scaffold</h2>
          <div className="mt-4 grid gap-3">
            {[
              "Document type",
              "Title",
              "Record date",
              "Reception number",
              "Book / page",
              "Source agency",
              "Notes",
              "File upload -> project-documents bucket"
            ].map((field) => (
              <div key={field} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {field}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Current document list</h2>
          <div className="mt-4 space-y-3">
            {documents.map((document) => (
              <div key={document.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-800">{document.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {document.type} • {document.source}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {document.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
