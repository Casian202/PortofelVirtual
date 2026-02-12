import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import db, { query } from './db.js';
import authRoutes from './routes/auth.js';
import transactionsRoutes from './routes/transactions.js';
import categoriesRoutes from './routes/categories.js';
import investmentsRoutes from './routes/investments.js';
import goalsRoutes from './routes/goals.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Store connected clients with their user IDs
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle authentication
      if (data.type === 'auth' && data.userId) {
        clients.set(ws, data.userId);
        console.log(`Client authenticated: ${data.userId}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast function for real-time updates
export const broadcast = (message) => {
  const messageStr = JSON.stringify(message);

  clients.forEach((userId, ws) => {
    // Only send to clients with matching userId
    if (userId === message.userId && ws.readyState === ws.OPEN) {
      ws.send(messageStr);
    }
  });
};

// Middleware
app.use(cors({
  origin: ['http://localhost', 'http://127.0.0.1', 'http://localhost:80'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Database initialization and migration
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Check if tables exist
    const tablesExist = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    if (!tablesExist.rows[0].exists) {
      console.log('Running migrations...');

      // Read and execute all migration files
      const fs = await import('fs');
      const migrationsDir = join(__dirname, '../migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

      for (const file of files) {
        console.log(`Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(join(migrationsDir, file), 'utf8');
        
        // Split by semicolons and execute each statement
        const statements = migrationSQL.split(';').filter(s => s.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            await query(statement);
          }
        }
      }

      console.log('Migrations completed successfully');

      // Run seed script
      console.log('Running seed data...');
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase();
    } else {
      console.log('Database already initialized');
      
      // Check for new migrations
      const fs = await import('fs');
      const migrationsDir = join(__dirname, '../migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      
      // Run migrations that haven't been run yet (simple check for new files)
      if (files.length > 1) {
        console.log('Checking for new migrations...');
        for (const file of files.slice(1)) { // Skip first migration
          console.log(`Running migration: ${file}`);
          const migrationSQL = fs.readFileSync(join(migrationsDir, file), 'utf8');
          
          try {
            const statements = migrationSQL.split(';').filter(s => s.trim());
            for (const statement of statements) {
              if (statement.trim()) {
                await query(statement);
              }
            }
          } catch (error) {
            // Continue if migration already applied (column exists, etc.)
            console.log(`Migration ${file} already applied or error:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await initializeDatabase();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready for real-time updates`);
  });
};

startServer();

export { app, server, wss };