alter table document_chunks
  add column if not exists source_type text not null default 'document',
  add column if not exists transcript_id uuid references meeting_transcripts(id) on delete cascade;

create index if not exists document_chunks_project_source_idx
  on document_chunks (project_id, source_type, created_at desc);

create index if not exists document_chunks_transcript_idx
  on document_chunks (transcript_id)
  where transcript_id is not null;
