create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sentiment') then
    create type sentiment as enum ('positivo', 'neutral', 'negativo');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type media_type as enum ('texto', 'video', 'audio', 'imagen');
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

create index if not exists idx_posts_timestamp on posts (timestamp desc);
create index if not exists idx_posts_cluster on posts (cluster_id);
create index if not exists idx_posts_topic on posts (topic_id);
create index if not exists idx_posts_location on posts (location_id);
create index if not exists idx_posts_sentiment on posts (sentiment);
