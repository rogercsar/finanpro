-- Arquivo: supabase_currency_achievements.sql
-- Descrição: Adiciona novas conquistas relacionadas ao uso de moedas estrangeiras.

INSERT INTO public.achievement_definitions (type, name, description, icon) VALUES
    ('FIRST_FOREIGN_TRANSACTION', 'Internacional', 'Você registrou sua primeira transação em moeda estrangeira!', '✈️'),
    ('MULTI_CURRENCY_MASTER', 'Globalista', 'Você realizou transações em todas as 3 moedas (BRL, USD, EUR).', '🌍')
ON CONFLICT (type) DO NOTHING;