create table if not exists lpr_known_vehicles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  plate_text text not null,
  label text not null,
  vehicle_kind text,
  owner_name text,
  access_level text not null default 'authorized',
  notes text,
  active boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lpr_known_vehicles_project_plate_idx
  on lpr_known_vehicles(project_id, plate_text);

create index if not exists lpr_known_vehicles_project_active_idx
  on lpr_known_vehicles(project_id, active, updated_at desc);

create table if not exists lpr_event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references lpr_events(id) on delete cascade,
  review_status text not null default 'pending',
  matched_known_vehicle_id uuid references lpr_known_vehicles(id) on delete set null,
  notes text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lpr_event_reviews_event_idx
  on lpr_event_reviews(event_id);

create index if not exists lpr_event_reviews_status_updated_idx
  on lpr_event_reviews(review_status, updated_at desc);
