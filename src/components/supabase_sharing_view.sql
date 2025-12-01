-- 1. Remove a função RPC antiga, se existir, para evitar conflitos.
-- 1. Remove a VIEW e a função RPC antigas para evitar conflitos.
DROP VIEW IF EXISTS public.public_reports;
DROP FUNCTION IF EXISTS api.get_shared_report_data(TEXT);
DROP FUNCTION IF EXISTS public.get_shared_report_data(TEXT);

-- 2. Cria a função segura para buscar dados de um relatório compartilhado.
CREATE OR REPLACE FUNCTION public.get_shared_report_data(report_token TEXT)
RETURNS JSON -- Retorna um objeto JSON com os dados
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANTE: Executa a função com as permissões do criador (admin), ignorando a RLS do usuário.
AS $$
DECLARE
    link_info RECORD;
    transactions_data JSON;
    result_data JSON;
BEGIN
    -- Busca o link compartilhado pelo token na tabela pública.
    SELECT user_id, item_id INTO link_info
    FROM public.shared_links
    WHERE token = report_token
    LIMIT 1;

    -- Se o link não for encontrado, retorna um erro.
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Link de compartilhamento inválido ou expirado.');
    END IF;

    -- Busca as transações do usuário e mês corretos.
    SELECT json_agg(t) INTO transactions_data
    FROM public.transactions as t
    WHERE t.user_id = link_info.user_id AND to_char(t.date, 'YYYY-MM') = link_info.item_id;

    -- Monta o objeto de resultado.
    result_data := json_build_object('transactions', COALESCE(transactions_data, '[]'::json), 'month', link_info.item_id);
    RETURN result_data;
END;
$$;

-- 3. Concede permissão para que usuários não autenticados (anon) possam chamar esta função.
GRANT EXECUTE ON FUNCTION public.get_shared_report_data(TEXT) TO anon;