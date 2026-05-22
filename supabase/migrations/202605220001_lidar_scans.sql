create table if not exists lidar_scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  scan_date date,
  equipment text default '3DMakerPro Eagle Max',
  coordinate_system text,
  center_easting numeric,
  center_northing numeric,
  center_elevation numeric,
  raw_file_path text,
  tile_path text,
  preview_image_path text,
  point_count bigint,
  area_acres numeric,
  min_elevation numeric,
  max_elevation numeric,
  notes text,
  created_at timestamptz default now()
);

create index if not exists lidar_scans_project_idx
  on lidar_scans (project_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('lidar-scans', 'lidar-scans', false)
on conflict (id) do nothing;
