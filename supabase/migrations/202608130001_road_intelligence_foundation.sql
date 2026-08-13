create extension if not exists postgis;

create table if not exists road_corridors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  road_number text,
  alternate_names text[],
  managing_agency text,
  description text,
  start_lat numeric,
  start_lon numeric,
  end_lat numeric,
  end_lon numeric,
  min_elevation_ft numeric,
  max_elevation_ft numeric,
  length_miles numeric,
  geom geometry(MultiLineString, 4326),
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists road_segments (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  segment_name text not null,
  sequence_no integer,
  start_mile numeric,
  end_mile numeric,
  start_elevation_ft numeric,
  end_elevation_ft numeric,
  avg_grade_percent numeric,
  max_grade_percent numeric,
  avg_width_ft numeric,
  min_width_ft numeric,
  surface_type text,
  geom geometry(LineString, 4326),
  notes text,
  created_at timestamptz default now()
);

create table if not exists road_data_sources (
  id uuid primary key default gen_random_uuid(),
  provider_key text unique not null,
  provider_name text not null,
  source_type text not null,
  authority_level text not null,
  base_url text,
  enabled boolean default true,
  ingestion_method text,
  default_refresh_minutes integer,
  parser_version text,
  terms_notes text,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists road_status_observations (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  segment_id uuid references road_segments(id),
  source_id uuid references road_data_sources(id),
  observed_at timestamptz not null,
  fetched_at timestamptz default now(),
  status text not null,
  gate_status text,
  restriction_type text,
  summary text,
  raw_status_text text,
  source_url text,
  effective_from timestamptz,
  effective_until timestamptz,
  confidence numeric,
  official boolean default false,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists road_closures_alerts (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  segment_id uuid references road_segments(id),
  source_id uuid references road_data_sources(id),
  alert_type text,
  severity text,
  title text not null,
  description text,
  effective_at timestamptz,
  expires_at timestamptz,
  active boolean default true,
  forest_order_number text,
  source_url text,
  source_document_id uuid references documents(id),
  geom geometry(Geometry, 4326),
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists road_weather_locations (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  elevation_ft numeric,
  station_identifier text,
  source text default 'nws',
  geom geometry(Point, 4326),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists weather_observations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references road_weather_locations(id) on delete cascade,
  source_id uuid references road_data_sources(id),
  observed_at timestamptz not null,
  temperature_f numeric,
  dewpoint_f numeric,
  relative_humidity_percent numeric,
  wind_speed_mph numeric,
  wind_gust_mph numeric,
  wind_direction_deg numeric,
  precipitation_1h_in numeric,
  precipitation_24h_in numeric,
  snow_depth_in numeric,
  visibility_miles numeric,
  pressure_mb numeric,
  weather_description text,
  raw_payload jsonb,
  fetched_at timestamptz default now(),
  unique(location_id, source_id, observed_at)
);

create table if not exists weather_forecasts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references road_weather_locations(id) on delete cascade,
  source_id uuid references road_data_sources(id),
  forecast_generated_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  temperature_f numeric,
  precipitation_probability numeric,
  snowfall_inches numeric,
  wind_speed_mph numeric,
  wind_gust_mph numeric,
  short_forecast text,
  detailed_forecast text,
  raw_payload jsonb,
  fetched_at timestamptz default now()
);

create table if not exists road_condition_reports (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  segment_id uuid references road_segments(id),
  report_source text,
  reported_by uuid references profiles(id),
  observed_at timestamptz not null,
  condition text,
  surface_condition text,
  mud_severity text,
  snow_severity text,
  rut_severity text,
  washout boolean default false,
  fallen_tree boolean default false,
  standing_water boolean default false,
  erosion boolean default false,
  passability text,
  recommended_vehicle text,
  description text,
  latitude numeric,
  longitude numeric,
  geom geometry(Point, 4326),
  photo_id uuid references evidence_photos(id),
  source_url text,
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists road_field_measurements (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  segment_id uuid references road_segments(id),
  measurement_type text not null,
  measured_at timestamptz,
  value numeric,
  units text,
  latitude numeric,
  longitude numeric,
  elevation_ft numeric,
  source_equipment text,
  source_point_id uuid references field_points(id),
  lidar_scan_id uuid references lidar_scans(id),
  notes text,
  created_at timestamptz default now()
);

create table if not exists road_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid references road_corridors(id) on delete cascade,
  snapshot_date date not null,
  consolidated_status text,
  gate_status text,
  status_confidence numeric,
  status_source text,
  min_temperature_f numeric,
  max_temperature_f numeric,
  precipitation_24h_in numeric,
  snowfall_24h_in numeric,
  max_wind_gust_mph numeric,
  active_weather_alerts integer default 0,
  active_usfs_alerts integer default 0,
  road_condition_score numeric,
  weather_risk_score numeric,
  overall_access_risk text,
  summary text,
  generated_at timestamptz default now(),
  source_snapshot jsonb,
  unique(corridor_id, snapshot_date)
);

create table if not exists road_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references road_data_sources(id),
  job_name text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text,
  records_received integer default 0,
  records_inserted integer default 0,
  records_updated integer default 0,
  http_status integer,
  error_message text,
  parser_version text,
  metadata jsonb
);

create index if not exists road_corridors_project_idx on road_corridors(project_id, active);
create index if not exists road_segments_corridor_idx on road_segments(corridor_id, sequence_no);
create index if not exists road_status_observations_corridor_time_idx on road_status_observations(corridor_id, observed_at desc);
create index if not exists road_closures_alerts_corridor_active_idx on road_closures_alerts(corridor_id, active, effective_at desc);
create index if not exists road_weather_locations_corridor_idx on road_weather_locations(corridor_id, active);
create index if not exists weather_forecasts_location_period_idx on weather_forecasts(location_id, period_start desc);
create index if not exists road_condition_reports_corridor_time_idx on road_condition_reports(corridor_id, observed_at desc);
create index if not exists road_field_measurements_corridor_type_idx on road_field_measurements(corridor_id, measurement_type, measured_at desc);
create index if not exists road_daily_snapshots_corridor_date_idx on road_daily_snapshots(corridor_id, snapshot_date desc);
create index if not exists road_ingestion_runs_source_started_idx on road_ingestion_runs(source_id, started_at desc);

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
values
  ('usfs_psicc', 'US Forest Service PSICC', 'closure', 'authoritative', 'https://www.fs.usda.gov/r02/psicc/recreation/rampart-range-recreation-area', true, 'http_parse', 360, 'v1', 'Authority layer for closures, orders, recreation notices, and fire restrictions.'),
  ('rrmmc', 'Rampart Range Motorized Management Committee', 'road_status', 'partner_observation', 'https://rampartrange.org/', true, 'http_parse', 240, 'v1', 'Partner observation layer; does not override a USFS order.'),
  ('nws', 'National Weather Service', 'weather', 'authoritative_weather', 'https://api.weather.gov/', true, 'api', 60, 'v1', 'Weather observations, forecasts, and alerts.'),
  ('cotrex', 'Colorado Trail Explorer', 'community_conditions', 'state_community', 'https://trails.colorado.gov/', false, 'manual_or_api', 720, 'v1', 'Community/state evidence layer only.')
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

insert into road_corridors (
  project_id,
  name,
  road_number,
  alternate_names,
  managing_agency,
  description,
  min_elevation_ft,
  max_elevation_ft,
  length_miles,
  active
)
select
  p.id,
  'Rampart Range Road / FS 0300',
  'FS 0300',
  array['Rampart Range Road', 'Forest Road 300', 'NFSR 300'],
  'USDA Forest Service',
  'Primary corridor used for project access coordination, road intelligence, field reporting, and future LiDAR roadway analytics.',
  6800,
  9200,
  19.4,
  true
from projects p
where p.slug = '3245-rampart-range-road'
  and not exists (
    select 1 from road_corridors rc
    where rc.project_id = p.id
      and rc.road_number = 'FS 0300'
  );

insert into road_weather_locations (
  corridor_id,
  name,
  latitude,
  longitude,
  elevation_ft,
  station_identifier,
  source,
  active
)
select
  rc.id,
  sample.name,
  sample.latitude,
  sample.longitude,
  sample.elevation_ft,
  sample.station_identifier,
  'nws',
  true
from road_corridors rc
cross join (
  values
    ('3245 Rampart Range', 38.9209::numeric, -104.6179::numeric, 6970::numeric, 'RAMPART-LOWER'),
    ('Rampart Reservoir vicinity', 39.0794::numeric, -104.9632::numeric, 9100::numeric, 'RAMPART-MID')
) as sample(name, latitude, longitude, elevation_ft, station_identifier)
where rc.road_number = 'FS 0300'
  and not exists (
    select 1 from road_weather_locations rwl
    where rwl.corridor_id = rc.id
      and rwl.name = sample.name
  );

create or replace view road_current_status as
with latest_official as (
  select distinct on (corridor_id)
    corridor_id,
    status,
    observed_at,
    source_id,
    gate_status
  from road_status_observations
  where official = true
  order by corridor_id, observed_at desc
),
latest_partner as (
  select distinct on (rso.corridor_id)
    rso.corridor_id,
    rso.status,
    rso.observed_at
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
    observed_at
  from road_condition_reports
  order by corridor_id, observed_at desc
),
active_alerts as (
  select
    corridor_id,
    count(*) filter (where active = true and coalesce(alert_type, '') not in ('flood', 'flash_flood', 'snow', 'thunderstorm', 'wind')) as active_usfs_alert_count,
    count(*) filter (where active = true and coalesce(alert_type, '') in ('flood', 'flash_flood', 'snow', 'thunderstorm', 'wind')) as active_weather_alert_count
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
)
select
  rc.id as corridor_id,
  rc.name as road_name,
  lo.status as official_status,
  lo.observed_at as official_status_time,
  rds.provider_name as official_status_source,
  lp.status as partner_status,
  lp.observed_at as partner_status_time,
  lo.gate_status,
  coalesce(aa.active_usfs_alert_count, 0) as active_usfs_alert_count,
  coalesce(aa.active_weather_alert_count, 0) as active_weather_alert_count,
  lw.temperature_f,
  lw.weather_description,
  lw.wind_speed_mph as wind_mph,
  lw.wind_gust_mph as wind_gust_mph,
  lf.snowfall_inches as forecast_snow_inches,
  lf.precipitation_probability as forecast_precip_probability,
  lcr.description as latest_condition_report,
  coalesce(ls.overall_access_risk, 'unknown') as overall_access_risk,
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
left join active_alerts aa on aa.corridor_id = rc.id
left join latest_snapshot ls on ls.corridor_id = rc.id;
