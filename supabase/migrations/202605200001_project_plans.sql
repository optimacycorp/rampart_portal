create table if not exists project_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  plan_type text not null,
  title text not null,
  description text,
  current_version_number integer not null default 1,
  current_file_path text,
  current_mime_type text,
  current_file_name text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint project_plans_plan_type_check check (plan_type in ('site_plan', 'land_usability', 'final_plat', 'building_plans')),
  constraint project_plans_project_plan_type_unique unique (project_id, plan_type)
);

create table if not exists project_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references project_plans(id) on delete cascade,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  version_number integer not null,
  file_path text not null,
  file_name text,
  mime_type text,
  notes text,
  is_current boolean not null default false,
  superseded_at timestamptz,
  created_at timestamptz default now(),
  constraint project_plan_versions_plan_version_unique unique (plan_id, version_number)
);

create unique index if not exists project_plan_versions_single_current_idx
  on project_plan_versions (plan_id)
  where is_current = true;

insert into storage.buckets (id, name, public)
values ('project-plans', 'project-plans', false)
on conflict (id) do nothing;
