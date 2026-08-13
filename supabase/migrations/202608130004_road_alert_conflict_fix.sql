drop index if exists road_closures_alerts_source_external_idx;

create unique index if not exists road_closures_alerts_source_external_idx
  on road_closures_alerts (source_id, external_alert_id);
