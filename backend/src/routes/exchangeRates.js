import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
  if (result.rows[0]?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all exchange rates (public endpoint)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT er.*, u.email as updated_by_email 
      FROM exchange_rates er
      LEFT JOIN users u ON er.updated_by = u.id
      ORDER BY er.currency
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Update exchange rate (admin only)
router.put('/:currency', isAdmin, async (req, res) => {
  try {
    const { currency } = req.params;
    const { rate } = req.body;

    if (!rate || isNaN(rate) || rate <= 0) {
      return res.status(400).json({ error: 'Invalid rate value' });
    }

    const result = await query(
      `UPDATE exchange_rates 
       SET rate = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 
       WHERE currency = $3 
       RETURNING *`,
      [rate, req.user.id, currency.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ error: 'Failed to update exchange rate' });
  }
});

// Add new currency (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { currency, rate } = req.body;

    if (!currency || currency.length !== 3) {
      return res.status(400).json({ error: 'Currency must be a 3-letter code' });
    }

    if (!rate || isNaN(rate) || rate <= 0) {
      return res.status(400).json({ error: 'Invalid rate value' });
    }

    const result = await query(
      `INSERT INTO exchange_rates (currency, rate, updated_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [currency.toUpperCase(), rate, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Currency already exists' });
    }
    console.error('Error creating exchange rate:', error);
    res.status(500).json({ error: 'Failed to create exchange rate' });
  }
});

export default router;
