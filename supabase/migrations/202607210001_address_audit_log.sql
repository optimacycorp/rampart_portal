create table if not exists address_audit_log (
  id bigserial primary key,
  action text not null,
  query_text text not null,
  provider text not null,
  normalized_address text,
  result_count integer,
  success boolean not null default false,
  status_code integer not null,
  caller_system text,
  client_ip text,
  user_agent text,
  request_headers jsonb,
  response_summary jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists address_audit_log_created_at_idx
  on address_audit_log (created_at desc);

create index if not exists address_audit_log_action_created_at_idx
  on address_audit_log (action, created_at desc);
