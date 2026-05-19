alter table meeting_transcripts
  add column if not exists transcription_status text not null default 'not_requested',
  add column if not exists transcription_model text,
  add column if not exists transcription_error text;

update meeting_transcripts
set transcription_status = case
  when coalesce(trim(transcript_text), '') <> '' then 'provided'
  when audio_file_path is not null then 'audio_uploaded'
  else 'not_requested'
end
where transcription_status is null
   or transcription_status = 'not_requested';
