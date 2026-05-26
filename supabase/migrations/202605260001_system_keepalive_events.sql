create table if not exists system_keepalive_events (
  id bigserial primary key,
  source text not null,
  ran_at timestamptz not null default now(),
  status text not null default 'ok',
  details jsonb
);

create index if not exists system_keepalive_events_source_ran_at_idx
  on system_keepalive_events (source, ran_at desc);
