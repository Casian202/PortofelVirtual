import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getMany, getOne, query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get wallet summary - cumulative savings by month
router.get('/summary', async (req, res) => {
  try {
    const { currency = 'RON' } = req.query;
    
    const sql = `
      SELECT 
        month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
      FROM transactions
      WHERE created_by = $1 AND currency = $2
      GROUP BY month
      ORDER BY month ASC
    `;
    
    const monthlyData = await getMany(sql, [req.user.id, currency]);
    
    // Calculate cumulative savings
    let cumulativeSavings = 0;
    const walletData = monthlyData.map(month => {
      const monthBalance = parseFloat(month.balance) || 0;
      cumulativeSavings += monthBalance;
      
      return {
        month: month.month,
        total_income: parseFloat(month.total_income) || 0,
        total_expense: parseFloat(month.total_expense) || 0,
        balance: monthBalance,
        cumulative_savings: cumulativeSavings
      };
    });
    
    res.json({
      monthly_data: walletData,
      total_cumulative: cumulativeSavings
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current available balance across all currencies
router.get('/balance', async (req, res) => {
  try {
    const sql = `
      SELECT
        currency,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as available_balance
      FROM transactions
      WHERE created_by = $1
      GROUP BY currency
      ORDER BY currency
    `;

    const balances = await getMany(sql, [req.user.id]);

    // Calculate total in RON (need exchange rates)
    const ratesSql = 'SELECT currency, rate FROM exchange_rates';
    const rates = await getMany(ratesSql, []);

    const ratesMap = {};
    rates.forEach(r => ratesMap[r.currency] = parseFloat(r.rate));

    let totalInRon = 0;
    const balancesByCurrency = {};

    balances.forEach(b => {
      const balance = parseFloat(b.available_balance) || 0;
      balancesByCurrency[b.currency] = balance;

      if (b.currency === 'RON') {
        totalInRon += balance;
      } else if (ratesMap[b.currency]) {
        totalInRon += balance * ratesMap[b.currency];
      }
    });

    // Calculate meal voucher balance
    const mealVoucherSql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE created_by = $1 AND is_meal_voucher = true
    `;
    const mealVoucherResult = await getOne(mealVoucherSql, [req.user.id]);
    const mealVoucherIncome = parseFloat(mealVoucherResult?.total_income) || 0;
    const mealVoucherExpense = parseFloat(mealVoucherResult?.total_expense) || 0;
    const mealVoucherBalance = mealVoucherIncome - mealVoucherExpense;

    res.json({
      balances: balancesByCurrency,
      total_in_ron: totalInRon,
      exchange_rates: ratesMap,
      meal_voucher_balance: mealVoucherBalance,
      meal_voucher_income: mealVoucherIncome,
      meal_voucher_expense: mealVoucherExpense
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get meal vouchers balance
router.get('/meal-vouchers', async (req, res) => {
  try {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE created_by = $1 AND is_meal_voucher = true
    `;

    const result = await getOne(sql, [req.user.id]);
    const totalIncome = parseFloat(result?.total_income) || 0;
    const totalExpense = parseFloat(result?.total_expense) || 0;
    const balance = totalIncome - totalExpense;

    res.json({
      balance: balance,
      total_income: totalIncome,
      total_expense: totalExpense
    });
  } catch (error) {
    console.error('Get meal vouchers balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List meal voucher transactions
router.get('/meal-vouchers/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    const sql = `
      SELECT id, amount, type, category_id, category_name, description, date, month,
             currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by,
             created_date, updated_date
      FROM transactions
      WHERE created_by = $1 AND is_meal_voucher = true
      ORDER BY date DESC, created_date DESC
      LIMIT $2 OFFSET $3
    `;

    const transactions = await getMany(sql, [req.user.id, limit, offset]);
    res.json(transactions);
  } catch (error) {
    console.error('List meal voucher transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Receive meal vouchers (income)
router.post('/meal-vouchers/receive', async (req, res) => {
  try {
    const { amount, description, transaction_date, date, is_recurring = true } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const txDate = (date || transaction_date) ? new Date(date || transaction_date) : new Date();
    const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    const day = txDate.getDate();

    // Find "Bonuri de masă" category
    const category = await getOne(
      'SELECT id FROM budget_categories WHERE name = $1 AND created_by = $2',
      ['Bonuri de masă', req.user.id]
    );

    const categoryId = category?.id || null;
    const transactionId = uuidv4();
    const recurringGroupId = is_recurring ? uuidv4() : null;

    const sql = `
      INSERT INTO transactions (
        id, amount, type, category_id, category_name, description, date, month,
        currency, is_recurring, recurring_group_id, recurring_day, is_meal_voucher, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await getOne(sql, [
      transactionId,
      amount,
      'income',
      categoryId,
      'Bonuri de masă',
      description || null,
      txDate.toISOString().split('T')[0],
      month,
      'RON',
      is_recurring,
      recurringGroupId,
      day,
      true,
      req.user.id
    ]);

    res.status(201).json(result);
  } catch (error) {
    console.error('Receive meal vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spend meal vouchers (expense)
router.post('/meal-vouchers/spend', async (req, res) => {
  try {
    const { amount, description, transaction_date, date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check meal voucher balance
    const balanceSql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE created_by = $1 AND is_meal_voucher = true
    `;
    const balanceResult = await getOne(balanceSql, [req.user.id]);
    const currentBalance = (parseFloat(balanceResult?.total_income) || 0) - (parseFloat(balanceResult?.total_expense) || 0);

    if (amount > currentBalance) {
      return res.status(400).json({
        error: `Sold insuficient de bonuri de masă. Disponibil: ${currentBalance.toFixed(2)} RON, Solicitat: ${amount} RON`
      });
    }

    const txDate = (date || transaction_date) ? new Date(date || transaction_date) : new Date();
    const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

    // Find "Alimente" category
    const category = await getOne(
      'SELECT id FROM budget_categories WHERE name = $1 AND created_by = $2',
      ['Alimente', req.user.id]
    );

    const categoryId = category?.id || null;
    const transactionId = uuidv4();

    const sql = `
      INSERT INTO transactions (
        id, amount, type, category_id, category_name, description, date, month,
        currency, is_recurring, is_meal_voucher, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await getOne(sql, [
      transactionId,
      amount,
      'expense',
      categoryId,
      'Alimente',
      description || null,
      txDate.toISOString().split('T')[0],
      month,
      'RON',
      false,
      true,
      req.user.id
    ]);

    res.status(201).json(result);
  } catch (error) {
    console.error('Spend meal vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete meal voucher transaction
router.delete('/meal-vouchers/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getOne(
      'DELETE FROM transactions WHERE id = $1 AND created_by = $2 AND is_meal_voucher = true RETURNING id',
      [id, req.user.id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Meal voucher transaction not found' });
    }

    res.json({ message: 'Meal voucher transaction deleted successfully', success: true });
  } catch (error) {
    console.error('Delete meal voucher transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
