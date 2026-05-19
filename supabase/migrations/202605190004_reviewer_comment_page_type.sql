alter table reviewer_comments
  add column if not exists page_reference text,
  add column if not exists annotation_type text;
