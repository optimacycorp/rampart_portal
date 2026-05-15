alter table documents
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text;

alter table document_versions
  add column if not exists uploaded_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_by_email text;

alter table field_points
  add column if not exists uploaded_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_by_email text,
  add column if not exists import_source_file text;
