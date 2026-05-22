alter table lidar_scans
  add column if not exists center_latitude numeric,
  add column if not exists center_longitude numeric,
  add column if not exists bbox_west numeric,
  add column if not exists bbox_south numeric,
  add column if not exists bbox_east numeric,
  add column if not exists bbox_north numeric;
