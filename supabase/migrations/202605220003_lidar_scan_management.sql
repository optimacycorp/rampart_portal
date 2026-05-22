alter table lidar_scans
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists status text not null default 'registered',
  add column if not exists processing_stage text not null default 'raw_uploaded',
  add column if not exists tile_format text default 'potree',
  add column if not exists updated_at timestamptz default now();

update lidar_scans
set
  status = coalesce(status, 'registered'),
  processing_stage = coalesce(processing_stage, 'raw_uploaded'),
  tile_format = coalesce(tile_format, 'potree'),
  updated_at = coalesce(updated_at, created_at, now())
where status is null
   or processing_stage is null
   or tile_format is null
   or updated_at is null;
