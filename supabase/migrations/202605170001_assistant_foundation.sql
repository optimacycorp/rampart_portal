create extension if not exists vector;

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open',
  priority text default 'medium',
  responsible_party text,
  waiting_on text,
  due_date date,
  linked_comment_id uuid references reviewer_comments(id),
  linked_document_id uuid references documents(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  chunk_text text not null,
  page_number integer,
  section_label text,
  embedding vector(1536),
  created_at timestamptz default now()
);
