-- Arquivo: supabase_budget_suggestion.sql
-- Descrição: Adiciona a funcionalidade de sugestão inteligente de orçamentos.

-- 1. Função de Sugestão de Orçamento (RPC)
-- Esta função analisa os gastos médios dos últimos 3 meses e sugere limites.
CREATE OR REPLACE FUNCTION suggest_budgets(p_user_id UUID, p_profile_id UUID)
RETURNS TABLE (
    category TEXT,
    average_spending NUMERIC,
    suggested_limit NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    three_months_ago DATE;
BEGIN
    three_months_ago := (now() - INTERVAL '3 months');

    RETURN QUERY
    WITH monthly_expenses AS (
        SELECT
            t.category,
            date_trunc('month', t.date) as month,
            SUM(t.amount) as total_spent
        FROM
            public.transactions t
        WHERE
            t.user_id = p_user_id
            AND t.profile_id = p_profile_id
            AND t.type = 'expense'
            AND t.date >= three_months_ago
        GROUP BY
            t.category, month
    ),
    average_expenses AS (
        SELECT
            me.category,
            SUM(me.total_spent) / 3.0 as average_monthly_spending
        FROM
            monthly_expenses me
        GROUP BY
            me.category
    )
    SELECT
        ae.category,
        ae.average_monthly_spending,
        (ceil(ae.average_monthly_spending / 50.0) * 50.0) as suggested_limit
    FROM
        average_expenses ae
    WHERE NOT EXISTS (
        SELECT 1 FROM public.budget_limits bl
        WHERE bl.user_id = p_user_id AND bl.profile_id = p_profile_id AND bl.category = ae.category
    )
    ORDER BY
        ae.average_monthly_spending DESC;
END;
$$;