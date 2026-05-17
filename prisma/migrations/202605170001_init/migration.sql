create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists users (
  id text primary key,
  email text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  description text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists style_models (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  features jsonb not null default '{}'::jsonb,
  forbidden_words jsonb not null default '[]'::jsonb,
  lock_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists corpus_chunks (
  id text primary key,
  style_model_id text not null references style_models(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1024),
  type text not null default 'core',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists calibration_logs (
  id text primary key,
  style_model_id text not null references style_models(id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists characters (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  trigger_keywords text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists character_relations (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  character_a text not null references characters(id) on delete cascade,
  character_b text not null references characters(id) on delete cascade,
  affinity integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists world_items (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  type text not null,
  trigger_keywords text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists timeline_events (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chapters (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sentinel_logs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  chapter_id text references chapters(id) on delete set null,
  conflict_description text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists writing_sessions (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists style_models_project_id_idx on style_models(project_id);
create index if not exists corpus_chunks_style_model_id_idx on corpus_chunks(style_model_id);
create index if not exists calibration_logs_style_model_id_created_at_idx on calibration_logs(style_model_id, created_at);
create index if not exists characters_project_id_idx on characters(project_id);
create index if not exists character_relations_project_id_idx on character_relations(project_id);
create index if not exists character_relations_character_a_idx on character_relations(character_a);
create index if not exists character_relations_character_b_idx on character_relations(character_b);
create index if not exists world_items_project_id_idx on world_items(project_id);
create index if not exists timeline_events_project_id_idx on timeline_events(project_id);
create index if not exists chapters_project_id_idx on chapters(project_id);
create index if not exists sentinel_logs_project_id_created_at_idx on sentinel_logs(project_id, created_at);
create index if not exists sentinel_logs_chapter_id_idx on sentinel_logs(chapter_id);
create index if not exists writing_sessions_project_id_created_at_idx on writing_sessions(project_id, created_at);

alter table users enable row level security;
alter table projects enable row level security;
alter table style_models enable row level security;
alter table corpus_chunks enable row level security;
alter table calibration_logs enable row level security;
alter table characters enable row level security;
alter table character_relations enable row level security;
alter table world_items enable row level security;
alter table timeline_events enable row level security;
alter table chapters enable row level security;
alter table sentinel_logs enable row level security;
alter table writing_sessions enable row level security;
