-- Arquivo: supabase_multi_currency_schema.sql
-- Descrição: Adiciona suporte a múltiplas moedas e gerenciamento de taxas de câmbio pelo usuário.

-- 1. Adicionar coluna de moeda principal na tabela de perfis
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- 2. Adicionar coluna de moeda na tabela de transações
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- 3. Adicionar coluna de moeda na tabela de metas
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- 4. Criar tabela para armazenar as taxas de câmbio definidas pelo usuário
CREATE TABLE IF NOT EXISTS public.user_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Garante que um usuário só pode ter uma taxa por moeda
    UNIQUE(user_id, target_currency)
);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.user_exchange_rates ENABLE ROW LEVEL SECURITY;

-- 6. Definir políticas de segurança para a nova tabela
DROP POLICY IF EXISTS "Users can manage their own exchange rates" ON public.user_exchange_rates;
CREATE POLICY "Users can manage their own exchange rates"
ON public.user_exchange_rates
FOR ALL
USING (auth.uid() = user_id);

-- 7. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_base_currency ON public.profiles(base_currency);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON public.transactions(currency);
CREATE INDEX IF NOT EXISTS idx_goals_currency ON public.goals(currency);
CREATE INDEX IF NOT EXISTS idx_user_exchange_rates_user_id ON public.user_exchange_rates(user_id);

-- 8. Adicionar a nova tabela à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_exchange_rates;

-- Função auxiliar para converter valores
-- Esta função busca a taxa definida pelo usuário e converte o valor para a moeda base.
CREATE OR REPLACE FUNCTION convert_to_base_currency(
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency VARCHAR(3),
    p_base_currency VARCHAR(3)
)
RETURNS NUMERIC AS $$
DECLARE
    exchange_rate NUMERIC;
BEGIN
    IF p_currency = p_base_currency THEN
        RETURN p_amount;
    END IF;

    SELECT rate INTO exchange_rate
    FROM public.user_exchange_rates
    WHERE user_id = p_user_id AND target_currency = p_currency;

    RETURN p_amount * COALESCE(exchange_rate, 1.0); -- Se não houver taxa, não converte
END;
$$ LANGUAGE plpgsql;