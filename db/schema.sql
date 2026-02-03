create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sentiment') then
    create type sentiment as enum ('positivo', 'neutral', 'negativo');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type media_type as enum ('texto', 'video', 'audio', 'imagen');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_severity') then
    create type alert_severity as enum ('critical', 'high', 'medium', 'low');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_status') then
    create type alert_status as enum ('open', 'ack', 'snoozed', 'resolved', 'escalated');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_scope_type') then
    create type alert_scope_type as enum ('overall', 'cluster', 'subcluster', 'microcluster', 'city', 'platform');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_signal_type') then
    create type alert_signal_type as enum ('volume', 'negativity', 'risk', 'viral');
  end if;
end
$$;

create table if not exists platforms (
  id text primary key,
  display_name text not null
);

create table if not exists topics (
  id text primary key,
  display_name text not null
);

create table if not exists clusters (
  id text primary key,
  display_name text not null,
  description text
);

create table if not exists subclusters (
  id text primary key,
  cluster_id text not null references clusters(id) on delete cascade,
  display_name text not null,
  unique (cluster_id, display_name)
);

create table if not exists microclusters (
  id text primary key,
  subcluster_id text not null references subclusters(id) on delete cascade,
  display_name text not null,
  unique (subcluster_id, display_name)
);

create table if not exists locations (
  id text primary key,
  city text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null
);

create table if not exists posts (
  id text primary key,
  author text not null,
  handle text,
  platform_id text references platforms(id),
  content text not null,
  sentiment sentiment not null,
  topic_id text references topics(id),
  location_id text references locations(id),
  timestamp timestamptz not null,
  reach integer not null,
  engagement integer not null,
  media_type media_type not null,
  cluster_id text references clusters(id),
  subcluster_id text references subclusters(id),
  microcluster_id text references microclusters(id)
);

create table if not exists classification_labels (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  color text,
  priority integer default 0
);

create table if not exists post_classifications (
  id uuid default gen_random_uuid() primary key,
  post_id text references posts(id) on delete cascade,
  label_id uuid references classification_labels(id),
  source text default 'manual',
  confidence numeric(5, 2),
  created_at timestamptz default now()
);

create table if not exists post_actions (
  id uuid default gen_random_uuid() primary key,
  post_id text references posts(id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists insight_requests (
  id uuid default gen_random_uuid() primary key,
  title text,
  request text,
  status text not null default 'pendiente',
  created_at timestamptz default now()
);

create table if not exists insight_snapshots (
  id uuid default gen_random_uuid() primary key,
  scope text not null,
  scope_id text,
  window_start timestamptz,
  window_end timestamptz,
  total_posts integer,
  reach bigint,
  avg_engagement numeric(10, 2),
  sentiment_index numeric(5, 2),
  reputational_risk numeric(5, 2),
  polarization numeric(5, 2),
  viral_propensity numeric(5, 2),
  created_at timestamptz default now()
);

create table if not exists alerts (
  id text primary key,
  scope_type alert_scope_type not null,
  scope_id text not null,
  scope_label text,
  title text,
  summary text,
  severity alert_severity not null default 'low',
  status alert_status not null default 'open',
  priority integer default 0,
  owner text,
  team text,
  assignee text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  last_status_at timestamptz,
  ack_at timestamptz,
  resolved_at timestamptz,
  snooze_until timestamptz,
  occurrences integer not null default 0,
  active_window_count integer not null default 0,
  confidence numeric(5, 2),
  rule_ids text[],
  rule_values jsonb,
  unique_authors integer,
  new_authors_pct numeric(5, 2),
  geo_spread integer,
  top_entities jsonb,
  keywords jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists alert_instances (
  id text primary key,
  alert_id text not null references alerts(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  severity alert_severity not null,
  status alert_status not null,
  volume_current integer not null,
  volume_prev integer not null,
  volume_delta_pct numeric(6, 2) not null,
  negative_share numeric(6, 2) not null,
  risk_score numeric(6, 2) not null,
  reach bigint not null,
  engagement bigint not null,
  engagement_rate numeric(6, 2) not null,
  impact_score numeric(10, 2) not null,
  impact_ratio numeric(6, 2) not null,
  unique_authors integer,
  new_authors_pct numeric(6, 2),
  geo_spread integer,
  signals jsonb,
  top_topics jsonb,
  top_entities jsonb,
  keywords jsonb,
  evidence jsonb,
  created_at timestamptz default now()
);

create table if not exists alert_actions (
  id uuid default gen_random_uuid() primary key,
  alert_id text not null references alerts(id) on delete cascade,
  action text not null,
  actor text,
  note text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists alert_metrics (
  id uuid default gen_random_uuid() primary key,
  alert_id text not null references alerts(id) on delete cascade,
  bucket_date date not null,
  total integer not null,
  critical integer default 0,
  high integer default 0,
  medium integer default 0,
  low integer default 0,
  volume integer,
  negative_share numeric(6, 2),
  risk_score numeric(6, 2),
  impact_ratio numeric(6, 2),
  reach bigint,
  engagement bigint,
  unique_authors integer,
  geo_spread integer,
  created_at timestamptz default now(),
  unique (alert_id, bucket_date)
);

create table if not exists alert_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  signal_type alert_signal_type not null,
  scope_type alert_scope_type,
  scope_id text,
  thresholds jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (signal_type, scope_type, scope_id)
);

create index if not exists idx_posts_timestamp on posts (timestamp desc);
create index if not exists idx_posts_cluster on posts (cluster_id);
create index if not exists idx_posts_topic on posts (topic_id);
create index if not exists idx_posts_location on posts (location_id);
create index if not exists idx_posts_sentiment on posts (sentiment);
create index if not exists idx_alerts_status on alerts (status);
create index if not exists idx_alerts_severity on alerts (severity);
create index if not exists idx_alerts_scope on alerts (scope_type, scope_id);
create index if not exists idx_alert_instances_alert on alert_instances (alert_id);
create index if not exists idx_alert_instances_window on alert_instances (window_start desc);
create index if not exists idx_alert_actions_alert on alert_actions (alert_id);
create index if not exists idx_alert_actions_created on alert_actions (created_at desc);
create index if not exists idx_alert_metrics_alert on alert_metrics (alert_id);
