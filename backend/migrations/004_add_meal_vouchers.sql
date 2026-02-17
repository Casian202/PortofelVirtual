-- Add meal voucher support to transactions table
-- Meal vouchers (bonuri de masă) are a special type of income/expense
-- They can only be spent on food/groceries category (Alimente)

-- Add is_meal_voucher column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_meal_voucher BOOLEAN DEFAULT false;

-- Create index for meal voucher queries
CREATE INDEX IF NOT EXISTS idx_transactions_meal_voucher ON transactions(is_meal_voucher) WHERE is_meal_voucher = true;

-- Add comment to document the column
COMMENT ON COLUMN transactions.is_meal_voucher IS 'Whether this transaction is a meal voucher (bon de masă). Meal voucher income adds to meal voucher balance. Meal voucher expenses can only be for Alimente category.';