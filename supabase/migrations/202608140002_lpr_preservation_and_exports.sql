create table if not exists lpr_preserved_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references lpr_events(id) on delete cascade,
  case_reference text,
  preservation_reason text not null,
  preserve_until date,
  notes text,
  released_at timestamptz,
  preserved_by_user_id uuid references auth.users(id) on delete set null,
  preserved_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lpr_preserved_events_event_idx
  on lpr_preserved_events(event_id);

create index if not exists lpr_preserved_events_active_idx
  on lpr_preserved_events(released_at, preserve_until, updated_at desc);

create table if not exists lpr_export_audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  export_kind text not null,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  requested_by_email text,
  request_ip text,
  status_code integer not null,
  success boolean not null default false,
  row_count integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lpr_export_audit_log_project_created_idx
  on lpr_export_audit_log(project_id, created_at desc);
