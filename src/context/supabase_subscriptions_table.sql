-- Arquivo: supabase_subscriptions_table.sql
-- Descrição: Cria a tabela 'subscriptions' para gerenciar pagamentos recorrentes.

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', etc.
    next_payment_date DATE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Definir políticas de segurança
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.uid() = user_id);