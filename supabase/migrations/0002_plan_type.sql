-- Plan type gates which CFR citations the server may attach (never LLM-invented).
alter table denied_claims
  add column if not exists plan_type text not null default 'unknown'
    check (plan_type in ('erisa', 'aca_individual', 'medicare_advantage', 'unknown'));
