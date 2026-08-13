import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PageHeader } from "@/components/PageHeader";
import { ROAD_INTELLIGENCE_DISCLAIMER, ROAD_RISK_LABELS, ROAD_STATUS_LABELS } from "@/lib/constants";
import { getProjectBySlug } from "@/lib/documents";
import { getRoadOverviewByProjectSlug } from "@/lib/road";
import { GateStatus, OverallAccessRisk, RoadStatus } from "@/lib/types";

function formatDateTime(value?: string | null) {
  if (!value) return "Not reported";
  return new Date(value).toLocaleString();
}

function labelStatus(value?: RoadStatus | null) {
  return value ? ROAD_STATUS_LABELS[value] : "Unknown";
}

function labelRisk(value?: OverallAccessRisk | null) {
  return value ? ROAD_RISK_LABELS[value] : ROAD_RISK_LABELS.unknown;
}

function labelGateStatus(value?: GateStatus | null) {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ");
}

function statusTone(value?: RoadStatus | null) {
  switch (value) {
    case "open":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "closed":
    case "seasonal_closure":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "restricted":
    case "partially_closed":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

function freshnessTone(lastSuccessAt?: string | null) {
  if (!lastSuccessAt) {
    return { label: "Not run", className: "bg-slate-100 text-slate-700" };
  }

  const ageHours = (Date.now() - new Date(lastSuccessAt).getTime()) / 36e5;

  if (ageHours <= 2) {
    return { label: "Current", className: "bg-emerald-100 text-emerald-900" };
  }

  if (ageHours <= 12) {
    return { label: "Aging", className: "bg-amber-100 text-amber-900" };
  }

  return { label: "Stale", className: "bg-rose-100 text-rose-900" };
}

export default async function RoadPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, overview] = await Promise.all([getProjectBySlug(projectId), getRoadOverviewByProjectSlug(projectId)]);

  if (!project) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Road Intelligence" title="Project not found" description="The requested project slug does not exist in the current dataset." />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Road Intelligence"
          title={`${project.name} road intelligence`}
          description="Road intelligence foundations are enabled, but no road corridor is registered for this project yet."
        />
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 text-sm text-slate-600 shadow-card">
          Run the road-intelligence migration and seed the primary corridor to begin collecting status, weather, and alert data.
        </div>
      </div>
    );
  }

  const { corridor, currentStatus, activeAlerts, latestSnapshot, sources, weatherLocations } = overview;

  const cards = [
    {
      title: "Official status",
      value: labelStatus(currentStatus.official_status),
      detail: currentStatus.official_status_source ?? "No authoritative source recorded yet",
      meta: `Updated ${formatDateTime(currentStatus.official_status_time)}`
    },
    {
      title: "Partner status",
      value: labelStatus(currentStatus.partner_status),
      detail: "RRMMC or other operational partner layer",
      meta: `Updated ${formatDateTime(currentStatus.partner_status_time)}`
    },
    {
      title: "Overall access risk",
      value: labelRisk(currentStatus.overall_access_risk),
      detail: "Portal-derived operational risk",
      meta: latestSnapshot?.summary ?? "Daily snapshot not generated yet"
    },
    {
      title: "Gate status",
      value: labelGateStatus(currentStatus.gate_status),
      detail: `${currentStatus.active_usfs_alert_count ?? 0} active USFS alerts`,
      meta: `${currentStatus.active_weather_alert_count ?? 0} active weather alerts`
    },
    {
      title: "Current weather",
      value: currentStatus.temperature_f != null ? `${currentStatus.temperature_f} F` : "Unknown",
      detail: currentStatus.weather_description ?? "No weather description recorded",
      meta:
        currentStatus.wind_mph != null || currentStatus.wind_gust_mph != null
          ? `Wind ${currentStatus.wind_mph ?? "?"} mph | Gust ${currentStatus.wind_gust_mph ?? "?"} mph`
          : "Wind not recorded"
    },
    {
      title: "Forecast risk",
      value:
        currentStatus.forecast_precip_probability != null
          ? `${currentStatus.forecast_precip_probability}% precip`
          : "Not forecast",
      detail:
        currentStatus.forecast_snow_inches != null ? `Snow forecast ${currentStatus.forecast_snow_inches} in` : "Snow forecast unavailable",
      meta: `Last updated ${formatDateTime(currentStatus.last_updated)}`
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Road Intelligence"
        title={`${project.name} road intelligence`}
        description="Track FS 0300 status, weather risk, alerts, source freshness, and future roadway analytics in one evidence-driven workspace."
      />
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <strong>Road intelligence notice:</strong> {ROAD_INTELLIGENCE_DISCLAIMER}
      </div>
      <DisclaimerBanner />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={`rounded-[2rem] border p-6 shadow-card ${statusTone(currentStatus.partner_status ?? currentStatus.official_status)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">Primary corridor</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{corridor.name}</h2>
          <p className="mt-2 text-sm leading-6">
            Managing agency: {corridor.managing_agency ?? "Pending"} | Road number: {corridor.road_number ?? "Pending"}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm">
              Official: {labelStatus(currentStatus.official_status)}
            </span>
            <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm">
              Partner: {labelStatus(currentStatus.partner_status)}
            </span>
            <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm">
              Risk: {labelRisk(currentStatus.overall_access_risk)}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6">
            {currentStatus.latest_condition_report ??
              "No condition report summary has been stored yet. This sprint lays the schema and workspace foundations so automated sources and field reports can land in the next sprint."}
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Sprint 1 delivered</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Road intelligence schema and current-status view ready for Supabase migration.</li>
            <li>Primary FS 0300 corridor seed and provider registry foundations added.</li>
            <li>New project road workspace route and top navigation entry enabled.</li>
            <li>Fallback seeded cards keep the page useful before automated ingestion begins.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">{card.title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{card.value}</p>
            <p className="mt-2 text-sm text-slate-700">{card.detail}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{card.meta}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Source registry</h2>
              <p className="mt-2 text-sm text-slate-600">Each provider keeps its own authority tier and freshness state. Later sprints will add ingestion runs, health metrics, and admin refresh controls.</p>
            </div>
            <span className="text-sm text-slate-500">{sources.length} sources</span>
          </div>
          <div className="mt-5 space-y-4">
            {sources.map((source) => {
              const freshness = freshnessTone(source.last_success_at);
              return (
                <article key={source.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{source.provider_name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {source.provider_key} | {source.authority_level.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${freshness.className}`}>{freshness.label}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Cadence: {source.default_refresh_minutes ? `${source.default_refresh_minutes} min` : "Pending"}</p>
                    <p>Method: {source.ingestion_method ?? "Pending"}</p>
                    <p>Last success: {formatDateTime(source.last_success_at)}</p>
                    <p>Parser version: {source.parser_version ?? "Pending"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Active alerts</h2>
            <p className="mt-2 text-sm text-slate-600">Alerts stay distinct from reconciled road status so weather or community reports do not silently become official closures.</p>
            <div className="mt-5 space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No active road alerts are stored yet.
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <article key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-800">{alert.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {(alert.alert_type ?? "alert").replaceAll("_", " ")} | {(alert.severity ?? "unknown").replaceAll("_", " ")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{alert.description ?? "No alert description recorded."}</p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Weather sampling sites</h2>
            <p className="mt-2 text-sm text-slate-600">Multiple elevation-aware sample points avoid collapsing the entire corridor into one Colorado Springs weather reading.</p>
            <div className="mt-5 space-y-3">
              {weatherLocations.map((location) => (
                <div key={location.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{location.name}</p>
                  <p className="mt-1">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} | Elev. {location.elevation_ft ?? "?"} ft
                  </p>
                  <p className="mt-1 text-slate-500">Station id: {location.station_identifier ?? "Pending"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
