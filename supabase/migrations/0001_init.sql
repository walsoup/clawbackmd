-- ClawbackMD schema
-- All data is synthetic. Appeals are drafts requiring physician/billing review.

create extension if not exists "pgcrypto";

create table payer_policies (
  id text primary key,
  payer text not null,
  policy_code text not null unique,
  title text not null,
  body text not null
);

create table denied_claims (
  id text primary key,
  patient_alias text not null,
  cpt_codes text[] not null,
  billed_amount numeric(12, 2) not null,
  payer_name text not null,
  plan_type text not null default 'unknown'
    check (plan_type in ('erisa', 'aca_individual', 'medicare_advantage', 'unknown')),
  carc_code text not null,
  rarc_code text,
  denial_reason text not null,
  denied_at timestamptz not null,
  status text not null default 'denied'
    check (status in ('denied', 'analyzed', 'appeal_ready', 'uphold')),
  policy_id text not null references payer_policies(id)
);

create table patient_ehr_notes (
  id text primary key,
  claim_id text not null references denied_claims(id) on delete cascade,
  note_type text not null,
  authored_at timestamptz not null,
  text text not null
);

create table appeals (
  id text primary key,
  claim_id text not null references denied_claims(id) on delete cascade,
  analysis jsonb not null,
  letter jsonb not null,
  p2p jsonb not null,
  model text not null,
  latency_ms integer not null,
  created_at timestamptz not null default now(),
  is_cached boolean not null default false,
  is_active boolean not null default false
);

create index appeals_claim_created_idx on appeals (claim_id, created_at desc);
create index patient_ehr_notes_claim_idx on patient_ehr_notes (claim_id);
create index denied_claims_status_idx on denied_claims (status);

-- RLS: defense in depth. App uses service-role key server-side.
alter table payer_policies enable row level security;
alter table denied_claims enable row level security;
alter table patient_ehr_notes enable row level security;
alter table appeals enable row level security;

create policy "authenticated read policies"
  on payer_policies for select to authenticated using (true);
create policy "authenticated read claims"
  on denied_claims for select to authenticated using (true);
create policy "authenticated read notes"
  on patient_ehr_notes for select to authenticated using (true);
create policy "authenticated read appeals"
  on appeals for select to authenticated using (true);

create policy "authenticated write policies"
  on payer_policies for all to authenticated using (true) with check (true);
create policy "authenticated write claims"
  on denied_claims for all to authenticated using (true) with check (true);
create policy "authenticated write notes"
  on patient_ehr_notes for all to authenticated using (true) with check (true);
create policy "authenticated write appeals"
  on appeals for all to authenticated using (true) with check (true);
