-- Tabela para armazenar links de compartilhamento
CREATE TABLE IF NOT EXISTS shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'report', 'goal', etc.
    item_id TEXT NOT NULL, -- ID do item ou data do relatório (ex: '2025-11')
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Habilita RLS
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Usuários podem criar e ver seus próprios links
CREATE POLICY "Users can manage their own shared links" ON shared_links
    FOR ALL USING (auth.uid() = user_id);

-- Acesso público para leitura de links via token (será usado em Edge Functions)
-- Por segurança, a leitura direta da tabela não é pública.