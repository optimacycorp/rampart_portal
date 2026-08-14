import Link from "next/link";
import {
  createRoadConditionReport,
  createRoadFieldMeasurement,
  generateRoadSnapshot,
  recalculateRoadStatus,
  refreshRoadStatusSources,
  refreshRoadWeather
} from "@/app/projects/[projectId]/road/actions";
import { PageHeader } from "@/components/PageHeader";
import { ProjectAssistant } from "@/components/ProjectAssistant";
import { RoadConditionReportForm } from "@/components/RoadConditionReportForm";
import { RoadFieldMeasurementForm } from "@/components/RoadFieldMeasurementForm";
import { getCurrentUserContext } from "@/lib/auth-server";
import { ROAD_INTELLIGENCE_DISCLAIMER, ROAD_RISK_LABELS, ROAD_STATUS_LABELS } from "@/lib/constants";
import { getCulvertsByProjectId } from "@/lib/culverts";
import { getProjectBySlug } from "@/lib/documents";
import { getEvidencePhotosByProjectSlug } from "@/lib/evidence-photos";
import { getFieldPointsByProjectSlug } from "@/lib/field-points";
import { getLidarScansByProjectSlug } from "@/lib/lidar";
import { getRoadOverviewByProjectSlug } from "@/lib/road";
import { getRecentRoadDailySnapshots, getRoadSourceHealth } from "@/lib/road-history";
import { getRoadFieldMeasurementsByCorridorId, getRoadMeasurementStats } from "@/lib/road-measurements";
import { getRecentRoadStatusEvents } from "@/lib/road-reconciliation";
import { getRoadConditionReportsByCorridorId } from "@/lib/road-reports";
import { GateStatus, OverallAccessRisk, RoadStatus } from "@/lib/types";

function formatDateTime(value?: string | null) {
  if (!value) return "Not reported";
  return new Date(value).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
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

function formatMeasurementType(value: string) {
  return value.replaceAll("_", " ");
}

function formatMeasurementValue(value?: number | null, units?: string | null) {
  if (value == null) {
    return "Value not recorded";
  }

  return `${value} ${units ?? ""}`.trim();
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

function healthTone(value: "current" | "aging" | "stale" | "failed" | "never" | "disabled") {
  switch (value) {
    case "current":
      return "bg-emerald-100 text-emerald-900";
    case "aging":
      return "bg-amber-100 text-amber-900";
    case "stale":
      return "bg-orange-100 text-orange-900";
    case "failed":
      return "bg-rose-100 text-rose-900";
    case "disabled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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

  const { corridor, currentStatus, activeAlerts, latestSnapshot } = overview;
  const [recentEvents, recentSnapshots, sourceHealth, roadReports, fieldPoints, photos, lidarScans, culverts, roadMeasurements, measurementStats] = await Promise.all([
    getRecentRoadStatusEvents(corridor.id, 6),
    getRecentRoadDailySnapshots(corridor.id, 10),
    getRoadSourceHealth(corridor.id),
    getRoadConditionReportsByCorridorId(corridor.id, 12),
    getFieldPointsByProjectSlug(projectId),
    getEvidencePhotosByProjectSlug(projectId),
    getLidarScansByProjectSlug(projectId),
    getCulvertsByProjectId(project.id),
    getRoadFieldMeasurementsByCorridorId(corridor.id, 12),
    getRoadMeasurementStats(corridor.id)
  ]);

  const canRefresh = role === "owner" || role === "audit";
  const refreshAction = refreshRoadWeather.bind(null, projectId);
  const refreshStatusAction = refreshRoadStatusSources.bind(null, projectId);
  const recalcAction = recalculateRoadStatus.bind(null, projectId);
  const snapshotAction = generateRoadSnapshot.bind(null, projectId);
  const reportAction = createRoadConditionReport.bind(null, projectId);
  const measurementAction = createRoadFieldMeasurement.bind(null, projectId);
  const roadPointTypes = new Set(["road_edge", "gate", "turnout", "driveway", "culvert_inlet", "culvert_outlet", "ditch", "swale", "berm", "photo_station"]);
  const roadFieldPoints = fieldPoints.filter((point) => roadPointTypes.has(point.point_type));
  const fieldPointMap = new Map(fieldPoints.map((point) => [point.id, point]));
  const lidarScanMap = new Map(lidarScans.map((scan) => [scan.id, scan]));

  const feedbackText: Record<string, string> = {
    "weather-refreshed": "NWS weather observations, forecasts, and active alerts were refreshed.",
    "status-refreshed": "USFS and RRMMC road-status sources were refreshed.",
    recalculated: "The deterministic reconciliation engine recalculated consolidated road status and logged a status event.",
    "snapshot-generated": "A daily road snapshot was generated from the current reconciled status and weather evidence.",
    "report-saved": "Road condition report saved. It is marked as a user observation until explicitly verified.",
    "measurement-saved": "Roadway measurement saved and linked into the corridor evidence workspace.",
    "supabase-not-configured": "Supabase is not configured yet. Add the project URL and service role key on the server.",
    forbidden: "Only owner or audit users can refresh road intelligence sources.",
    "project-not-found": "The requested project or road corridor could not be found.",
    "nws-source-not-found": "The NWS road-data source record is missing. Run the latest road migrations first.",
    "status-source-not-found": "The USFS or RRMMC source record is missing. Run the latest road migrations first.",
    "refresh-start-failed": "The portal could not create the NWS ingestion run record.",
    "refresh-failed": "The NWS refresh failed. Check the road_ingestion_runs table for the error details.",
    "status-refresh-failed": "The USFS or RRMMC refresh failed. Check the road_ingestion_runs table for the error details.",
    "recalculation-failed": "The portal could not log the reconciliation result. Check road_status_events and the current-status view.",
    "snapshot-failed": "The portal could not write the road snapshot. Check road_daily_snapshots and current road status data.",
    "report-missing-required-fields": "Observed date/time, condition summary, and report notes are required.",
    "report-save-failed": "The road condition report could not be saved.",
    "measurement-missing-required-fields": "Measurement date/time, type, numeric value, and units are required.",
    "measurement-save-failed": "The roadway measurement could not be saved.",
    "measurement-point-not-found": "The selected linked field point could not be found.",
    "measurement-lidar-not-found": "The selected LiDAR scan could not be found.",
    "photo-not-found": "The selected linked photo could not be found.",
    "point-not-found": "The selected linked field point could not be found."
  };

  const cards = [
    {
      title: "Consolidated status",
      value: labelStatus(currentStatus.consolidated_status),
      detail: currentStatus.consolidated_status_source ?? "Deterministic reconciliation",
      meta: currentStatus.consolidated_status_reason ?? "No reconciliation reason available yet"
    },
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
        description="Track FS 0300 status, weather risk, alerts, source freshness, LiDAR-linked roadway measurements, and field evidence in one workspace."
      />
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>Road intelligence notice:</strong> {ROAD_INTELLIGENCE_DISCLAIMER}
      </div>
      <ProjectAssistant
        embedded
        projectSlug={projectId}
        title="Road Analysis"
        description="Ask road-specific status and evidence questions about closures, weather risk, field reports, LiDAR coverage, and saved roadway measurements."
        starterQuestions={[
          "What is the current road status for FS 0300?",
          "What is the current road weather risk?",
          "What road evidence do we have from LiDAR and field data?",
          "Are there any active road alerts right now?",
          "What recent field road reports are on file?"
        ]}
      />
      {query.status && feedbackText[query.status] ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedbackText[query.status]}</div>
      ) : null}
      {query.error && feedbackText[query.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{feedbackText[query.error]}</div>
      ) : null}

      <section className={`rounded-[2rem] border p-6 shadow-card ${statusTone(currentStatus.partner_status ?? currentStatus.official_status)}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
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
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm">
                Gate: {labelGateStatus(currentStatus.gate_status)}
              </span>
            </div>
            <p className="mt-5 text-sm leading-6">
              {currentStatus.latest_condition_report ?? "No condition report summary has been stored yet. Refresh sources and add field reports to strengthen the current corridor picture."}
            </p>
          </div>
          {canRefresh ? (
            <div className="flex flex-wrap gap-2">
              <form action={refreshStatusAction}>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Refresh status
                </button>
              </form>
              <form action={refreshAction}>
                <button
                  type="submit"
                  className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pine/90"
                >
                  Refresh weather
                </button>
              </form>
              <form action={recalcAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-50"
                >
                  Recalculate
                </button>
              </form>
              <form action={snapshotAction}>
                <button
                  type="submit"
                  className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-clay/90"
                >
                  Snapshot
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Log roadway measurement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save LiDAR-derived or field-checked corridor measurements such as road width, grade, rut depth, ditch depth, or culvert dimensions. Link them to scans and field points so later review can trace the evidence.
          </p>
          <div className="mt-5">
            {canRefresh ? (
              <RoadFieldMeasurementForm action={measurementAction} fieldPoints={roadFieldPoints} lidarScans={lidarScans} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Only owner or audit users can save roadway measurements.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">LiDAR road analytics</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Corridor-linked scan coverage, field evidence, and saved measurements available for road review.
                </p>
              </div>
              <Link href={`/projects/${projectId}/lidar`} className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white">
                Open LiDAR library
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Linked scans</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{lidarScans.length}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {lidarScans.reduce((sum, scan) => sum + (scan.area_acres ?? 0), 0).toFixed(2)} acres of registered scan coverage.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Road evidence points</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{roadFieldPoints.length}</p>
                <p className="mt-2 text-sm text-slate-600">{culverts.length} culverts and {photos.length} photos/videos available to support corridor review.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Saved measurements</p>
                <p className="mt-2 text-3xl font-semibold text-ink">{measurementStats.totalMeasurements}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {measurementStats.lidarLinkedMeasurements} LiDAR-linked and {measurementStats.linkedPointMeasurements} tied to field points.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Latest measurement</p>
                <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(measurementStats.recentMeasurementAt)}</p>
                <p className="mt-2 text-sm text-slate-600">Use saved measurements to support future cross-sections, export packages, and road review summaries.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Registered scan support</h2>
                <p className="mt-2 text-sm text-slate-600">Open a scan when you need point-cloud context for a roadway issue, culvert crossing, or access pinch point.</p>
              </div>
              <span className="text-sm text-slate-500">{lidarScans.length} scans</span>
            </div>
            <div className="mt-5 space-y-3">
              {lidarScans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No LiDAR scans are registered yet for this project.
                </div>
              ) : (
                lidarScans.slice(0, 4).map((scan) => (
                  <div key={scan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{scan.title}</p>
                        <p className="mt-1 text-slate-600">
                          {formatDate(scan.scan_date)} | {scan.equipment ?? "Equipment pending"}
                        </p>
                      </div>
                      <Link href={`/projects/${projectId}/lidar/${scan.id}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-300">
                        Open scan
                      </Link>
                    </div>
                    <p className="mt-3 text-slate-600">
                      {(scan.processing_stage ?? "raw_uploaded").replaceAll("_", " ")} | {scan.point_count?.toLocaleString() ?? "Unknown"} points | {scan.area_acres ?? "Unknown"} acres
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Report road condition</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Log field observations such as runoff, rutting, washouts, tree obstructions, standing water, or passability concerns. These reports remain user observations until explicitly verified.
          </p>
          <div className="mt-5">
            <RoadConditionReportForm action={reportAction} fieldPoints={fieldPoints} photos={photos} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Recent field road reports</h2>
              <p className="mt-2 text-sm text-slate-600">
                These are portal user observations for coordination only. They do not replace USFS closures, restrictions, or other authoritative determinations.
              </p>
            </div>
            <span className="text-sm text-slate-500">{roadReports.length} reports</span>
          </div>
          <div className="mt-5 space-y-4">
            {roadReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No field road reports have been logged yet.
              </div>
            ) : (
              roadReports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{report.condition ?? "Road condition report"}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(report.observed_at)} | Passability: {(report.passability ?? "unknown").replaceAll("_", " ")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        report.verified ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {report.verified ? "Verified" : "User observation"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Surface: {(report.surface_condition ?? "unknown").replaceAll("_", " ")}</p>
                    <p>Vehicle: {report.recommended_vehicle ?? "Not specified"}</p>
                    <p>Mud / Snow / Rut: {[report.mud_severity, report.snow_severity, report.rut_severity].map((value) => (value ?? "unknown").replaceAll("_", " ")).join(" / ")}</p>
                    <p>
                      Flags: {[
                        report.washout ? "washout" : null,
                        report.fallen_tree ? "fallen tree" : null,
                        report.standing_water ? "standing water" : null,
                        report.erosion ? "erosion" : null
                      ].filter(Boolean).join(", ") || "none"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{report.description ?? "No report notes provided."}</p>
                  {(report.latitude != null && report.longitude != null) || report.photo_id ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {report.latitude != null && report.longitude != null ? `GPS ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : "GPS not recorded"}
                      {report.photo_id ? ` | Linked photo ${report.photo_id}` : ""}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Recent roadway measurements</h2>
              <p className="mt-2 text-sm text-slate-600">
                Saved roadway measurements can be traced back to linked LiDAR scans, field points, and corridor locations.
              </p>
            </div>
            <span className="text-sm text-slate-500">{roadMeasurements.length} measurements</span>
          </div>
          <div className="mt-5 space-y-4">
            {roadMeasurements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No roadway measurements have been saved yet.
              </div>
            ) : (
              roadMeasurements.map((measurement) => {
                const linkedPoint = measurement.source_point_id ? fieldPointMap.get(measurement.source_point_id) : null;
                const linkedScan = measurement.lidar_scan_id ? lidarScanMap.get(measurement.lidar_scan_id) : null;

                return (
                  <article key={measurement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {formatMeasurementType(measurement.measurement_type)} | {formatMeasurementValue(measurement.value, measurement.units)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{formatDateTime(measurement.measured_at ?? measurement.created_at)}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {measurement.source_equipment ?? "Source not recorded"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>Linked point: {linkedPoint ? `${linkedPoint.point_name} (${linkedPoint.point_type})` : "None"}</p>
                      <p>Linked scan: {linkedScan ? linkedScan.title : "None"}</p>
                      <p>Latitude / Longitude: {measurement.latitude != null && measurement.longitude != null ? `${measurement.latitude}, ${measurement.longitude}` : "Not recorded"}</p>
                      <p>Elevation: {measurement.elevation_ft != null ? `${measurement.elevation_ft} ft` : "Not recorded"}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{measurement.notes ?? "No measurement notes provided."}</p>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Road-linked field points</h2>
              <p className="mt-2 text-sm text-slate-600">
                These point types are most likely to matter for corridor access, drainage, and road geometry review.
              </p>
            </div>
            <span className="text-sm text-slate-500">{roadFieldPoints.length} points</span>
          </div>
          <div className="mt-5 space-y-3">
            {roadFieldPoints.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No road-linked field points were found yet.
              </div>
            ) : (
              roadFieldPoints.slice(0, 10).map((point) => (
                <div key={point.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{point.point_name}</p>
                  <p className="mt-1 text-slate-600">{point.point_type.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-slate-600">
                    {point.latitude != null && point.longitude != null
                      ? `${point.latitude}, ${point.longitude}`
                      : point.easting != null && point.northing != null
                        ? `${point.easting}, ${point.northing}`
                        : "Coordinates pending"}
                  </p>
                  <p className="mt-2 text-slate-600">{point.description ?? "No point description recorded."}</p>
                </div>
              ))
            )}
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
              <h2 className="text-xl font-semibold text-ink">Source health</h2>
              <p className="mt-2 text-sm text-slate-600">Each provider keeps its own authority tier, latest ingestion result, and freshness state so stale or failed sources are visible immediately.</p>
            </div>
            <span className="text-sm text-slate-500">{sourceHealth.length} sources</span>
          </div>
          <div className="mt-5 space-y-4">
            {sourceHealth.map((entry) => {
              const freshness = entry.freshness === "disabled"
                ? { label: "Disabled", className: healthTone("disabled") }
                : entry.latestRun?.status === "failed"
                ? { label: "Failed", className: healthTone("failed") }
                : {
                    label: entry.freshness[0].toUpperCase() + entry.freshness.slice(1),
                    className: healthTone(entry.freshness)
                  };
              return (
                <article key={entry.source.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{entry.source.provider_name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.source.provider_key} | {entry.source.authority_level.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${freshness.className}`}>{freshness.label}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>Cadence: {entry.source.default_refresh_minutes ? `${entry.source.default_refresh_minutes} min` : "Pending"}</p>
                    <p>Method: {entry.source.ingestion_method ?? "Pending"}</p>
                    <p>Last success: {formatDateTime(entry.source.last_success_at)}</p>
                    <p>Latest run: {entry.source.enabled === false ? "Disabled" : entry.latestRun?.status ?? "Never run"}</p>
                    <p>Parser version: {entry.latestRun?.parser_version ?? entry.source.parser_version ?? "Pending"}</p>
                    <p>7d failures: {entry.failureCount7d}</p>
                  </div>
                  {entry.source.enabled === false ? (
                    <p className="mt-3 text-sm text-slate-600">This source is currently disabled and is not expected to refresh automatically.</p>
                  ) : null}
                  {entry.latestRun?.error_message ? (
                    <p className="mt-3 text-sm text-rose-700">{entry.latestRun.error_message}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Reconciliation evidence</h2>
            <p className="mt-2 text-sm text-slate-600">
              Deterministic rules currently prefer active authoritative USFS closures first, then authoritative status text, then partner status, and never turn weather risk into a legal closure by itself.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">Consolidated source</p>
                <p className="mt-1">{currentStatus.consolidated_status_source ?? "Unknown"}</p>
                <p className="mt-2 text-slate-600">{currentStatus.consolidated_status_reason ?? "No reconciliation reason available."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">Condition reports</p>
                <p className="mt-1">{currentStatus.condition_report_count_7d ?? 0} reports in the last 7 days</p>
                <p className="mt-2 text-slate-600">
                  Latest verified: {currentStatus.latest_verified_condition_report ?? "No verified field condition report yet."}
                </p>
              </div>
            </div>
          </div>

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

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Recent status events</h2>
            <p className="mt-2 text-sm text-slate-600">Each manual recalc records whether consolidated status changed or was merely re-confirmed.</p>
            <div className="mt-5 space-y-3">
              {recentEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No status events have been logged yet. Use <strong>Recalculate status</strong> after refreshing source data.
                </div>
              ) : (
                recentEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-800">{event.event_type.replaceAll("_", " ")}</p>
                    <p className="mt-1">
                      {event.old_value ?? "unknown"} -&gt; {event.new_value ?? "unknown"}
                    </p>
                    <p className="mt-2 text-slate-600">{event.description ?? "No event description recorded."}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{formatDateTime(event.detected_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Snapshot history</h2>
            <p className="mt-2 text-sm text-slate-600">Daily snapshots preserve the reconciled status and risk picture so later charts and seasonal summaries have stable historical rows to query.</p>
            <div className="mt-5 space-y-3">
              {recentSnapshots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No snapshots have been generated yet. Use <strong>Generate snapshot</strong> after a refresh and recalculation cycle.
                </div>
              ) : (
                recentSnapshots.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{snapshot.snapshot_date}</p>
                        <p className="mt-1">
                          Status: {labelStatus(snapshot.consolidated_status ?? "unknown")} | Risk: {labelRisk(snapshot.overall_access_risk ?? "unknown")}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        Score {snapshot.road_condition_score ?? "n/a"}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">{snapshot.summary ?? "No summary stored."}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Weather alerts {snapshot.active_weather_alerts ?? 0} | USFS alerts {snapshot.active_usfs_alerts ?? 0} | Generated {formatDateTime(snapshot.generated_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
