-- Paid plans. Rows are written only by the server (service role) after a payment
-- is verified with Flutterwave; users can read their own.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'standard' check (plan in ('standard')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  customer_email text not null,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_customer_email_idx on public.subscriptions (lower(customer_email));

create table public.billing_payments (
  transaction_id bigint primary key,
  user_id uuid references auth.users (id) on delete set null,
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  amount numeric(12, 2) not null,
  currency text not null,
  paid_at timestamptz not null default now()
);
create index billing_payments_user_idx on public.billing_payments (user_id);

alter table public.subscriptions enable row level security;
alter table public.billing_payments enable row level security;

create policy own_subscription on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy require_mfa on public.subscriptions as restrictive for all to authenticated
  using ((select public.session_assurance_ok()));
create policy own_payments on public.billing_payments
  for select to authenticated using (user_id = (select auth.uid()));
create policy require_mfa on public.billing_payments as restrictive for all to authenticated
  using ((select public.session_assurance_ok()));

revoke insert, update, delete on public.subscriptions, public.billing_payments from anon, authenticated;

-- 'standard' while a paid period (plus 2 days' grace for late renewals) is running.
create or replace function public.plan_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user and s.current_period_end + interval '2 days' > now()
  ) then 'standard' else 'free' end;
$$;
revoke all on function public.plan_of(uuid) from public, anon, authenticated;

create or replace function public.current_plan()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.plan_of((select auth.uid()));
$$;
revoke all on function public.current_plan() from public, anon;
grant execute on function public.current_plan() to authenticated;

-- Records a verified payment once (by transaction id) and extends the paid period.
create or replace function public.apply_payment(
  p_transaction_id bigint,
  p_user_id uuid,
  p_email text,
  p_interval text,
  p_amount numeric,
  p_currency text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
begin
  insert into public.billing_payments (transaction_id, user_id, billing_interval, amount, currency)
  values (p_transaction_id, p_user_id, p_interval, p_amount, p_currency)
  on conflict (transaction_id) do nothing;

  if not found then
    -- Already applied (the return page and the webhook both report the first payment).
    select current_period_end into v_end from public.subscriptions where user_id = p_user_id;
    return v_end;
  end if;

  insert into public.subscriptions as s (user_id, billing_interval, status, customer_email, current_period_end)
  values (
    p_user_id, p_interval, 'active', lower(p_email),
    now() + case p_interval when 'yearly' then interval '1 year' else interval '1 month' end
  )
  on conflict (user_id) do update set
    billing_interval = excluded.billing_interval,
    status = 'active',
    customer_email = excluded.customer_email,
    current_period_end = greatest(s.current_period_end, now())
      + case p_interval when 'yearly' then interval '1 year' else interval '1 month' end,
    updated_at = now()
  returning current_period_end into v_end;
  return v_end;
end;
$$;
revoke all on function public.apply_payment(bigint, uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.apply_payment(bigint, uuid, text, text, numeric, text) to service_role;

-- Free plan: up to 10 active (non-archived) projects. Archiving frees a slot.
create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and not new.archived) or (tg_op = 'UPDATE' and old.archived and not new.archived) then
    if public.plan_of(new.user_id) = 'free'
       and (select count(*) from public.projects p where p.user_id = new.user_id and not p.archived) >= 10 then
      raise exception 'The Free plan includes up to 10 active projects'
        using errcode = 'TK402', hint = 'plan_limit';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_project_limit() from public, anon, authenticated;

create trigger enforce_project_limit
  before insert or update of archived on public.projects
  for each row execute function public.enforce_project_limit();

-- Live updates when a payment lands (the webhook can arrive while Settings is open).
create trigger broadcast_change after insert or update or delete on public.subscriptions
  for each row execute function public.broadcast_user_change();
