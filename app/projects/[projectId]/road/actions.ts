"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth-server";
import { getProjectBySlug } from "@/lib/documents";
import { fetchNwsForPoint } from "@/lib/nws";
import { getRoadOverviewByProjectSlug } from "@/lib/road";
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

  if (!rrmmcRun || !usfsRun) {
    redirect(`/projects/${projectSlug}/road?error=refresh-start-failed`);
  }

  try {
    const [rrmmc, usfs] = await Promise.all([fetchRrmmcRoadStatus(), fetchUsfsRoadStatus()]);

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected road status refresh failure.";

    await supabase
      .from("road_ingestion_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_message: message
      })
      .in("id", [rrmmcRun.id, usfsRun.id]);

    await supabase
      .from("road_data_sources")
      .update({
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in("id", [rrmmcSource.id, usfsSource.id]);

    redirect(`/projects/${projectSlug}/road?error=status-refresh-failed`);
  }

  revalidatePath(`/projects/${projectSlug}/road`);
  redirect(`/projects/${projectSlug}/road?status=status-refreshed`);
}
