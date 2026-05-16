import { createAccessLogEntry } from "@/app/projects/[projectId]/access-log/actions";
import { AccessLogForm } from "@/components/AccessLogForm";
import { PageHeader } from "@/components/PageHeader";
import { ACCESS_LOG_STATUS_OPTIONS } from "@/lib/constants";
import { getAccessLogsByProjectSlug } from "@/lib/access-log";
import { getDocumentsByProjectSlug } from "@/lib/documents";

const feedbackText: Record<string, string> = {
  saved: "Access log entry saved.",
  "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
  "project-not-found": "The requested project could not be found.",
  "missing-required-fields": "Feature and category are required.",
  "document-not-found": "The selected linked document could not be found.",
  "save-failed": "The access log entry could not be saved."
};

export default async function AccessLogPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string; category?: string; date?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [entries, documents] = await Promise.all([getAccessLogsByProjectSlug(projectId), getDocumentsByProjectSlug(projectId)]);
  const filteredEntries = entries.filter((entry) => {
    const categoryMatches = query.category ? entry.status === query.category : true;
    const dateMatches = query.date ? entry.log_date === query.date : true;
    return categoryMatches && dateMatches;
  });
  const action = createAccessLogEntry.bind(null, projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Log"
        title="Road and access observation timeline"
        description="Capture access-related observations for FS 0300, gate conditions, weather, road maintenance, turnout width, and supporting document links."
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
          <h2 className="text-xl font-semibold text-ink">Add access log entry</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Track weather, gates, road condition, fire access constraints, and linked document evidence in one place.
          </p>
          <div className="mt-5">
            <AccessLogForm action={action} documents={documents} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
                <select
                  name="category"
                  defaultValue={query.category ?? ""}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
                >
                  <option value="">All categories</option>
                  {ACCESS_LOG_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Date</span>
                <input
                  name="date"
                  defaultValue={query.date ?? ""}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pine"
                  type="date"
                />
              </label>
              <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Apply
              </button>
            </form>
          </div>
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 text-sm text-slate-600 shadow-card">
                {entries.length === 0 ? "No access log entries yet." : "No access log entries match the current filters."}
              </div>
            ) : null}
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-pine px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {entry.status ?? "General observation"}
                  </span>
                  <span className="text-sm text-slate-500">{entry.log_date ?? "No date"}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{entry.access_feature}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{entry.description ?? "No notes provided."}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Road: {entry.road_condition ?? "Not recorded"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Gate: {entry.gate_condition ?? "Not recorded"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Weather: {entry.weather ?? "Not recorded"}
                  </div>
                </div>
                {entry.linked_document_title ? (
                  <p className="mt-4 text-sm text-slate-500">Linked document: {entry.linked_document_title}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
