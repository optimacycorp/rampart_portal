alter table field_points
  add column if not exists import_batch_name text;
