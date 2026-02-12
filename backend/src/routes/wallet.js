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
    
    res.json({
      balances: balancesByCurrency,
      total_in_ron: totalInRon,
      exchange_rates: ratesMap
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
