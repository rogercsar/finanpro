-- Tipos para a tabela de despesas recorrentes
DO $$ BEGIN
    CREATE TYPE recurring_expense_type AS ENUM ('subscription', 'debt');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurring_expense_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela para armazenar despesas recorrentes (assinaturas e dívidas)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type recurring_expense_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date INT, -- Dia do mês (1-31)
    status recurring_expense_status DEFAULT 'active',
    last_paid_month DATE, -- Armazena o primeiro dia do mês do último pagamento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilita RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DROP POLICY IF EXISTS "Users can manage their own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can manage their own recurring expenses" ON recurring_expenses
    FOR ALL USING (auth.uid() = user_id);