import { PageHeader } from "@/components/PageHeader";

const entries = [
  {
    date: "2026-05-10",
    feature: "FS 0300 road segment",
    category: "Road maintenance",
    notes: "Observed rutting and drainage crossing near turnout."
  },
  {
    date: "2026-05-06",
    feature: "Garden of the Gods gate",
    category: "Gate condition",
    notes: "Gate condition documented with photo set and access notes."
  }
];

export default function AccessLogPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Log"
        title="Road and access observation timeline"
        description="Capture access-related observations for FS 0300, gate conditions, weather, road maintenance, turnout width, and supporting document links."
      />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="flex flex-wrap gap-3">
          {["Date", "Feature", "Condition", "Gate status", "Road condition", "Weather", "Notes", "Linked docs/photos"].map(
            (field) => (
              <div key={field} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                {field}
              </div>
            )
          )}
        </div>
      </div>
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.date + entry.feature} className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-pine px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                {entry.category}
              </span>
              <span className="text-sm text-slate-500">{entry.date}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-ink">{entry.feature}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{entry.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
