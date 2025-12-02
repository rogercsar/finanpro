-- Arquivo: supabase_multi_profile_architecture.sql
-- Descrição: Adiciona a capacidade de ter múltiplos perfis (pessoal e empresa) por usuário.

-- 1. Criar a tabela de Perfis Financeiros
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profile_type TEXT NOT NULL DEFAULT 'personal', -- 'personal' ou 'company'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS e criar políticas para a tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;
CREATE POLICY "Users can manage their own profiles"
ON public.profiles
FOR ALL
USING (auth.uid() = user_id);

-- 3. Adicionar a coluna 'profile_id' às tabelas financeiras existentes
-- Esta é a mudança mais impactante.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.budget_limits ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.suggested_subscriptions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Criar um perfil "Pessoal" padrão para usuários existentes que não têm um.
-- Esta função pode ser chamada uma vez para migrar usuários antigos.
CREATE OR REPLACE FUNCTION create_default_personal_profile()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_record.id AND profile_type = 'personal') THEN
            INSERT INTO public.profiles (user_id, name, profile_type)
            VALUES (user_record.id, 'Pessoal', 'personal');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;