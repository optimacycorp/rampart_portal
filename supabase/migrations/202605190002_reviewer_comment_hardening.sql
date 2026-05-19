alter table reviewer_comments
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists imported_from_document_id uuid references documents(id) on delete set null;

create index if not exists reviewer_comments_imported_from_document_idx
  on reviewer_comments (imported_from_document_id)
  where imported_from_document_id is not null;
