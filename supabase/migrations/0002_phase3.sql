-- ════════════════════════════════════════════════════════════════════
-- Phase 3 — team management, owner approvals, snapshots
-- Run AFTER 0001_init.sql.
-- ════════════════════════════════════════════════════════════════════

-- ─── Team roster: admin assigns role/scope by email; applied on signup ──
create table if not exists team_member (
  email         text primary key,
  role          app_role not null default 'contractor',
  contractor_id uuid references contractor(id) on delete set null,
  full_name     text,
  created_at    timestamptz default now()
);
alter table team_member enable row level security;
do $$ begin
  create policy p_team_admin on team_member for all
    using (my_role() = 'admin') with check (my_role() = 'admin');
  -- let admins manage any profile (not just their own)
  create policy p_profile_admin on profile for all
    using (my_role() = 'admin') with check (my_role() = 'admin');
exception when duplicate_object then null; end $$;

-- When a user signs up, apply the role/scope the admin pre-assigned.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare tm team_member%rowtype;
begin
  select * into tm from team_member where lower(email) = lower(new.email);
  insert into profile (user_id, email, role, contractor_id, full_name)
  values (new.id, new.email, coalesce(tm.role, 'contractor'), tm.contractor_id, tm.full_name)
  on conflict (user_id) do update
    set role = excluded.role, contractor_id = excluded.contractor_id,
        full_name = coalesce(excluded.full_name, profile.full_name);
  return new;
end $$;

-- ─── Owner/consultant/admin can approve a deliverable (bypasses table RLS safely) ──
create or replace function approve_deliverable(p_id uuid, p_decision text) returns void
  language plpgsql security definer set search_path = public as $$
declare proj uuid;
begin
  if my_role() not in ('admin','consultant','owner') then
    raise exception 'forbidden';
  end if;
  update deliverable
     set status = case when p_decision = 'approved' then 'approved'::deliverable_status
                       when p_decision = 'rejected' then 'rejected'::deliverable_status
                       else status end,
         updated_at = now()
   where id = p_id
   returning project_id into proj;
  insert into approval (project_id, subject_type, subject_id, reviewer, decision, decided_at)
  values (proj, 'deliverable', p_id, auth.uid(), p_decision::approval_decision, now());
end $$;
grant execute on function approve_deliverable(uuid, text) to authenticated;

-- ─── Progress snapshots for the earned-value curve ──────────────────
create table if not exists progress_snapshot (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  at         date not null default current_date,
  earned     numeric, planned numeric, spi numeric,
  unique(project_id, at)
);
alter table progress_snapshot enable row level security;
do $$ begin
  create policy p_snap_read  on progress_snapshot for select using (auth.uid() is not null);
  create policy p_snap_write on progress_snapshot for all
    using (my_role() in ('admin','consultant')) with check (my_role() in ('admin','consultant'));
exception when duplicate_object then null; end $$;
