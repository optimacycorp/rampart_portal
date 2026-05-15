alter table documents
  add column if not exists current_version_number integer not null default 1;

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  file_path text not null,
  notes text,
  is_current boolean not null default false,
  superseded_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists document_versions_document_version_idx
  on document_versions (document_id, version_number);

create unique index if not exists document_versions_single_current_idx
  on document_versions (document_id)
  where is_current = true;

insert into document_versions (
  document_id,
  version_number,
  file_path,
  notes,
  is_current,
  created_at
)
select
  d.id,
  coalesce(d.current_version_number, 1),
  d.file_path,
  d.notes,
  true,
  d.created_at
from documents d
where d.file_path is not null
  and not exists (
    select 1
    from document_versions dv
    where dv.document_id = d.id
  );
