alter table lpr_cameras
  add column if not exists camera_key text;

create unique index if not exists lpr_cameras_camera_key_idx
  on lpr_cameras(camera_key)
  where camera_key is not null;

create table if not exists lpr_ingest_audit_log (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid references lpr_cameras(id) on delete set null,
  action text not null,
  success boolean not null default false,
  status_code integer not null,
  caller_system text,
  client_ip text,
  user_agent text,
  error_message text,
  request_headers jsonb,
  request_payload jsonb,
  response_summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lpr_ingest_audit_log_camera_created_idx
  on lpr_ingest_audit_log(camera_id, created_at desc);

create index if not exists lpr_ingest_audit_log_created_idx
  on lpr_ingest_audit_log(created_at desc);
