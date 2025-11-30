-- Budget Limits Table
CREATE TABLE IF NOT EXISTS budget_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'anomaly', 'budget_exceeded', 'goal_milestone', 'savings_drop'
    category TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    data JSONB, -- extra context
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    related_transaction_id UUID
);

-- Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'user', 'ai'
    timestamp TIMESTAMP DEFAULT now(),
    session_id TEXT -- group messages by session
);

-- Enable RLS
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Budget Limits
CREATE POLICY "Users can view own budget limits" ON budget_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budget limits" ON budget_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget limits" ON budget_limits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget limits" ON budget_limits
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: Alerts
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

-- Users should not be able to arbitrarily update or delete alerts.
-- This can be handled by specific functions (e.g., mark as read) or admin roles.
CREATE POLICY "Users can update their own alerts (e.g. mark as read)" ON alerts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Chat History
CREATE POLICY "Users can view own chat history" ON chat_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_history
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_budget_limits_user ON budget_limits(user_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_read ON alerts(user_id, read);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_chat_history_session ON chat_history(session_id);
