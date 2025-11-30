-- Função para buscar dados de um relatório compartilhado de forma segura
CREATE OR REPLACE FUNCTION get_shared_report_data(report_token TEXT)
RETURNS JSON -- Retorna um objeto JSON com os dados
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANTE: Executa a função com as permissões do criador (admin)
AS $$
DECLARE
    link_info RECORD;
    transactions_data JSON;
    result_data JSON;
BEGIN
    -- 1. Encontra o link compartilhado pelo token
    SELECT user_id, item_id INTO link_info
    FROM public.shared_links
    WHERE token = report_token
    LIMIT 1;

    -- 2. Se o link não for encontrado, retorna um erro
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Link de compartilhamento inválido ou expirado.');
    END IF;

    -- 3. Busca as transações do usuário e mês corretos
    SELECT json_agg(t) INTO transactions_data
    FROM (
        SELECT * FROM public.transactions
        WHERE user_id = link_info.user_id
          AND to_char(date, 'YYYY-MM') = link_info.item_id
    ) t;

    -- 4. Monta o objeto de resultado
    result_data := json_build_object(
        'transactions', COALESCE(transactions_data, '[]'::json),
        'month', link_info.item_id
    );

    RETURN result_data;
END;
$$;