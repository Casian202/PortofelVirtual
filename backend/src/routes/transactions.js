import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, getMany } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcast } from '../server.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { sort = '-date', type, month, limit, offset } = req.query;

    let sql = 'SELECT * FROM transactions WHERE created_by = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (month) {
      sql += ` AND month = $${paramIndex}`;
      params.push(month);
      paramIndex++;
    }

    // Handle sorting
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortField} ${sortDirection}`;
    } else {
      sql += ' ORDER BY date DESC';
    }

    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      paramIndex++;
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset));
    }

    const transactions = await getMany(sql, params);
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await getOne(
      'SELECT * FROM transactions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transaction
router.post('/', async (req, res) => {
  try {
    const { amount, type, category_id, category_name, description, date, month, currency = 'RON' } = req.body;

    if (!amount || !type || !category_name || !date || !month) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date();

    const transaction = await getOne(
      `INSERT INTO transactions (id, amount, type, category_id, category_name, description, date, month, currency, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, amount, type, category_id || null, category_name, description || null, date, month, currency, req.user.id, now]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'transaction_created', data: transaction, userId: req.user.id });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const { amount, type, category_id, category_name, description, date, month, currency } = req.body;

    // Check if transaction exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM transactions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = await getOne(
      `UPDATE transactions
       SET amount = $1, type = $2, category_id = $3, category_name = $4, description = $5, date = $6, month = $7, currency = $8
       WHERE id = $9
       RETURNING *`,
      [
        amount ?? existing.amount,
        type ?? existing.type,
        category_id ?? existing.category_id,
        category_name ?? existing.category_name,
        description ?? existing.description,
        date ?? existing.date,
        month ?? existing.month,
        currency ?? existing.currency,
        req.params.id
      ]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'transaction_updated', data: transaction, userId: req.user.id });

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    // Check if transaction exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM transactions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await query('DELETE FROM transactions WHERE id = $1', [req.params.id]);

    // Broadcast update via WebSocket
    broadcast({ type: 'transaction_deleted', data: { id: req.params.id }, userId: req.user.id });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;