export function CsvTemplateCard() {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
      <h3 className="text-lg font-semibold text-ink">Emlid / Field Point CSV Template</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Start imports from the project template so columns line up with the Sprint 1 field point workflow.
      </p>
      <a
        href="/samples/emlid-field-points-template.csv"
        download
        className="mt-4 inline-flex rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white"
      >
        Download sample CSV
      </a>
    </div>
  );
}
