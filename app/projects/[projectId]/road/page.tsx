import { refreshRoadStatusSources, refreshRoadWeather } from "@/app/projects/[projectId]/road/actions";
import { getCurrentUserContext } from "@/lib/auth-server";
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
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const [{ role }, project, overview] = await Promise.all([
    getCurrentUserContext(),
    getProjectBySlug(projectId),
    getRoadOverviewByProjectSlug(projectId)
  ]);

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

  const { corridor, currentStatus, activeAlerts, latestSnapshot, sources } = overview;
  const canRefresh = role === "owner" || role === "audit";
  const refreshAction = refreshRoadWeather.bind(null, projectId);
  const refreshStatusAction = refreshRoadStatusSources.bind(null, projectId);
  const feedbackText: Record<string, string> = {
    "weather-refreshed": "NWS weather observations, forecasts, and active alerts were refreshed.",
    "status-refreshed": "USFS and RRMMC road-status sources were refreshed.",
    "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
    forbidden: "Only owner or audit users can refresh road intelligence sources.",
    "project-not-found": "The requested project or road corridor could not be found.",
    "nws-source-not-found": "The NWS road-data source record is missing. Run the latest road migrations first.",
    "status-source-not-found": "The USFS or RRMMC source record is missing. Run the latest road migrations first.",
    "refresh-start-failed": "The portal could not create the NWS ingestion run record.",
    "refresh-failed": "The NWS refresh failed. Check the road_ingestion_runs table for the error details.",
    "status-refresh-failed": "The USFS or RRMMC refresh failed. Check the road_ingestion_runs table for the error details."
  };

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
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedbackText[query.status]}</div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{feedbackText[query.error]}</div>
      ) : null}

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Sprint 3 delivered</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>USFS authority parsing and RRMMC partner-status parsing are wired into the portal.</li>
                <li>Manual owner/audit refresh now supports both weather and status-source ingestion runs.</li>
                <li>Official and partner observations flow into the current-status view without treating community data as legal closure authority.</li>
                <li>Forest Service alerts stay separate from community or weather observations for traceable evidence review.</li>
              </ul>
            </div>
            {canRefresh ? (
              <div className="flex flex-wrap gap-2">
                <form action={refreshStatusAction}>
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Refresh status sources
                  </button>
                </form>
                <form action={refreshAction}>
                  <button
                    type="submit"
                    className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pine/90"
                  >
                    Refresh NWS data
                  </button>
                </form>
              </div>
            ) : null}
          </div>
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
              {overview.weatherSnapshots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No weather-location records are registered yet for this corridor.
                </div>
              ) : null}
              {overview.weatherSnapshots.map((snapshot) => (
                <div key={snapshot.location.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{snapshot.location.name}</p>
                  <p className="mt-1">
                    {snapshot.location.latitude.toFixed(4)}, {snapshot.location.longitude.toFixed(4)} | Elev. {snapshot.location.elevation_ft ?? "?"} ft
                  </p>
                  <p className="mt-1 text-slate-500">Station id: {snapshot.location.station_identifier ?? "Pending"}</p>
                  <div className="mt-3 grid gap-1 text-slate-600">
                    <p>
                      Observation: {snapshot.latestObservation?.temperature_f != null ? `${snapshot.latestObservation.temperature_f} F` : "Unknown"}{" "}
                      | {snapshot.latestObservation?.weather_description ?? "No description"}
                    </p>
                    <p>
                      Wind: {snapshot.latestObservation?.wind_speed_mph ?? "?"} mph | Gust {snapshot.latestObservation?.wind_gust_mph ?? "?"} mph
                    </p>
                    <p>
                      Forecast: {snapshot.nextForecast?.short_forecast ?? "Pending"} | POP{" "}
                      {snapshot.nextForecast?.precipitation_probability ?? "?"}%
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Obs {formatDateTime(snapshot.latestObservation?.observed_at)} | Forecast {formatDateTime(snapshot.nextForecast?.period_start)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
