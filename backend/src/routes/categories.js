import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, getMany } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcast } from '../server.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;

    let sql = 'SELECT * FROM budget_categories WHERE created_by = $1';
    const params = [req.user.id];

    if (type) {
      sql += ' AND type = $2';
      params.push(type);
    }

    sql += ' ORDER BY name';

    const categories = await getMany(sql, params);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await getOne(
      'SELECT * FROM budget_categories WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, type, icon, color, is_active } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const id = uuidv4();
    const now = new Date();

    const category = await getOne(
      `INSERT INTO budget_categories (id, name, type, icon, color, is_active, created_by, created_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name, type, icon || '💡', color || null, is_active !== false, req.user.id, now]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'category_created', data: category, userId: req.user.id });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, type, icon, color, is_active } = req.body;

    // Check if category exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM budget_categories WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await getOne(
      `UPDATE budget_categories
       SET name = $1, type = $2, icon = $3, color = $4, is_active = $5
       WHERE id = $6
       RETURNING *`,
      [
        name ?? existing.name,
        type ?? existing.type,
        icon ?? existing.icon,
        color ?? existing.color,
        is_active !== undefined ? is_active : existing.is_active,
        req.params.id
      ]
    );

    // Broadcast update via WebSocket
    broadcast({ type: 'category_updated', data: category, userId: req.user.id });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    // Check if category exists and belongs to user
    const existing = await getOne(
      'SELECT * FROM budget_categories WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await query('DELETE FROM budget_categories WHERE id = $1', [req.params.id]);

    // Broadcast update via WebSocket
    broadcast({ type: 'category_deleted', data: { id: req.params.id }, userId: req.user.id });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;