import express from 'express';
import { getMany, getOne } from '../db.js';
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

export default router;
