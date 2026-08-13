alter table road_closures_alerts
  add column if not exists external_alert_id text;

create unique index if not exists road_closures_alerts_source_external_idx
  on road_closures_alerts (source_id, external_alert_id)
  where external_alert_id is not null;
