-- Arquivo: supabase_subscription_detection.sql
-- Descrição: Adiciona a funcionalidade de detecção automática de assinaturas.

-- 1. Tabela para armazenar sugestões de assinaturas
CREATE TABLE IF NOT EXISTS public.suggested_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    transaction_count INT NOT NULL,
    last_transaction_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'suggested', -- 'suggested', 'dismissed', 'accepted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Evita sugestões duplicadas para a mesma descrição e valor
    UNIQUE(user_id, description, amount, currency)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.suggested_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança para a nova tabela
DROP POLICY IF EXISTS "Users can manage their own subscription suggestions" ON public.suggested_subscriptions;
CREATE POLICY "Users can manage their own subscription suggestions"
ON public.suggested_subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- 4. Adicionar a nova tabela à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggested_subscriptions;

-- 5. Função de Detecção (RPC)
-- Esta função irá procurar por transações recorrentes que podem ser assinaturas.
CREATE OR REPLACE FUNCTION detect_recurring_transactions(p_user_id UUID)
RETURNS TABLE (
    description TEXT,
    amount NUMERIC,
    currency VARCHAR(3),
    transaction_count BIGINT,
    last_transaction_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH potential_subscriptions AS (
        SELECT
            LOWER(t.description) as normalized_description,
            t.amount,
            t.currency,
            COUNT(t.id) as occurrences,
            MAX(t.date) as last_date
        FROM
            public.transactions t
        WHERE
            t.user_id = p_user_id
            AND t.type = 'expense'
            -- Exclui transações já associadas a uma assinatura existente
            AND NOT EXISTS (
                SELECT 1 FROM public.subscriptions s
                WHERE s.user_id = p_user_id AND LOWER(s.name) = LOWER(t.description)
            )
        GROUP BY
            normalized_description, t.amount, t.currency
        HAVING
            COUNT(t.id) >= 2 -- Considera como recorrente se aparecer 2 ou mais vezes
    )
    SELECT
        ps.normalized_description,
        ps.amount,
        ps.currency,
        ps.occurrences,
        ps.last_date
    FROM potential_subscriptions ps;
END;
$$;