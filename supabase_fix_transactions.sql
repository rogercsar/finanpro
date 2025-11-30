-- Fix transactions RLS policies to allow all authenticated users to see their own transactions
-- This should replace the existing policies that might be blocking access

drop policy if exists "Enable read access for shared accounts" on transactions;
drop policy if exists "Enable read access for authenticated users" on transactions;
drop policy if exists "Enable insert for shared accounts" on transactions;
drop policy if exists "Enable insert for authenticated users" on transactions;
drop policy if exists "Enable update for shared accounts" on transactions;
drop policy if exists "Enable update for users based on id" on transactions;
drop policy if exists "Enable delete for shared accounts" on transactions;
drop policy if exists "Enable delete for users based on id" on transactions;

-- Create simple, working policies for transactions
create policy "Users can read their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can create transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);
