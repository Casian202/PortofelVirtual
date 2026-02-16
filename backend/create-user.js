import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'portofelvirtual',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'portofel_virtual_secure_2024',
});

async function createUser() {
  try {
    const email = 'casitoadere@gmail.com';
    const password = 'Admin123!';
    const fullName = 'Admin';
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $3,
        must_change_password = $6
    `, [userId, email, passwordHash, fullName, 'admin', true]);

    console.log('✅ User created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: admin');
    console.log('⚠️  You will be asked to change password on first login.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();