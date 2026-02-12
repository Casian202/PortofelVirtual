import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';

export const seedDatabase = async () => {
  try {
    console.log('Seeding database...');

    // Generate password hash
    const password = 'Temporara2024!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Fixed admin user ID
    const adminUserId = '00000000-0000-0000-0000-000000000001';

    // Insert admin user
    await query(`
      INSERT INTO users (id, email, password_hash, full_name, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET password_hash = $3, must_change_password = $6
    `, [
      adminUserId,
      'casitoadere@gmail.com',
      passwordHash,
      'Administrator',
      'admin',
      true
    ]);
    console.log('Admin user created/updated');

    // Insert default expense categories
    const expenseCategories = [
      { name: 'Curent Electric', icon: '💡' },
      { name: 'Apă', icon: '💧' },
      { name: 'Gaz', icon: '🔥' },
      { name: 'Internet', icon: '📡' },
      { name: 'Televiziune', icon: '📺' },
      { name: 'Chirie', icon: '🏠' },
      { name: 'Transport', icon: '🚗' },
      { name: 'Alimente', icon: '🍕' },
      { name: 'Cumpărături', icon: '🛒' },
      { name: 'Sănătate', icon: '💊' },
      { name: 'Distracție', icon: '🎮' },
      { name: 'Îmbrăcăminte', icon: '👕' },
      { name: 'Abonamente', icon: '📱' },
      { name: 'Fitness', icon: '🏋️' },
      { name: 'Educație', icon: '📚' }
    ];

    for (let i = 0; i < expenseCategories.length; i++) {
      const cat = expenseCategories[i];
      // Generate valid UUID based on index
      const catId = `10000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      await query(`
        INSERT INTO budget_categories (id, name, type, icon, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        catId,
        cat.name,
        'expense',
        cat.icon,
        true,
        adminUserId
      ]);
    }
    console.log('Expense categories created');

    // Insert default income categories
    const incomeCategories = [
      { name: 'Salariu', icon: '💰' },
      { name: 'Freelance', icon: '💼' },
      { name: 'Investiții', icon: '📈' },
      { name: 'Bonus', icon: '🎁' },
      { name: 'Altele', icon: '💵' }
    ];

    for (let i = 0; i < incomeCategories.length; i++) {
      const cat = incomeCategories[i];
      // Generate valid UUID based on index
      const catId = `20000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      await query(`
        INSERT INTO budget_categories (id, name, type, icon, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        catId,
        cat.name,
        'income',
        cat.icon,
        true,
        adminUserId
      ]);
    }
    console.log('Income categories created');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
};

// Run seed if called directly
if (process.argv[1].includes('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}