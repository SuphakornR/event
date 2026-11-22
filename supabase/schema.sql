-- Run this once in Supabase Dashboard -> SQL Editor

create table if not exists helpdai_rooms (
  room_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

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

-- Allow HelpDai backend / publishable key access (or use service_role key on Render)
alter table helpdai_rooms disable row level security;
alter table helpdai_suggestions disable row level security;
alter table helpdai_polls disable row level security;
alter table helpdai_poll_votes disable row level security;
