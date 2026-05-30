-- ════════════════════════════════════════════════════════════════════
-- Villa Ajloun — Platform schema (Phase 0)
-- Run on a fresh Supabase project (SQL editor) or via `supabase db reset`.
-- ════════════════════════════════════════════════════════════════════

-- ─── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type app_role          as enum ('admin','owner','consultant','contractor');
  create type activity_status    as enum ('not_started','in_progress','on_hold','done','delayed');
  create type deliverable_status as enum ('not_started','in_progress','submitted','under_review','approved','rejected','delivered');
  create type priority           as enum ('low','medium','high','critical');
  create type dep_type           as enum ('FS','SS','FF','SF');
  create type doc_category       as enum ('architectural','structural','mep','landscape','boq','rfi','shop_drawings','material_submittals','contracts','reports');
  create type approval_decision  as enum ('pending','approved','rejected','revise');
  create type milestone_status   as enum ('planned','in_progress','achieved','missed');
exception when duplicate_object then null; end $$;

-- ─── Identity ────────────────────────────────────────────────────────
create table if not exists profile (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  role          app_role not null default 'contractor',
  contractor_id uuid,
  avatar_url    text,
  created_at    timestamptz default now()
);

create table if not exists project (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  client_name text,
  start_date  date not null,
  end_date    date not null,
  budget      numeric(14,2),
  currency    text default 'JOD',
  health      int default 100,
  created_at  timestamptz default now()
);

create table if not exists contractor (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references project(id) on delete cascade,
  key           text not null,
  name          text not null,
  scope         text,
  color         text default '#7A9E7E',
  contact_email text,
  created_at    timestamptz default now(),
  unique(project_id, key)
);
do $$ begin
  alter table profile add constraint fk_profile_contractor
    foreign key (contractor_id) references contractor(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists stage (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  ord        int not null,
  name       text not null,
  unique(project_id, ord)
);

create table if not exists building (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  key        text not null,
  name       text not null,
  map_x real, map_y real, map_w real, map_h real,
  progress   int default 0,
  unique(project_id, key)
);

create table if not exists activity (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references project(id) on delete cascade,
  stage_id       uuid references stage(id) on delete set null,
  contractor_id  uuid references contractor(id) on delete set null,
  building_id    uuid references building(id) on delete set null,
  name           text not null,
  description    text,
  baseline_start date, baseline_end date,
  start_date     date not null, end_date date not null,
  actual_start   date, actual_end date,
  progress       int not null default 0 check (progress between 0 and 100),
  weight         numeric default 1,
  status         activity_status not null default 'not_started',
  is_critical    boolean default false,
  is_milestone   boolean default false,
  sort           int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_activity_proj on activity(project_id, stage_id, sort);
create index if not exists idx_activity_contractor on activity(contractor_id);

create table if not exists activity_dependency (
  predecessor_id uuid not null references activity(id) on delete cascade,
  successor_id   uuid not null references activity(id) on delete cascade,
  type           dep_type not null default 'FS',
  lag_days       int default 0,
  primary key (predecessor_id, successor_id)
);

create table if not exists deliverable (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activity(id) on delete cascade,
  project_id    uuid not null references project(id) on delete cascade,
  contractor_id uuid references contractor(id) on delete set null,
  name          text not null,
  category      doc_category,
  priority      priority not null default 'medium',
  status        deliverable_status not null default 'not_started',
  due_date      date,
  responsible   uuid references profile(user_id),
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_deliv_proj on deliverable(project_id, status);
create index if not exists idx_deliv_activity on deliverable(activity_id);

create table if not exists approval (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  subject_type text not null,
  subject_id   uuid not null,
  submitted_by uuid references profile(user_id),
  reviewer     uuid references profile(user_id),
  decision     approval_decision not null default 'pending',
  comment      text,
  created_at   timestamptz default now(),
  decided_at   timestamptz
);

create table if not exists document (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references project(id) on delete cascade,
  contractor_id   uuid references contractor(id) on delete set null,
  activity_id     uuid references activity(id) on delete set null,
  building_id     uuid references building(id) on delete set null,
  title           text not null,
  category        doc_category not null,
  current_version int default 1,
  status          deliverable_status default 'submitted',
  created_by      uuid references profile(user_id),
  created_at      timestamptz default now()
);
create table if not exists document_version (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references document(id) on delete cascade,
  version      int not null,
  storage_path text not null,
  size_bytes   bigint, mime text,
  uploaded_by  uuid references profile(user_id),
  uploaded_at  timestamptz default now(),
  unique(document_id, version)
);
create table if not exists document_download (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references document(id) on delete cascade,
  version       int,
  downloaded_by uuid references profile(user_id),
  at            timestamptz default now()
);

create table if not exists attachment (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  subject_type text not null, subject_id uuid not null,
  kind         text not null default 'file',
  storage_path text not null, name text, mime text,
  uploaded_by  uuid references profile(user_id),
  uploaded_at  timestamptz default now()
);
create index if not exists idx_attach on attachment(subject_type, subject_id);

create table if not exists comment (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  subject_type text not null, subject_id uuid not null,
  author       uuid references profile(user_id),
  body         text not null,
  created_at   timestamptz default now()
);
create index if not exists idx_comment on comment(subject_type, subject_id, created_at);

create table if not exists milestone (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  name         text not null,
  planned_date date, actual_date date,
  status       milestone_status default 'planned',
  ord          int default 0
);

create table if not exists cost_line (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references project(id) on delete cascade,
  contractor_id uuid references contractor(id),
  activity_id   uuid references activity(id),
  label         text,
  budget        numeric(14,2) default 0,
  committed     numeric(14,2) default 0,
  actual_cost   numeric(14,2) default 0,
  created_at    timestamptz default now()
);

create table if not exists event_log (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id) on delete cascade,
  actor        uuid references profile(user_id),
  actor_name   text,
  verb         text not null,
  subject_type text, subject_id uuid, subject_text text,
  meta         jsonb default '{}'::jsonb,
  at           timestamptz default now()
);
create index if not exists idx_event on event_log(project_id, at desc);

create table if not exists report (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references project(id) on delete cascade,
  week_of     date not null,
  summary_md  text,
  metrics     jsonb,
  created_by  uuid references profile(user_id),
  created_at  timestamptz default now()
);

-- ─── Role helpers ────────────────────────────────────────────────────
create or replace function my_role() returns app_role
  language sql stable security definer set search_path = public as
$$ select role from profile where user_id = auth.uid() $$;

create or replace function my_contractor() returns uuid
  language sql stable security definer set search_path = public as
$$ select contractor_id from profile where user_id = auth.uid() $$;

-- ─── Auto-create a profile when a user signs up ──────────────────────
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profile (user_id, email, role)
  values (new.id, new.email, 'contractor')
  on conflict (user_id) do nothing;
  return new;
end $$;
do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users for each row execute function handle_new_user();
exception when duplicate_object then null; end $$;

-- ─── Metrics view ────────────────────────────────────────────────────
create or replace view project_metrics as
select
  p.id as project_id,
  round(coalesce(sum(a.progress * a.weight) / nullif(sum(a.weight),0), 0))::int as progress,
  count(a.*) filter (where a.status = 'delayed')                                as delayed_activities,
  count(a.*)                                                                    as total_activities
from project p left join activity a on a.project_id = p.id
group by p.id;

-- ─── Row-level security ──────────────────────────────────────────────
alter table profile      enable row level security;
alter table project      enable row level security;
alter table contractor   enable row level security;
alter table stage        enable row level security;
alter table building     enable row level security;
alter table activity     enable row level security;
alter table deliverable  enable row level security;
alter table document     enable row level security;
alter table milestone    enable row level security;
alter table comment      enable row level security;
alter table approval     enable row level security;
alter table event_log    enable row level security;
alter table cost_line    enable row level security;

-- profile: read all (names shown across UI); update only your own
do $$ begin
  create policy p_profile_read on profile for select using (auth.uid() is not null);
  create policy p_profile_self on profile for update using (user_id = auth.uid());

  -- staff (admin/owner/consultant) read everything; contractors read their scope
  create policy p_proj_read   on project    for select using (auth.uid() is not null);
  create policy p_contr_read  on contractor for select using (auth.uid() is not null);
  create policy p_stage_read  on stage      for select using (auth.uid() is not null);
  create policy p_build_read  on building   for select using (auth.uid() is not null);
  create policy p_mile_read   on milestone  for select using (auth.uid() is not null);

  create policy p_act_read on activity for select using (
    auth.uid() is not null and (my_role() in ('admin','owner','consultant') or contractor_id = my_contractor())
  );
  create policy p_del_read on deliverable for select using (
    auth.uid() is not null and (my_role() in ('admin','owner','consultant') or contractor_id = my_contractor())
  );
  create policy p_doc_read on document for select using (
    auth.uid() is not null and (my_role() in ('admin','owner','consultant') or contractor_id = my_contractor())
  );
  create policy p_cmt_read on comment   for select using (auth.uid() is not null);
  create policy p_apr_read on approval   for select using (auth.uid() is not null);
  create policy p_evt_read on event_log  for select using (auth.uid() is not null);
  create policy p_cost_read on cost_line  for select using (my_role() in ('admin','owner','consultant'));

  -- writes: staff broad; contractors only their own activities/deliverables
  create policy p_act_write on activity for update using (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  ) with check (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  );
  create policy p_del_write on deliverable for all using (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  ) with check (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  );
  create policy p_cmt_write on comment for insert with check (auth.uid() is not null);
  create policy p_apr_write on approval for all using (my_role() in ('admin','consultant','owner'))
    with check (my_role() in ('admin','consultant','owner'));

  -- documents: staff write anything; contractor writes its own
  create policy p_doc_write on document for all using (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  ) with check (
    my_role() in ('admin','consultant') or (my_role()='contractor' and contractor_id = my_contractor())
  );
exception when duplicate_object then null; end $$;

-- document_version / download / attachment: enable RLS, allow any signed-in user
alter table document_version  enable row level security;
alter table document_download enable row level security;
alter table attachment        enable row level security;
do $$ begin
  create policy p_docver_all  on document_version  for all using (auth.uid() is not null) with check (auth.uid() is not null);
  create policy p_docdl_all   on document_download  for all using (auth.uid() is not null) with check (auth.uid() is not null);
  create policy p_attach_all  on attachment         for all using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- ─── Storage bucket for documents + photos ───────────────────────────
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;
do $$ begin
  create policy p_storage_read   on storage.objects for select using (bucket_id = 'documents' and auth.uid() is not null);
  create policy p_storage_write  on storage.objects for insert with check (bucket_id = 'documents' and auth.uid() is not null);
  create policy p_storage_update on storage.objects for update using (bucket_id = 'documents' and auth.uid() is not null);
exception when duplicate_object then null; end $$;
