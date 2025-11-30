-- Add goal_id column to transactions table
alter table transactions add column goal_id uuid references goals(id) on delete set null;

-- Create index for faster queries
create index transactions_goal_id_idx on transactions(goal_id);
create index transactions_user_goal_idx on transactions(user_id, goal_id);

-- Enable RLS for transactions (if not already enabled)
alter table transactions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own transactions" on transactions;
drop policy if exists "Users can insert own transactions" on transactions;
drop policy if exists "Users can update own transactions" on transactions;
drop policy if exists "Users can delete own transactions" on transactions;

-- Create new policies
create policy "Users can view own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete own transactions" on transactions
  for delete using (auth.uid() = user_id);
