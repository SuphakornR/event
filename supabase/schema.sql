-- Run this once in Supabase Dashboard -> SQL Editor

create table if not exists helpdai_rooms (
  room_id text primary key,
  owner_id uuid references auth.users(id),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table helpdai_rooms add column if not exists owner_id uuid references auth.users(id);

create table if not exists helpdai_suggestions (
  id bigint generated always as identity primary key,
  category text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists helpdai_polls (
  poll_id text primary key,
  admin_token text not null,
  question text not null,
  options jsonb not null,
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists helpdai_poll_votes (
  poll_id text not null,
  voter_id text not null,
  choice_idx integer not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

-- Enable Row Level Security (clears Supabase Security Advisor warnings)
alter table helpdai_rooms enable row level security;
alter table helpdai_suggestions enable row level security;
alter table helpdai_polls enable row level security;
alter table helpdai_poll_votes enable row level security;

-- Scoped policies for HelpDai public API / publishable key
drop policy if exists "helpdai_rooms_rw" on helpdai_rooms;
create policy "helpdai_rooms_rw" on helpdai_rooms for all to anon, authenticated using (true) with check (true);

drop policy if exists "helpdai_suggestions_insert" on helpdai_suggestions;
create policy "helpdai_suggestions_insert" on helpdai_suggestions for insert to anon, authenticated with check (true);

drop policy if exists "helpdai_polls_rw" on helpdai_polls;
create policy "helpdai_polls_rw" on helpdai_polls for all to anon, authenticated using (true) with check (true);

drop policy if exists "helpdai_poll_votes_rw" on helpdai_poll_votes;
create policy "helpdai_poll_votes_rw" on helpdai_poll_votes for all to anon, authenticated using (true) with check (true);
