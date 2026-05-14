create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  parcel_number text,
  address text,
  county text,
  state text default 'Colorado',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  document_type text not null,
  record_date date,
  reception_number text,
  book text,
  page text,
  source_agency text,
  file_path text,
  external_url text,
  notes text,
  status text default 'uploaded',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reviewer_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  application_number text,
  comment_id text,
  reviewer_name text,
  department text,
  status text default 'open',
  priority text default 'medium',
  comment_text text not null,
  response_text text,
  responsible_party text,
  linked_document_id uuid references documents(id),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists field_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  point_name text not null,
  point_type text not null,
  easting numeric,
  northing numeric,
  elevation numeric,
  coordinate_system text default 'NAD83(2011) Colorado Central ftUS + NAVD88 GEOID18',
  latitude numeric,
  longitude numeric,
  collection_method text,
  source_equipment text,
  confidence text default 'field_observed',
  description text,
  photo_document_id uuid references documents(id),
  created_at timestamptz default now()
);

create table if not exists culverts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  culvert_id text not null,
  inlet_point_id uuid references field_points(id),
  outlet_point_id uuid references field_points(id),
  diameter_inches numeric,
  material text,
  length_feet numeric,
  slope_percent numeric,
  condition text,
  ownership text,
  flow_direction text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  log_date date,
  access_feature text,
  status text,
  description text,
  road_condition text,
  gate_condition text,
  weather text,
  linked_document_id uuid references documents(id),
  created_at timestamptz default now()
);

create table if not exists evidence_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  photo_date date,
  latitude numeric,
  longitude numeric,
  easting numeric,
  northing numeric,
  direction_facing text,
  category text,
  file_path text,
  notes text,
  linked_point_id uuid references field_points(id),
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'viewer',
  organization text,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_document_type_check'
  ) then
    alter table documents
      add constraint documents_document_type_check
      check (
        document_type in (
          'deed',
          'easement',
          'annexation_agreement',
          'title_commitment',
          'survey',
          'plat',
          'drainage_report',
          'geohazard_report',
          'city_comment_letter',
          'usfs_correspondence',
          'fire_review',
          'utility_correspondence',
          'photo_log',
          'lidar',
          'other'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reviewer_comments_status_check'
  ) then
    alter table reviewer_comments
      add constraint reviewer_comments_status_check
      check (
        status in (
          'open',
          'in_progress',
          'waiting_on_city',
          'waiting_on_owner',
          'waiting_on_engineer',
          'resolved',
          'deferred'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reviewer_comments_priority_check'
  ) then
    alter table reviewer_comments
      add constraint reviewer_comments_priority_check
      check (priority in ('low', 'medium', 'high', 'critical'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'field_points_type_check'
  ) then
    alter table field_points
      add constraint field_points_type_check
      check (
        point_type in (
          'monument',
          'culvert_inlet',
          'culvert_outlet',
          'berm',
          'swale',
          'ditch',
          'road_edge',
          'gate',
          'turnout',
          'driveway',
          'building_corner',
          'control',
          'photo_station',
          'other'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'field_points_confidence_check'
  ) then
    alter table field_points
      add constraint field_points_confidence_check
      check (
        confidence in (
          'survey_control',
          'field_observed',
          'rtk_observed',
          'lidar_derived',
          'estimated',
          'historic',
          'needs_review'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'culverts_material_check'
  ) then
    alter table culverts
      add constraint culverts_material_check
      check (material in ('CMP', 'HDPE', 'RCP', 'PVC', 'concrete', 'unknown', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'culverts_ownership_check'
  ) then
    alter table culverts
      add constraint culverts_ownership_check
      check (ownership in ('private', 'city', 'usfs', 'unknown', 'shared'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'evidence_photos_category_check'
  ) then
    alter table evidence_photos
      add constraint evidence_photos_category_check
      check (
        category in (
          'culvert',
          'berm',
          'drainage',
          'road',
          'gate',
          'monument',
          'vegetation',
          'fire_access',
          'utility',
          'general'
        )
      );
  end if;
end
$$;

insert into projects (name, slug, description, parcel_number, address, county)
values (
  '3245 Rampart Range Road',
  '3245-rampart-range-road',
  'Rampart Range development, access, drainage, easement, and planning evidence portal.',
  '7333200002',
  '3245 Rampart Range Road, Colorado Springs, CO',
  'El Paso County'
)
on conflict (slug) do update
set
  description = excluded.description,
  parcel_number = excluded.parcel_number,
  address = excluded.address,
  county = excluded.county,
  updated_at = now();
