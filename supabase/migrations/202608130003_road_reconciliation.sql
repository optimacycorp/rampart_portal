create table if not exists road_status_events (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  event_type text,
  old_value text,
  new_value text,
  detected_at timestamptz default now(),
  source_id uuid references road_data_sources(id),
  supporting_observation_id uuid references road_status_observations(id),
  description text
);

create index if not exists road_status_events_corridor_detected_idx
  on road_status_events (corridor_id, detected_at desc);

create index if not exists road_status_events_type_detected_idx
  on road_status_events (event_type, detected_at desc);

insert into road_data_sources (
  provider_key,
  provider_name,
  source_type,
  authority_level,
  base_url,
  enabled,
  ingestion_method,
  default_refresh_minutes,
  parser_version,
  terms_notes
)
values (
  'portal_system',
  'Rampart Portal Reconciliation Engine',
  'derived_status',
  'manual_external',
  'https://www.rampart-range.org',
  true,
  'deterministic_rules',
  15,
  'v1',
  'System-derived coordination status using deterministic precedence rules. Not an official closure authority.'
)
on conflict (provider_key) do update
set
  provider_name = excluded.provider_name,
  source_type = excluded.source_type,
  authority_level = excluded.authority_level,
  base_url = excluded.base_url,
  enabled = excluded.enabled,
  ingestion_method = excluded.ingestion_method,
  default_refresh_minutes = excluded.default_refresh_minutes,
  parser_version = excluded.parser_version,
  terms_notes = excluded.terms_notes,
  updated_at = now();

drop view if exists road_current_status;

create view road_current_status as
with latest_official as (
  select distinct on (rso.corridor_id)
    rso.id,
    rso.corridor_id,
    rso.status,
    rso.observed_at,
    rso.source_id,
    rso.gate_status,
    rso.summary
  from road_status_observations rso
  where rso.official = true
  order by rso.corridor_id, rso.observed_at desc
),
latest_partner as (
  select distinct on (rso.corridor_id)
    rso.id,
    rso.corridor_id,
    rso.status,
    rso.observed_at,
    rso.source_id,
    rso.summary
  from road_status_observations rso
  join road_data_sources rds on rds.id = rso.source_id
  where rds.authority_level = 'partner_observation'
  order by rso.corridor_id, rso.observed_at desc
),
latest_weather as (
  select distinct on (rc.id)
    rc.id as corridor_id,
    wo.temperature_f,
    wo.weather_description,
    wo.wind_speed_mph,
    wo.wind_gust_mph,
    wo.observed_at
  from road_corridors rc
  left join road_weather_locations rwl on rwl.corridor_id = rc.id and rwl.active = true
  left join weather_observations wo on wo.location_id = rwl.id
  order by rc.id, wo.observed_at desc nulls last
),
latest_forecast as (
  select distinct on (rc.id)
    rc.id as corridor_id,
    wf.snowfall_inches,
    wf.precipitation_probability,
    coalesce(wf.period_start, wf.forecast_generated_at) as forecast_time
  from road_corridors rc
  left join road_weather_locations rwl on rwl.corridor_id = rc.id and rwl.active = true
  left join weather_forecasts wf on wf.location_id = rwl.id
  order by rc.id, coalesce(wf.period_start, wf.forecast_generated_at) desc nulls last
),
latest_condition_report as (
  select distinct on (corridor_id)
    corridor_id,
    description,
    observed_at,
    verified
  from road_condition_reports
  order by corridor_id, observed_at desc
),
latest_verified_condition_report as (
  select distinct on (corridor_id)
    corridor_id,
    description,
    observed_at
  from road_condition_reports
  where verified = true
  order by corridor_id, observed_at desc
),
condition_report_counts as (
  select
    corridor_id,
    count(*) filter (where observed_at >= now() - interval '7 days') as condition_report_count_7d
  from road_condition_reports
  group by corridor_id
),
active_alerts as (
  select
    corridor_id,
    count(*) filter (
      where active = true and coalesce(alert_type, '') not in ('flood', 'flash_flood', 'snow', 'thunderstorm', 'wind')
    ) as active_usfs_alert_count,
    count(*) filter (
      where active = true and coalesce(alert_type, '') in ('flood', 'flash_flood', 'snow', 'thunderstorm', 'wind')
    ) as active_weather_alert_count,
    bool_or(active = true and coalesce(alert_type, '') in ('emergency_closure', 'winter_closure')) as has_active_closure_alert,
    bool_or(active = true and coalesce(alert_type, '') = 'fire_restriction') as has_active_fire_restriction
  from road_closures_alerts
  group by corridor_id
),
latest_snapshot as (
  select distinct on (corridor_id)
    corridor_id,
    overall_access_risk,
    generated_at
  from road_daily_snapshots
  order by corridor_id, snapshot_date desc
),
reconciled as (
  select
    rc.id as corridor_id,
    case
      when coalesce(aa.has_active_closure_alert, false) then 'closed'
      when lo.status is not null and lo.status not in ('unknown', 'not_reported') then lo.status
      when lp.status is not null and lp.status not in ('unknown', 'not_reported') then lp.status
      else 'unknown'
    end as consolidated_status,
    case
      when coalesce(aa.has_active_closure_alert, false)
        then 'Active authoritative USFS closure alert overrides partner or weather observations.'
      when lo.status is not null and lo.status not in ('unknown', 'not_reported')
        then 'Using latest authoritative USFS status because authoritative sources override partner observations.'
      when lp.status is not null and lp.status not in ('unknown', 'not_reported')
        then 'No active authoritative closure detected, so the latest partner observation is used.'
      else 'No current authoritative or partner road status observation is available.'
    end as consolidated_status_reason,
    case
      when coalesce(aa.has_active_closure_alert, false) then 'USFS alert'
      when lo.status is not null and lo.status not in ('unknown', 'not_reported') then coalesce(rds_official.provider_name, 'Authoritative source')
      when lp.status is not null and lp.status not in ('unknown', 'not_reported') then coalesce(rds_partner.provider_name, 'Partner source')
      else 'Unknown'
    end as consolidated_status_source,
    greatest(
      coalesce(lo.observed_at, to_timestamp(0)),
      coalesce(lp.observed_at, to_timestamp(0))
    ) as consolidated_status_time
  from road_corridors rc
  left join latest_official lo on lo.corridor_id = rc.id
  left join latest_partner lp on lp.corridor_id = rc.id
  left join road_data_sources rds_official on rds_official.id = lo.source_id
  left join road_data_sources rds_partner on rds_partner.id = lp.source_id
  left join active_alerts aa on aa.corridor_id = rc.id
)
select
  rc.id as corridor_id,
  rc.name as road_name,
  reconciled.consolidated_status,
  reconciled.consolidated_status_reason,
  reconciled.consolidated_status_source,
  reconciled.consolidated_status_time,
  lo.status as official_status,
  lo.observed_at as official_status_time,
  rds.provider_name as official_status_source,
  lp.status as partner_status,
  lp.observed_at as partner_status_time,
  coalesce(lo.gate_status, 'unknown') as gate_status,
  coalesce(aa.active_usfs_alert_count, 0) as active_usfs_alert_count,
  coalesce(aa.active_weather_alert_count, 0) as active_weather_alert_count,
  lw.temperature_f,
  lw.weather_description,
  lw.wind_speed_mph as wind_mph,
  lw.wind_gust_mph as wind_gust_mph,
  lf.snowfall_inches as forecast_snow_inches,
  lf.precipitation_probability as forecast_precip_probability,
  lcr.description as latest_condition_report,
  lvcr.description as latest_verified_condition_report,
  coalesce(crc.condition_report_count_7d, 0) as condition_report_count_7d,
  case
    when reconciled.consolidated_status in ('closed', 'seasonal_closure') then 'severe'
    when coalesce(aa.has_active_fire_restriction, false) then 'high'
    when coalesce(aa.active_weather_alert_count, 0) > 0 then 'high'
    else coalesce(ls.overall_access_risk, 'unknown')
  end as overall_access_risk,
  greatest(
    coalesce(lo.observed_at, to_timestamp(0)),
    coalesce(lp.observed_at, to_timestamp(0)),
    coalesce(lw.observed_at, to_timestamp(0)),
    coalesce(ls.generated_at, to_timestamp(0))
  ) as last_updated
from road_corridors rc
left join latest_official lo on lo.corridor_id = rc.id
left join road_data_sources rds on rds.id = lo.source_id
left join latest_partner lp on lp.corridor_id = rc.id
left join latest_weather lw on lw.corridor_id = rc.id
left join latest_forecast lf on lf.corridor_id = rc.id
left join latest_condition_report lcr on lcr.corridor_id = rc.id
left join latest_verified_condition_report lvcr on lvcr.corridor_id = rc.id
left join condition_report_counts crc on crc.corridor_id = rc.id
left join active_alerts aa on aa.corridor_id = rc.id
left join latest_snapshot ls on ls.corridor_id = rc.id
left join reconciled on reconciled.corridor_id = rc.id;
