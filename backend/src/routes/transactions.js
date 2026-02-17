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
    const { amount, type, category_id, category_name, description, date, month, currency = 'RON', is_recurring = false, recurring_day } = req.body;

    if (!amount || !type || !category_name || !date || !month) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date();
    // If recurring, set a group id so we can track all copies
    const recurring_group_id = is_recurring ? uuidv4() : null;
    // Extract the day from the date if recurring_day not provided
    const rDay = is_recurring ? (recurring_day || new Date(date).getDate()) : null;

    const transaction = await getOne(
      `INSERT INTO transactions (id, amount, type, category_id, category_name, description, date, month, currency, is_recurring, recurring_group_id, recurring_day, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [id, amount, type, category_id || null, category_name, description || null, date, month, currency, is_recurring, recurring_group_id, rDay, req.user.id, now]
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
    const { amount, type, category_id, category_name, description, date, month, currency, is_recurring, recurring_day } = req.body;

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
       SET amount = $1, type = $2, category_id = $3, category_name = $4, description = $5, date = $6, month = $7, currency = $8, is_recurring = $9, recurring_day = $10
       WHERE id = $11
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
        is_recurring ?? existing.is_recurring,
        recurring_day ?? existing.recurring_day,
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

// Generate recurring transactions for a given month
router.post('/generate-recurring', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Month is required (YYYY-MM)' });
    }

    // Find all recurring templates for this user (original ones with is_recurring=true)
    const recurringTemplates = await getMany(
      `SELECT DISTINCT ON (recurring_group_id) *
       FROM transactions
       WHERE created_by = $1 AND is_recurring = true AND recurring_group_id IS NOT NULL
       ORDER BY recurring_group_id, created_date ASC`,
      [req.user.id]
    );

    let created = 0;
    for (const tmpl of recurringTemplates) {
      // Check if already generated for this month
      const existing = await getOne(
        `SELECT id FROM transactions 
         WHERE recurring_group_id = $1 AND month = $2 AND created_by = $3`,
        [tmpl.recurring_group_id, month, req.user.id]
      );

      if (!existing) {
        // Use recurring_day if set, otherwise extract from original date
        const day = (tmpl.recurring_day || new Date(tmpl.date).getDate()).toString().padStart(2, '0');
        // Clamp to last day of the target month (e.g., day 31 in February -> 28/29)
        const [year, mon] = month.split('-').map(Number);
        const lastDayOfMonth = new Date(year, mon, 0).getDate();
        const clampedDay = Math.min(parseInt(day), lastDayOfMonth).toString().padStart(2, '0');
        const newDate = `${month}-${clampedDay}`;

        const id = uuidv4();
        await query(
          `INSERT INTO transactions (id, amount, type, category_id, category_name, description, date, month, currency, is_recurring, recurring_group_id, recurring_day, created_by, created_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [id, tmpl.amount, tmpl.type, tmpl.category_id, tmpl.category_name, tmpl.description, newDate, month, tmpl.currency, true, tmpl.recurring_group_id, tmpl.recurring_day, req.user.id]
        );
        created++;
      }
    }

    // Broadcast update
    if (created > 0) {
      broadcast({ type: 'transaction_created', data: { count: created }, userId: req.user.id });
    }

    res.json({ message: `${created} recurring transactions generated for ${month}`, created });
  } catch (error) {
    console.error('Generate recurring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop recurring for a specific group
router.post('/stop-recurring/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    await query(
      `UPDATE transactions SET is_recurring = false, recurring_group_id = NULL
       WHERE recurring_group_id = $1 AND created_by = $2`,
      [groupId, req.user.id]
    );

    broadcast({ type: 'transaction_updated', data: { recurring_stopped: groupId }, userId: req.user.id });
    res.json({ message: 'Recurring stopped successfully' });
  } catch (error) {
    console.error('Stop recurring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;