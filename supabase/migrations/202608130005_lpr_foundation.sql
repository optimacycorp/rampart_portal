create table if not exists lpr_cameras (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  manufacturer text,
  model text,
  latitude numeric,
  longitude numeric,
  elevation_ft numeric,
  install_location text,
  direction_facing text,
  connectivity text,
  power_source text default 'solar',
  solar_panel_watts numeric,
  battery_wh numeric,
  camera_ip text,
  integration_type text,
  active boolean default true,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists lpr_events (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid references lpr_cameras(id) on delete cascade,
  observed_at timestamptz not null,
  plate_text text,
  plate_confidence numeric,
  plate_state text,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  direction text,
  image_path text,
  plate_crop_path text,
  event_latitude numeric,
  event_longitude numeric,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists lpr_daily_stats (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid references lpr_cameras(id) on delete cascade,
  stat_date date not null,
  total_vehicles integer default 0,
  unique_plates integer default 0,
  inbound_count integer default 0,
  outbound_count integer default 0,
  first_vehicle_at timestamptz,
  last_vehicle_at timestamptz,
  unique(camera_id, stat_date)
);

create index if not exists lpr_cameras_project_active_idx on lpr_cameras(project_id, active, created_at desc);
create index if not exists lpr_events_camera_observed_idx on lpr_events(camera_id, observed_at desc);
create index if not exists lpr_daily_stats_camera_date_idx on lpr_daily_stats(camera_id, stat_date desc);
