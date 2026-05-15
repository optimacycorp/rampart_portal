alter table field_points
  add column if not exists collected_at timestamptz;
