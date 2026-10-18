-- ════════════════════════════════════════════════════════════════════
-- Phase 5 — reschedule the programme; milestone edits.
-- Run AFTER 0003_realtime.sql. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ─── Move the whole programme to a new start date (admin only) ──────
-- Shifts the project dates, every activity's planned and baseline dates,
-- milestone planned dates and deliverable due dates by the same number of
-- days, in one transaction. Progress and recorded actual dates are facts and
-- are left untouched. Calling it again with the same date does nothing.
create or replace function reschedule_programme(p_project uuid, p_start date) returns int
  language plpgsql security definer set search_path = public as $$
declare d int; who text;
begin
  if my_role() is distinct from 'admin' then
    raise exception 'forbidden';
  end if;
  select p_start - start_date into d from project where id = p_project;
  if d is null then raise exception 'project not found'; end if;
  if d = 0 then return 0; end if;

  update project set start_date = start_date + d, end_date = end_date + d where id = p_project;
  update activity
     set start_date = start_date + d, end_date = end_date + d,
         baseline_start = baseline_start + d, baseline_end = baseline_end + d,
         updated_at = now()
   where project_id = p_project;
  update milestone set planned_date = planned_date + d where project_id = p_project;
  update deliverable set due_date = due_date + d, updated_at = now() where project_id = p_project;

  select coalesce(full_name, email) into who from profile where user_id = auth.uid();
  insert into event_log (project_id, actor, actor_name, verb, subject_type, subject_text, meta)
  values (p_project, auth.uid(), coalesce(who, 'Someone'), 'rescheduled', 'project',
          'Programme now starts ' || to_char(p_start, 'FMDD Mon YYYY'), jsonb_build_object('days', d));
  return d;
end $$;
grant execute on function reschedule_programme(uuid, date) to authenticated;

-- ─── Milestones: staff can record actual dates and status ───────────
-- (0001 only granted read, so edits from /milestones were silently ignored.)
do $$ begin
  create policy p_mile_write on milestone for update
    using (my_role() in ('admin','consultant')) with check (my_role() in ('admin','consultant'));
exception when duplicate_object then null; end $$;

-- Make the new function visible to the API straight away.
notify pgrst, 'reload schema';
