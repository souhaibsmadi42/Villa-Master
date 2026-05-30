-- Phase 4 — enable realtime on the activity feed so the dashboard updates live.
-- Run after 0002. Safe to re-run.
do $$ begin
  alter publication supabase_realtime add table event_log;
exception when duplicate_object then null; end $$;
