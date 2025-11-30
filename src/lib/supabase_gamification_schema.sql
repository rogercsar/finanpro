-- Tabela para armazenar as conquistas dos usuários
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Identificador único da conquista, ex: 'FIRST_TRANSACTION'
    name TEXT NOT NULL, -- Nome da conquista, ex: "Primeiros Passos"
    description TEXT NOT NULL, -- Descrição do que foi feito para ganhar
    icon TEXT, -- Ícone para a conquista
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, type) -- Garante que o usuário só possa ter cada conquista uma vez
);

-- Habilita RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Usuários podem ver suas próprias conquistas
DROP POLICY IF EXISTS "Users can view their own achievements" ON achievements;
CREATE POLICY "Users can view their own achievements" ON achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias conquistas.
-- A lógica de quando uma conquista é ganha está no front-end, então precisamos permitir a inserção.
DROP POLICY IF EXISTS "Users can insert their own achievements" ON achievements;
CREATE POLICY "Users can insert their own achievements" ON achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);