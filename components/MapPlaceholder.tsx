export function MapPlaceholder() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-900 p-6 shadow-card">
      <div className="absolute inset-0 bg-portal-grid bg-[size:38px_38px] opacity-20" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-300/20 to-transparent" />
      <div className="relative flex min-h-[420px] flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
            MapLibre Sprint 1
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Field Evidence Map</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            The shell is ready for MapLibre layer wiring. Sprint 1 can render field points by type with toggles for
            monuments, culverts, berms, drainage features, road features, photo stations, and gates.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-200">
            Monument popups: point name, coordinates, elevation, confidence
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-200">
            Culvert layers: inlet and outlet references from field points
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-200">
            Shared disclaimer remains visible above the map route
          </div>
        </div>
      </div>
    </div>
  );
}
