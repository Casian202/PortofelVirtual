import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, getMany } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcast } from '../server.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all goals
router.get('/', async (req, res) => {
  try {
    const { sort = '-created_date' } = req.query;

    let sql = 'SELECT * FROM savings_goals WHERE created_by = $1';
    const params = [req.user.id];

    // Handle sorting
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortField} ${sortDirection}`;
    } else {
      sql += ' ORDER BY created_date DESC';
    }

    const goals = await getMany(sql, params);
    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single goal
router.get('/:id', async (req, res) => {
  try {
    const goal = await getOne(
      'SELECT * FROM savings_goals WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(goal);
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create goal
router.post('/', async (req, res) => {
  try {
    const { name, target_amount, current_amount, deadline, icon, color, is_completed, currency = 'RON' } = req.body;

    if (!name || !target_amount) {
      return res.status(400).json({ error: 'Name and target_amount are required' });
    }

    const id = uuidv4();
    const now = new Date();

    const goal = await getOne(
      `INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline, icon, color, is_completed, currency, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        name,
        target_amount,
        current_amount || 0,
        deadline || null,
        icon || '🎯',
        color || null,
        is_completed || false,
        currency,
        req.user.id,
        now
      ]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'goal_created', data: goal, userId: req.user.id });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const { name, target_amount, current_amount, deadline, icon, color, is_completed, currency } = req.body;

    // Check if goal exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM savings_goals WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = await getOne(
      `UPDATE savings_goals
       SET name = $1, target_amount = $2, current_amount = $3, deadline = $4, icon = $5, color = $6, is_completed = $7, currency = $8
       WHERE id = $9
       RETURNING *`,
      [
        name ?? existing.name,
        target_amount ?? existing.target_amount,
        current_amount ?? existing.current_amount,
        deadline ?? existing.deadline,
        icon ?? existing.icon,
        color ?? existing.color,
        is_completed !== undefined ? is_completed : existing.is_completed,
        currency ?? existing.currency,
        req.params.id
      ]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'goal_updated', data: goal, userId: req.user.id });

    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    // Check if goal exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM savings_goals WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await query('DELETE FROM savings_goals WHERE id = $1', [req.params.id]);

    // Broadcast update via WebSocket
    broadcast({ type: 'goal_deleted', data: { id: req.params.id }, userId: req.user.id });

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;