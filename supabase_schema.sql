-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

alter table profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        create type transaction_type as enum ('income', 'expense');
    END IF;
END$$;

create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type transaction_type not null,
  amount numeric not null,
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamp with time zone default now(),
  goal_id uuid references goals(id) on delete set null
);

alter table transactions enable row level security;

-- RLS Policies for transactions
drop policy if exists "Users can read their own transactions" on transactions;
create policy "Users can read their own transactions" on transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own transactions" on transactions;
create policy "Users can create their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own transactions" on transactions;
create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on transactions;
create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);

-- Set up Realtime!
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table profiles;

-- Create a table for financial goals
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

-- RLS Policies for goals
drop policy if exists "Users can read their own goals" on goals;
create policy "Users can read their own goals" on goals
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own goals" on goals;
create policy "Users can create their own goals" on goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own goals" on goals;
create policy "Users can update their own goals" on goals
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own goals" on goals;
create policy "Users can delete their own goals" on goals
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table goals;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update goal's current_amount based on linked transactions
create or replace function update_goal_progress()
returns trigger as $$
begin
  -- If a transaction is inserted or updated, update the new goal (if any)
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and NEW.goal_id is not null then
    update goals set current_amount = (
      select coalesce(sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end), 0)
      from transactions
      where goal_id = NEW.goal_id
    )
    where id = NEW.goal_id;
  end if;

  -- If a transaction is deleted or its goal is changed, update the old goal (if any)
  -- This also covers the case where a transaction is moved from one goal to another.
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') and OLD.goal_id is not null and OLD.goal_id <> NEW.goal_id then
    update goals set current_amount = (
      select coalesce(sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end), 0)
      from transactions
      where goal_id = OLD.goal_id
    )
    where id = OLD.goal_id;
  end if;

  if (TG_OP = 'DELETE') then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to automatically update goal progress
drop trigger if exists transactions_change_trigger on transactions;
create trigger transactions_change_trigger
after insert or update or delete on transactions
for each row execute function update_goal_progress();
