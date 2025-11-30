-- Create a table for shared accounts (multiple users accessing same account)
create table if not exists shared_accounts (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users not null,
  invited_user_id uuid references auth.users,
  invite_email text,
  status text default 'pending', -- pending, accepted, rejected
  invited_at timestamp with time zone default now(),
  accepted_at timestamp with time zone,
  unique(owner_id, invited_user_id),
  unique(owner_id, invite_email)
);

alter table shared_accounts enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can see their own shared accounts" on shared_accounts;
drop policy if exists "Users can see invites sent to them" on shared_accounts;
drop policy if exists "Users can create invites" on shared_accounts;
drop policy if exists "Users can update their own invites" on shared_accounts;

-- Create policies
create policy "Users can see their own shared accounts" on shared_accounts
  for select using (auth.uid() = owner_id or auth.uid() = invited_user_id);

create policy "Users can create invites" on shared_accounts
  for insert with check (auth.uid() = owner_id);

create policy "Users can update their own invites" on shared_accounts
  for update using (auth.uid() = owner_id or auth.uid() = invited_user_id);

create policy "Users can delete their own invites" on shared_accounts
  for delete using (auth.uid() = owner_id or auth.uid() = invited_user_id);

-- Add shared_accounts table to Realtime publication
alter publication supabase_realtime add table shared_accounts;

-- Create a helper function to get the account_id for a user
-- This returns the owner's ID if user is owner, or owner's ID if user is invited
create or replace function get_account_id(user_id uuid)
returns uuid as $$
declare
  account_id uuid;
begin
  -- Check if user is an owner
  select id into account_id from auth.users where id = user_id limit 1;
  if account_id is not null then
    return account_id;
  end if;
  
  -- Check if user is invited to an account
  select owner_id into account_id from shared_accounts 
  where invited_user_id = user_id and status = 'accepted'
  limit 1;
  
  return account_id;
end;
$$ language plpgsql;

-- Update transactions RLS policy to support shared accounts
drop policy if exists "Enable read access for authenticated users" on transactions;
drop policy if exists "Enable insert for authenticated users" on transactions;
drop policy if exists "Enable update for users based on id" on transactions;
drop policy if exists "Enable delete for users based on id" on transactions;

create policy "Enable read access for shared accounts" on transactions
  for select using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    ) 
    or user_id = auth.uid()
  );

create policy "Enable insert for shared accounts" on transactions
  for insert with check (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

create policy "Enable update for shared accounts" on transactions
  for update using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

create policy "Enable delete for shared accounts" on transactions
  for delete using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

-- Update goals RLS policy to support shared accounts
drop policy if exists "Users can only see their own goals" on goals;
drop policy if exists "Users can insert their own goals" on goals;
drop policy if exists "Users can update own goals" on goals;
drop policy if exists "Users can delete own goals" on goals;

create policy "Users can see their account goals" on goals
  for select using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

create policy "Users can insert account goals" on goals
  for insert with check (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

create policy "Users can update account goals" on goals
  for update using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );

create policy "Users can delete account goals" on goals
  for delete using (
    user_id in (
      select owner_id from shared_accounts where invited_user_id = auth.uid() and status = 'accepted'
    )
    or user_id = auth.uid()
  );
