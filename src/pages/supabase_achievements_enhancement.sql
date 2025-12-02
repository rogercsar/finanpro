-- Arquivo: supabase_achievements_enhancement.sql
-- Descrição: Aprimora o sistema de gamificação com uma tabela de definições de conquistas.

-- 1. Tabela para definir todas as conquistas possíveis
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    type TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL
);

-- 2. Inserir as definições de conquistas (incluindo as novas)
-- O 'ON CONFLICT DO NOTHING' garante que não haverá duplicatas se o script for executado novamente.
INSERT INTO public.achievement_definitions (type, name, description, icon) VALUES
    ('FIRST_TRANSACTION', 'Primeiros Passos', 'Você registrou sua primeira transação!', '👟'),
    ('FIRST_GOAL', 'Planejador', 'Você criou sua primeira meta financeira!', '🗺️'),
    ('GOAL_COMPLETED', 'Conquistador', 'Você completou sua primeira meta!', '🏆'),
    ('SAVER_LV1', 'Poupador Iniciante', 'Atingiu uma taxa de poupança de 10%!', '🌱'),
    ('SAVER_LV2', 'Poupador Mestre', 'Atingiu uma taxa de poupança de 20%!', '🌳'),
    ('TRANSACTION_LV1', 'Registrador Ativo', 'Registrou 10 transações.', '✍️'),
    ('TRANSACTION_LV2', 'Mestre dos Registros', 'Registrou 50 transações.', '📚'),
    ('FIRST_BUDGET', 'Orçamentista', 'Você definiu seu primeiro limite de orçamento.', '📊'),
    ('HEALTHY_FINANCES', 'Finanças em Dia', 'Atingiu um Score de Saúde Financeira de 85+.', '💚'),
    ('CONSISTENT_USER', 'Hábito Criado', 'Usou o app por 7 dias seguidos.', '🗓️')
ON CONFLICT (type) DO NOTHING;

-- 3. Alterar a tabela de conquistas do usuário para referenciar as definições
-- Adiciona uma chave estrangeira para garantir a integridade dos dados.
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS type TEXT;

-- Tenta preencher a coluna 'type' com base no 'name' para dados antigos (opcional, mas bom para migração)
UPDATE public.achievements a
SET type = ad.type
FROM public.achievement_definitions ad
WHERE a.name = ad.name AND a.type IS NULL;

-- Adiciona a restrição de chave estrangeira
ALTER TABLE public.achievements
ADD CONSTRAINT achievements_type_fkey FOREIGN KEY (type) REFERENCES public.achievement_definitions(type) ON DELETE CASCADE;