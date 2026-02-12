-- Add currency support to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RON';

-- Add currency support to goals
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RON';

-- Create exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) UNIQUE NOT NULL,
    rate DECIMAL(10, 4) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- Insert default exchange rates
INSERT INTO exchange_rates (currency, rate) 
VALUES 
    ('EUR', 5.0000),
    ('USD', 4.5000),
    ('GBP', 6.0000)
ON CONFLICT (currency) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_savings_goals_currency ON savings_goals(currency);
