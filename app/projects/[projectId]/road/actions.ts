"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth-server";
import { fetchCotrexDatasetStatus } from "@/lib/cotrex";
import { getProjectBySlug } from "@/lib/documents";
import { getRecentRoadDailySnapshots } from "@/lib/road-history";
import { fetchNwsForPoint } from "@/lib/nws";
import { getRoadOverviewByProjectSlug } from "@/lib/road";
import { getRecentRoadStatusEvents, getRoadCurrentStatusByCorridorId } from "@/lib/road-reconciliation";
import { getEvidencePhotoById } from "@/lib/evidence-photos";
import { getFieldPointById } from "@/lib/field-points";
import { getLidarScanById } from "@/lib/lidar";
import { fetchRrmmcRoadStatus, mapRrmmcRoadStatus } from "@/lib/rrmmc";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { fetchUsfsRoadStatus } from "@/lib/usfs";

async function requireRoadRefreshRole() {
  const { user, role } = await getCurrentUserContext();

  if (!user || (role !== "owner" && role !== "audit")) {
    throw new Error("forbidden");
  }

  return { user, role };
}

async function createPortalSystemRun(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, overview: Awaited<ReturnType<typeof getRoadOverviewByProjectSlug>>) {
  const portalSystemSource = overview?.sources.find((source) => source.provider_key === "portal_system");

  if (!portalSystemSource) {
    return null;
  }

  const { data, error } = await supabase
    .from("road_ingestion_runs")
    .insert({
      source_id: portalSystemSource.id,
      job_name: "manual-portal-reconciliation",
      started_at: new Date().toISOString(),
      status: "running",
      parser_version: portalSystemSource.parser_version ?? "portal-manual-v1",
      metadata: {
        corridor_id: overview?.corridor.id
      }
    })
    .select("id")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    runId: data.id as string,
    sourceId: portalSystemSource.id,
    parserVersion: portalSystemSource.parser_version ?? "portal-manual-v1"
  };
}

function readFormString(formData: FormData, key: string) {
  const value = `${formData.get(key) ?? ""}`.trim();
  return value || null;
}

function readFormNumber(formData: FormData, key: string) {
  const value = readFormString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readFormBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true";
}

export async function refreshRoadWeather(projectSlug: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  try {
    await requireRoadRefreshRole();
  } catch {
    redirect(`/projects/${projectSlug}/road?error=forbidden`);
  }

  const overview = await getRoadOverviewByProjectSlug(projectSlug);
  const project = await getProjectBySlug(projectSlug);

  if (!project || !overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const nwsSource = overview.sources.find((source) => source.provider_key === "nws");

  if (!nwsSource) {
    redirect(`/projects/${projectSlug}/road?error=nws-source-not-found`);
  }

  const runStart = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("road_ingestion_runs")
    .insert({
      source_id: nwsSource.id,
      job_name: "manual-nws-refresh",
      started_at: runStart,
      status: "running",
      parser_version: "nws-manual-v1",
      metadata: {
        corridor_id: overview.corridor.id,
        weather_location_count: overview.weatherLocations.length
      }
    })
    .select("id")
    .single();

  if (runError || !run) {
    redirect(`/projects/${projectSlug}/road?error=refresh-start-failed`);
  }

  let recordsInserted = 0;
  let recordsUpdated = 0;
  let recordsReceived = 0;
  const fetchedResults: Awaited<ReturnType<typeof fetchNwsForPoint>>[] = [];

  try {
    for (const location of overview.weatherLocations) {
      const result = await fetchNwsForPoint(location.latitude, location.longitude);
      fetchedResults.push(result);
      recordsReceived += 1 + result.forecasts.length + result.alerts.length;

      if (result.stationIdentifier && result.stationIdentifier !== location.station_identifier) {
        const { error } = await supabase
          .from("road_weather_locations")
          .update({ station_identifier: result.stationIdentifier })
          .eq("id", location.id);

        if (!error) {
          recordsUpdated += 1;
        }
      }

      if (result.observation) {
        const { error } = await supabase.from("weather_observations").upsert(
          {
            location_id: location.id,
            source_id: nwsSource.id,
            observed_at: result.observation.observedAt,
            temperature_f: result.observation.temperatureF,
            dewpoint_f: result.observation.dewpointF,
            relative_humidity_percent: result.observation.relativeHumidityPercent,
            wind_speed_mph: result.observation.windSpeedMph,
            wind_gust_mph: result.observation.windGustMph,
            wind_direction_deg: result.observation.windDirectionDeg,
            precipitation_1h_in: result.observation.precipitation1hIn,
            pressure_mb: result.observation.pressureMb,
            visibility_miles: result.observation.visibilityMiles,
            weather_description: result.observation.weatherDescription,
            raw_payload: result.observation.rawPayload,
            fetched_at: new Date().toISOString()
          },
          {
            onConflict: "location_id,source_id,observed_at",
            ignoreDuplicates: false
          }
        );

        if (error) {
          throw error;
        }

        recordsInserted += 1;
      }

      await supabase.from("weather_forecasts").delete().eq("location_id", location.id).eq("source_id", nwsSource.id);

      if (result.forecasts.length > 0) {
        const { error } = await supabase.from("weather_forecasts").insert(
          result.forecasts.map((forecast) => ({
            location_id: location.id,
            source_id: nwsSource.id,
            forecast_generated_at: forecast.forecastGeneratedAt,
            period_start: forecast.periodStart,
            period_end: forecast.periodEnd,
            temperature_f: forecast.temperatureF,
            precipitation_probability: forecast.precipitationProbability,
            snowfall_inches: forecast.snowfallInches,
            wind_speed_mph: forecast.windSpeedMph,
            wind_gust_mph: forecast.windGustMph,
            short_forecast: forecast.shortForecast,
            detailed_forecast: forecast.detailedForecast,
            raw_payload: forecast.rawPayload,
            fetched_at: new Date().toISOString()
          }))
        );

        if (error) {
          throw error;
        }

        recordsInserted += result.forecasts.length;
      }
    }

    await supabase
      .from("road_closures_alerts")
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq("corridor_id", overview.corridor.id)
      .eq("source_id", nwsSource.id);

    const allAlerts = fetchedResults.flatMap((result) => result.alerts);

    const dedupedAlerts = Array.from(new Map(allAlerts.map((alert) => [alert.externalAlertId, alert])).values());

    if (dedupedAlerts.length > 0) {
      const { error } = await supabase.from("road_closures_alerts").upsert(
        dedupedAlerts.map((alert) => ({
          corridor_id: overview.corridor.id,
          source_id: nwsSource.id,
          external_alert_id: alert.externalAlertId,
          alert_type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          effective_at: alert.effectiveAt,
          expires_at: alert.expiresAt,
          active: true,
          source_url: alert.sourceUrl,
          raw_payload: alert.rawPayload,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: "source_id,external_alert_id",
          ignoreDuplicates: false
        }
      );

      if (error) {
        throw error;
      }

      recordsInserted += dedupedAlerts.length;
    }

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        parser_version: "nws-manual-v1",
        updated_at: new Date().toISOString()
      })
      .eq("id", nwsSource.id);

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_received: recordsReceived,
        records_inserted: recordsInserted,
        records_updated: recordsUpdated,
        http_status: 200,
        metadata: {
          corridor_id: overview.corridor.id,
          weather_location_count: overview.weatherLocations.length,
          active_alert_count: dedupedAlerts.length
        }
      })
      .eq("id", run.id);
  } catch (error) {
    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", nwsSource.id);

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        records_received: recordsReceived,
        records_inserted: recordsInserted,
        records_updated: recordsUpdated,
        error_message: error instanceof Error ? error.message : "Unexpected NWS refresh failure."
      })
      .eq("id", run.id);

    redirect(`/projects/${projectSlug}/road?error=refresh-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=weather-refreshed`);
}

export async function refreshRoadStatusSources(projectSlug: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  try {
    await requireRoadRefreshRole();
  } catch {
    redirect(`/projects/${projectSlug}/road?error=forbidden`);
  }

  const overview = await getRoadOverviewByProjectSlug(projectSlug);
  const project = await getProjectBySlug(projectSlug);

  if (!project || !overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const rrmmcSource = overview.sources.find((source) => source.provider_key === "rrmmc");
  const usfsSource = overview.sources.find((source) => source.provider_key === "usfs_psicc");
  const cotrexSource = overview.sources.find((source) => source.provider_key === "cotrex");

  if (!rrmmcSource || !usfsSource) {
    redirect(`/projects/${projectSlug}/road?error=status-source-not-found`);
  }

  const { data: rrmmcRun } = await supabase
    .from("road_ingestion_runs")
    .insert({
      source_id: rrmmcSource.id,
      job_name: "manual-rrmmc-refresh",
      started_at: new Date().toISOString(),
      status: "running",
      parser_version: "rrmmc-manual-v1",
      metadata: { corridor_id: overview.corridor.id }
    })
    .select("id")
    .single();

  const { data: usfsRun } = await supabase
    .from("road_ingestion_runs")
    .insert({
      source_id: usfsSource.id,
      job_name: "manual-usfs-refresh",
      started_at: new Date().toISOString(),
      status: "running",
      parser_version: "usfs-manual-v1",
      metadata: { corridor_id: overview.corridor.id }
    })
    .select("id")
    .single();

  const cotrexRun =
    cotrexSource && cotrexSource.enabled !== false
      ? await supabase
          .from("road_ingestion_runs")
          .insert({
            source_id: cotrexSource.id,
            job_name: "manual-cotrex-refresh",
            started_at: new Date().toISOString(),
            status: "running",
            parser_version: "cotrex-manual-v1",
            metadata: { corridor_id: overview.corridor.id }
          })
          .select("id")
          .single()
      : null;

  if (!rrmmcRun || !usfsRun) {
    redirect(`/projects/${projectSlug}/road?error=refresh-start-failed`);
  }

  let rrmmcSucceeded = false;
  let usfsSucceeded = false;

  try {
    const rrmmc = await fetchRrmmcRoadStatus();

    const rrmmcInsert = await supabase.from("road_status_observations").insert({
      corridor_id: overview.corridor.id,
      source_id: rrmmcSource.id,
      observed_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      status: mapRrmmcRoadStatus(rrmmc.roadStatus),
      gate_status: "unknown",
      summary: rrmmc.summary,
      raw_status_text: rrmmc.rawStatusText,
      source_url: rrmmc.sourceUrl,
      confidence: 0.7,
      official: false,
      raw_payload: rrmmc.rawPayload
    });

    if (rrmmcInsert.error) {
      throw rrmmcInsert.error;
    }

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        parser_version: "rrmmc-manual-v1",
        updated_at: new Date().toISOString()
      })
      .eq("id", rrmmcSource.id);

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_received: 1,
        records_inserted: 1,
        records_updated: 0,
        http_status: 200,
        metadata: {
          road_status: rrmmc.roadStatus,
          trail_status: rrmmc.trailStatus
        }
      })
      .eq("id", rrmmcRun.id);

    rrmmcSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected RRMMC refresh failure.";

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_message: message
      })
      .eq("id", rrmmcRun.id);

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", rrmmcSource.id);
  }

  try {
    const usfs = await fetchUsfsRoadStatus();

    await supabase
      .from("road_closures_alerts")
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq("corridor_id", overview.corridor.id)
      .eq("source_id", usfsSource.id);

    const usfsObservationInsert = await supabase.from("road_status_observations").insert({
      corridor_id: overview.corridor.id,
      source_id: usfsSource.id,
      observed_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      status: usfs.authoritativeStatus,
      gate_status: "unknown",
      summary: usfs.summary,
      raw_status_text: usfs.rawStatusText,
      source_url: usfs.sourceUrl,
      confidence: 0.85,
      official: true,
      raw_payload: usfs.rawPayload
    });

    if (usfsObservationInsert.error) {
      throw usfsObservationInsert.error;
    }

    if (usfs.alerts.length > 0) {
      const alertUpsert = await supabase.from("road_closures_alerts").upsert(
        usfs.alerts.map((alert) => ({
          corridor_id: overview.corridor.id,
          source_id: usfsSource.id,
          external_alert_id: alert.externalAlertId,
          alert_type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          effective_at: alert.effectiveAt,
          expires_at: alert.expiresAt,
          active: true,
          source_url: alert.sourceUrl,
          raw_payload: alert.rawPayload,
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: "source_id,external_alert_id",
          ignoreDuplicates: false
        }
      );

      if (alertUpsert.error) {
        throw alertUpsert.error;
      }
    }

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        parser_version: "usfs-manual-v1",
        updated_at: new Date().toISOString()
      })
      .eq("id", usfsSource.id);

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_received: 1 + usfs.alerts.length,
        records_inserted: 1 + usfs.alerts.length,
        records_updated: 0,
        http_status: 200,
        metadata: {
          authoritative_status: usfs.authoritativeStatus,
          alert_count: usfs.alerts.length
        }
      })
      .eq("id", usfsRun.id);

    usfsSucceeded = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected USFS refresh failure.";

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_message: message
      })
      .eq("id", usfsRun.id);

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", usfsSource.id);
  }

  if (!rrmmcSucceeded && !usfsSucceeded) {
    redirect(`/projects/${projectSlug}/road?error=status-refresh-failed`);
  }

  if (cotrexSource && cotrexSource.enabled !== false && cotrexRun?.data?.id) {
    try {
      const cotrex = await fetchCotrexDatasetStatus();

      await supabase.from("road_status_observations").insert({
        corridor_id: overview.corridor.id,
        source_id: cotrexSource.id,
        observed_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        status: "unknown",
        gate_status: "unknown",
        summary: cotrex.summary,
        raw_status_text: cotrex.rawStatusText,
        source_url: cotrex.sourceUrl,
        confidence: 0.3,
        official: false,
        raw_payload: cotrex.rawPayload
      });

      await supabase
        .from("road_data_sources")
        .update({
          last_attempt_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          parser_version: "cotrex-manual-v1",
          updated_at: new Date().toISOString()
        })
        .eq("id", cotrexSource.id);

      await supabase
        .from("road_ingestion_runs")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          records_received: 1,
          records_inserted: 1,
          records_updated: 0,
          http_status: 200,
          metadata: {
            dataset_status: "reachable"
          }
        })
        .eq("id", cotrexRun.data.id);
    } catch (error) {
      await supabase
        .from("road_ingestion_runs")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unexpected COTREX refresh failure."
        })
        .eq("id", cotrexRun.data.id);

      await supabase
        .from("road_data_sources")
        .update({
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", cotrexSource.id);
    }
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=status-refreshed`);
}

export async function recalculateRoadStatus(projectSlug: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  try {
    await requireRoadRefreshRole();
  } catch {
    redirect(`/projects/${projectSlug}/road?error=forbidden`);
  }

  const overview = await getRoadOverviewByProjectSlug(projectSlug);

  if (!overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const portalRun = await createPortalSystemRun(supabase, overview);

  const currentStatus = await getRoadCurrentStatusByCorridorId(overview.corridor.id);

  if (!currentStatus) {
    redirect(`/projects/${projectSlug}/road?error=recalculation-failed`);
  }

  const recentEvents = await getRecentRoadStatusEvents(overview.corridor.id, 1);
  const previousStatus = recentEvents[0]?.new_value ?? null;
  const nextStatus = currentStatus.consolidated_status ?? "unknown";
  const sourceId =
    overview.sources.find((source) => source.provider_key === "portal_system")?.id ??
    overview.sources.find((source) => source.provider_key === "usfs_psicc")?.id ??
    null;

  const eventType = previousStatus !== nextStatus ? "status_changed" : "status_recalculated";
  const description =
    previousStatus !== nextStatus
      ? `Road status changed from ${previousStatus ?? "unknown"} to ${nextStatus}. ${currentStatus.consolidated_status_reason ?? ""}`.trim()
      : `Road status recalculated with no change. ${currentStatus.consolidated_status_reason ?? ""}`.trim();

  const { error } = await supabase.from("road_status_events").insert({
    corridor_id: overview.corridor.id,
    event_type: eventType,
    old_value: previousStatus,
    new_value: nextStatus,
    detected_at: new Date().toISOString(),
    source_id: sourceId,
    description
  });

  if (error) {
    if (portalRun) {
      await supabase
        .from("road_ingestion_runs")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: error.message
        })
        .eq("id", portalRun.runId);
    }
    redirect(`/projects/${projectSlug}/road?error=recalculation-failed`);
  }

  if (portalRun) {
    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        parser_version: portalRun.parserVersion,
        updated_at: new Date().toISOString()
      })
      .eq("id", portalRun.sourceId);

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        records_received: 1,
        records_inserted: 1,
        records_updated: 0,
        http_status: 200,
        metadata: {
          corridor_id: overview.corridor.id,
          reconciliation_status: currentStatus.consolidated_status ?? "unknown"
        }
      })
      .eq("id", portalRun.runId);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=recalculated`);
}

export async function generateRoadSnapshot(projectSlug: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  try {
    await requireRoadRefreshRole();
  } catch {
    redirect(`/projects/${projectSlug}/road?error=forbidden`);
  }

  const overview = await getRoadOverviewByProjectSlug(projectSlug);

  if (!overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const currentStatus = await getRoadCurrentStatusByCorridorId(overview.corridor.id);

  if (!currentStatus) {
    redirect(`/projects/${projectSlug}/road?error=snapshot-failed`);
  }

  const recentSnapshots = await getRecentRoadDailySnapshots(overview.corridor.id, 1);
  const previousSnapshot = recentSnapshots[0] ?? null;
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const minTemperature = overview.weatherSnapshots
    .map((snapshot) => snapshot.latestObservation?.temperature_f)
    .filter((value): value is number => value != null);
  const maxWindGust = overview.weatherSnapshots
    .map((snapshot) => snapshot.latestObservation?.wind_gust_mph ?? snapshot.latestObservation?.wind_speed_mph)
    .filter((value): value is number => value != null);
  const precipitationValues = overview.weatherSnapshots
    .map((snapshot) => snapshot.latestObservation?.precipitation_24h_in ?? snapshot.latestObservation?.precipitation_1h_in)
    .filter((value): value is number => value != null);
  const snowfallValues = overview.weatherSnapshots
    .map((snapshot) => snapshot.nextForecast?.snowfall_inches)
    .filter((value): value is number => value != null);

  const roadConditionScore =
    currentStatus.consolidated_status === "closed" || currentStatus.consolidated_status === "seasonal_closure"
      ? 20
      : currentStatus.overall_access_risk === "severe"
        ? 30
        : currentStatus.overall_access_risk === "high"
          ? 50
          : currentStatus.overall_access_risk === "moderate"
            ? 72
            : 88;

  const weatherRiskScore =
    currentStatus.overall_access_risk === "severe"
      ? 92
      : currentStatus.overall_access_risk === "high"
        ? 72
        : currentStatus.overall_access_risk === "moderate"
          ? 48
          : currentStatus.overall_access_risk === "low"
            ? 18
            : 0;

  const { error } = await supabase.from("road_daily_snapshots").upsert(
    {
      corridor_id: overview.corridor.id,
      snapshot_date: snapshotDate,
      consolidated_status: currentStatus.consolidated_status ?? "unknown",
      gate_status: currentStatus.gate_status ?? "unknown",
      status_confidence: previousSnapshot?.status_confidence ?? 0.8,
      status_source: currentStatus.consolidated_status_source ?? "Portal deterministic reconciliation",
      min_temperature_f: minTemperature.length > 0 ? Math.min(...minTemperature) : null,
      max_temperature_f: minTemperature.length > 0 ? Math.max(...minTemperature) : null,
      precipitation_24h_in: precipitationValues.length > 0 ? Math.max(...precipitationValues) : null,
      snowfall_24h_in: snowfallValues.length > 0 ? Math.max(...snowfallValues) : null,
      max_wind_gust_mph: maxWindGust.length > 0 ? Math.max(...maxWindGust) : null,
      active_weather_alerts: currentStatus.active_weather_alert_count ?? 0,
      active_usfs_alerts: currentStatus.active_usfs_alert_count ?? 0,
      road_condition_score: roadConditionScore,
      weather_risk_score: weatherRiskScore,
      overall_access_risk: currentStatus.overall_access_risk ?? "unknown",
      summary:
        currentStatus.consolidated_status_reason ??
        "Generated from current road intelligence status, weather, and alert evidence.",
      generated_at: new Date().toISOString(),
      source_snapshot: {
        consolidated_status: currentStatus.consolidated_status,
        consolidated_status_source: currentStatus.consolidated_status_source,
        official_status: currentStatus.official_status,
        partner_status: currentStatus.partner_status,
        weather_description: currentStatus.weather_description,
        active_weather_alert_count: currentStatus.active_weather_alert_count,
        active_usfs_alert_count: currentStatus.active_usfs_alert_count
      }
    },
    {
      onConflict: "corridor_id,snapshot_date",
      ignoreDuplicates: false
    }
  );

  if (error) {
    redirect(`/projects/${projectSlug}/road?error=snapshot-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=snapshot-generated`);
}

export async function createRoadConditionReport(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  const [{ user }, overview] = await Promise.all([getCurrentUserContext(), getRoadOverviewByProjectSlug(projectSlug)]);

  if (!user || !overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const observedAt = readFormString(formData, "observed_at");
  const condition = readFormString(formData, "condition");
  const description = readFormString(formData, "description");
  const photoId = readFormString(formData, "photo_id");
  const linkedPointId = readFormString(formData, "linked_point_id");

  if (!observedAt || !condition || !description) {
    redirect(`/projects/${projectSlug}/road?error=report-missing-required-fields`);
  }

  if (photoId) {
    const photo = await getEvidencePhotoById(photoId);
    if (!photo) {
      redirect(`/projects/${projectSlug}/road?error=photo-not-found`);
    }
  }

  if (linkedPointId) {
    const point = await getFieldPointById(linkedPointId);
    if (!point) {
      redirect(`/projects/${projectSlug}/road?error=point-not-found`);
    }
  }

  const { error } = await supabase.from("road_condition_reports").insert({
    corridor_id: overview.corridor.id,
    report_source: "portal_user",
    reported_by: user.id,
    observed_at: observedAt,
    condition,
    surface_condition: readFormString(formData, "surface_condition"),
    mud_severity: readFormString(formData, "mud_severity"),
    snow_severity: readFormString(formData, "snow_severity"),
    rut_severity: readFormString(formData, "rut_severity"),
    washout: readFormBoolean(formData, "washout"),
    fallen_tree: readFormBoolean(formData, "fallen_tree"),
    standing_water: readFormBoolean(formData, "standing_water"),
    erosion: readFormBoolean(formData, "erosion"),
    passability: readFormString(formData, "passability"),
    recommended_vehicle: readFormString(formData, "recommended_vehicle"),
    description,
    latitude: readFormNumber(formData, "latitude"),
    longitude: readFormNumber(formData, "longitude"),
    photo_id: photoId,
    source_url: null,
    verified: false
  });

  if (error) {
    redirect(`/projects/${projectSlug}/road?error=report-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=report-saved`);
}

export async function createRoadFieldMeasurement(projectSlug: string, formData: FormData) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    redirect(`/projects/${projectSlug}/road?error=supabase-not-configured`);
  }

  try {
    await requireRoadRefreshRole();
  } catch {
    redirect(`/projects/${projectSlug}/road?error=forbidden`);
  }

  const overview = await getRoadOverviewByProjectSlug(projectSlug);

  if (!overview) {
    redirect(`/projects/${projectSlug}/road?error=project-not-found`);
  }

  const measurementType = readFormString(formData, "measurement_type");
  const measuredAt = readFormString(formData, "measured_at");
  const value = readFormNumber(formData, "value");
  const units = readFormString(formData, "units");
  const sourcePointId = readFormString(formData, "source_point_id");
  const lidarScanId = readFormString(formData, "lidar_scan_id");

  if (!measurementType || !measuredAt || value == null || !units) {
    redirect(`/projects/${projectSlug}/road?error=measurement-missing-required-fields`);
  }

  if (sourcePointId) {
    const point = await getFieldPointById(sourcePointId);
    if (!point) {
      redirect(`/projects/${projectSlug}/road?error=measurement-point-not-found`);
    }
  }

  if (lidarScanId) {
    const scan = await getLidarScanById(lidarScanId);
    if (!scan) {
      redirect(`/projects/${projectSlug}/road?error=measurement-lidar-not-found`);
    }
  }

  const { error } = await supabase.from("road_field_measurements").insert({
    corridor_id: overview.corridor.id,
    measurement_type: measurementType,
    measured_at: measuredAt,
    value,
    units,
    latitude: readFormNumber(formData, "latitude"),
    longitude: readFormNumber(formData, "longitude"),
    elevation_ft: readFormNumber(formData, "elevation_ft"),
    source_equipment: readFormString(formData, "source_equipment"),
    source_point_id: sourcePointId,
    lidar_scan_id: lidarScanId,
    notes: readFormString(formData, "notes")
  });

  if (error) {
    redirect(`/projects/${projectSlug}/road?error=measurement-save-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=measurement-saved`);
}
