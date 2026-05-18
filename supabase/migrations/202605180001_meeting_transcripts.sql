create table if not exists meeting_transcripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  meeting_date date,
  participants text,
  source text,
  audio_file_path text,
  transcript_file_path text,
  transcript_text text,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('meeting-media', 'meeting-media', false)
on conflict (id) do nothing;
