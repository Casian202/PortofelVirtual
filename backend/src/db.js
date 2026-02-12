import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Configure pg to parse DECIMAL/NUMERIC as float
pkg.types.setTypeParser(1700, function(val) {
  return parseFloat(val);
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'portofelvirtual',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'portofel_virtual_secure_2024',
});

// Test connection
pool.on('connect', () => {
  console.log('PostgreSQL connected successfully');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// Query helper
export const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: result.rowCount });
  return result;
};

// Get single row
export const getOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0];
};

// Get multiple rows
export const getMany = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};

// Transaction helper
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;