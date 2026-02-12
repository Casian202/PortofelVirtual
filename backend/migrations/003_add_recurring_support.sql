-- Add recurring support to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_group_id UUID;

-- Index for faster recurring lookups
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_group ON transactions(recurring_group_id) WHERE recurring_group_id IS NOT NULL;
