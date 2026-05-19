alter table evidence_photos
  add column if not exists media_kind text not null default 'photo',
  add column if not exists mime_type text;

update evidence_photos
set media_kind = 'photo'
where media_kind is null;
