import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, getMany } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcast } from '../server.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all investments
router.get('/', async (req, res) => {
  try {
    const { sort = '-purchase_date' } = req.query;

    let sql = 'SELECT * FROM investments WHERE created_by = $1';
    const params = [req.user.id];

    // Handle sorting
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortField} ${sortDirection}`;
    } else {
      sql += ' ORDER BY purchase_date DESC';
    }

    const investments = await getMany(sql, params);
    res.json(investments);
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single investment
router.get('/:id', async (req, res) => {
  try {
    const investment = await getOne(
      'SELECT * FROM investments WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    res.json(investment);
  } catch (error) {
    console.error('Get investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create investment
router.post('/', async (req, res) => {
  try {
    const { name, type, initial_amount, current_value, purchase_date, notes } = req.body;

    if (!name || !type || !initial_amount || !purchase_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date();

    const investment = await getOne(
      `INSERT INTO investments (id, name, type, initial_amount, current_value, purchase_date, notes, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, type, initial_amount, current_value || initial_amount, purchase_date, notes || null, req.user.id, now]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'investment_created', data: investment, userId: req.user.id });

    res.status(201).json(investment);
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update investment
router.put('/:id', async (req, res) => {
  try {
    const { name, type, initial_amount, current_value, purchase_date, notes } = req.body;

    // Check if investment exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM investments WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    const investment = await getOne(
      `UPDATE investments
       SET name = $1, type = $2, initial_amount = $3, current_value = $4, purchase_date = $5, notes = $6
       WHERE id = $7
       RETURNING *`,
      [
        name ?? existing.name,
        type ?? existing.type,
        initial_amount ?? existing.initial_amount,
        current_value ?? existing.current_value,
        purchase_date ?? existing.purchase_date,
        notes ?? existing.notes,
        req.params.id
      ]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'investment_updated', data: investment, userId: req.user.id });

    res.json(investment);
  } catch (error) {
    console.error('Update investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete investment
router.delete('/:id', async (req, res) => {
  try {
    // Check if investment exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM investments WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    await query('DELETE FROM investments WHERE id = $1', [req.params.id]);

    // Broadcast update via WebSocket
    broadcast({ type: 'investment_deleted', data: { id: req.params.id }, userId: req.user.id });

    res.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Delete investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;