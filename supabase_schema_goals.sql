-- Create a table for financial goals (incremental schema update)
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline date not null,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table goals enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can only see their own goals" on goals;
drop policy if exists "Users can insert their own goals" on goals;
drop policy if exists "Users can update own goals" on goals;
drop policy if exists "Users can delete own goals" on goals;

-- Create policies
create policy "Users can only see their own goals" on goals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own goals" on goals
  for insert with check (auth.uid() = user_id);

create policy "Users can update own goals" on goals
  for update using (auth.uid() = user_id);

create policy "Users can delete own goals" on goals
  for delete using (auth.uid() = user_id);

-- Add goals table to Realtime publication
alter publication supabase_realtime add table goals;
