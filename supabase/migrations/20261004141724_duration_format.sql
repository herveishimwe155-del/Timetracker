-- Phase 5: how durations are shown (FR-14).
--   clock   01:30:00
--   decimal 1.50 h
--   classic 1h 30m
alter table public.profiles
  add column duration_format text not null default 'clock'
  check (duration_format in ('clock', 'decimal', 'classic'));

-- A length bound only; the app checks that the time zone is a real IANA name.
alter table public.profiles
  add constraint profiles_time_zone_length check (length(time_zone) between 1 and 64);
