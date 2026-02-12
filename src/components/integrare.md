# Ghid Integrare Backend Node.js + PostgreSQL

## Prezentare Generală

Aplicația folosește în prezent SDK-ul Base44 (`base44.entities.*`) pentru gestionarea datelor. Acest ghid explică cum să înlocuiești aceste apeluri cu un backend propriu Node.js + PostgreSQL.

---

## 1. Structura Bazei de Date PostgreSQL

### Tabele Necesare

```sql
-- Tabela Users (gestionată de sistem autentificare)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin' sau 'user'
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW()
);

-- Tabela BudgetCategory
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'income' sau 'expense'
    icon VARCHAR(10),
    color VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW()
);

-- Tabela Transaction
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'income' sau 'expense'
    category_id UUID,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    month VARCHAR(7) NOT NULL, -- format 'YYYY-MM'
    created_by VARCHAR(255),
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW()
);

-- Tabela Investment
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'stocks', 'crypto', 'real_estate', etc.
    initial_amount DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW()
);

-- Tabela SavingsGoal
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    deadline DATE,
    icon VARCHAR(10),
    color VARCHAR(50),
    is_completed BOOLEAN DEFAULT false,
    created_by VARCHAR(255),
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW()
);
```

### Indecși pentru Performanță

```sql
CREATE INDEX idx_transactions_month ON transactions(month);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_budget_categories_type ON budget_categories(type);
CREATE INDEX idx_investments_created_by ON investments(created_by);
CREATE INDEX idx_savings_goals_created_by ON savings_goals(created_by);
```

---

## 2. API Endpoints Backend Node.js

### Structură Recomandată Express.js

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Conexiune PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Middleware autentificare (exemplu simplu cu JWT)
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verifică JWT și extrage user_email
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user; // { email, role }
    next();
  });
};

// Routes
app.use('/api/budget-categories', require('./routes/budgetCategories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/savings-goals', require('./routes/savingsGoals'));
app.use('/api/auth', require('./routes/auth'));

app.listen(3001, () => console.log('Server running on port 3001'));
```

### Exemple de Routes (transactions.js)

```javascript
// routes/transactions.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/transactions - List all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sort = '-date', limit = 1000 } = req.query;
    const orderBy = sort.startsWith('-') 
      ? `${sort.slice(1)} DESC` 
      : `${sort} ASC`;
    
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE created_by = $1 
       ORDER BY ${orderBy} 
       LIMIT $2`,
      [req.user.email, limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions - Create
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, type, category_id, category_name, description, date, month } = req.body;
    
    const result = await pool.query(
      `INSERT INTO transactions 
       (amount, type, category_id, category_name, description, date, month, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [amount, type, category_id, category_name, description, date, month, req.user.email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/transactions/:id - Update
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE transactions 
       SET ${setClause}, updated_date = NOW() 
       WHERE id = $${fields.length + 1} AND created_by = $${fields.length + 2} 
       RETURNING *`,
      [...values, id, req.user.email]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.email]
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 3. Înlocuire în Frontend

### Creează un Client API

```javascript
// src/api/apiClient.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Interceptor pentru a adăuga token JWT
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Budget Categories
  budgetCategories: {
    list: () => axios.get(`${API_BASE_URL}/budget-categories`).then(res => res.data),
    create: (data) => axios.post(`${API_BASE_URL}/budget-categories`, data).then(res => res.data),
    update: (id, data) => axios.put(`${API_BASE_URL}/budget-categories/${id}`, data).then(res => res.data),
    delete: (id) => axios.delete(`${API_BASE_URL}/budget-categories/${id}`),
  },
  
  // Transactions
  transactions: {
    list: (sort = '-date') => axios.get(`${API_BASE_URL}/transactions?sort=${sort}`).then(res => res.data),
    create: (data) => axios.post(`${API_BASE_URL}/transactions`, data).then(res => res.data),
    update: (id, data) => axios.put(`${API_BASE_URL}/transactions/${id}`, data).then(res => res.data),
    delete: (id) => axios.delete(`${API_BASE_URL}/transactions/${id}`),
  },
  
  // Investments
  investments: {
    list: (sort = '-purchase_date') => axios.get(`${API_BASE_URL}/investments?sort=${sort}`).then(res => res.data),
    create: (data) => axios.post(`${API_BASE_URL}/investments`, data).then(res => res.data),
    update: (id, data) => axios.put(`${API_BASE_URL}/investments/${id}`, data).then(res => res.data),
    delete: (id) => axios.delete(`${API_BASE_URL}/investments/${id}`),
  },
  
  // Savings Goals
  savingsGoals: {
    list: (sort = '-created_date') => axios.get(`${API_BASE_URL}/savings-goals?sort=${sort}`).then(res => res.data),
    create: (data) => axios.post(`${API_BASE_URL}/savings-goals`, data).then(res => res.data),
    update: (id, data) => axios.put(`${API_BASE_URL}/savings-goals/${id}`, data).then(res => res.data),
    delete: (id) => axios.delete(`${API_BASE_URL}/savings-goals/${id}`),
  },
  
  // Auth
  auth: {
    login: (email, password) => axios.post(`${API_BASE_URL}/auth/login`, { email, password }).then(res => res.data),
    me: () => axios.get(`${API_BASE_URL}/auth/me`).then(res => res.data),
    logout: () => {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }
};
```

---

## 4. Modificări în Componentele React

### Exemplu: pages/Dashboard.js

**ÎNAINTE (cu Base44):**
```javascript
import { base44 } from "@/api/base44Client";

const { data: transactions = [], isLoading } = useQuery({
  queryKey: ["transactions"],
  queryFn: () => base44.entities.Transaction.list("-date"),
});
```

**DUPĂ (cu API propriu):**
```javascript
import { apiClient } from "@/api/apiClient";

const { data: transactions = [], isLoading } = useQuery({
  queryKey: ["transactions"],
  queryFn: () => apiClient.transactions.list("-date"),
});
```

### Exemplu: pages/Incomes.js

**ÎNAINTE:**
```javascript
const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Transaction.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
});
```

**DUPĂ:**
```javascript
const createMutation = useMutation({
  mutationFn: (data) => apiClient.transactions.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
});
```

---

## 5. Fișiere ce Trebuie Modificate

### Lista Completă de Fișiere

| Fișier | Entități Folosite | Înlocuire |
|--------|-------------------|-----------|
| `pages/Dashboard.js` | Transaction | `apiClient.transactions.*` |
| `pages/Incomes.js` | Transaction, BudgetCategory | `apiClient.transactions.*`, `apiClient.budgetCategories.*` |
| `pages/Expenses.js` | Transaction, BudgetCategory | `apiClient.transactions.*`, `apiClient.budgetCategories.*` |
| `pages/BudgetSettings.js` | BudgetCategory | `apiClient.budgetCategories.*` |
| `pages/Investments.js` | Investment | `apiClient.investments.*` |
| `pages/Goals.js` | SavingsGoal | `apiClient.savingsGoals.*` |
| `Layout.js` | User (auth) | `apiClient.auth.me()`, `apiClient.auth.logout()` |

---

## 6. Autentificare

### Backend: Endpoint Login

```javascript
// routes/auth.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Verifică credențialele (folosește bcrypt pentru hash-uri)
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (!user.rows[0] || !bcrypt.compareSync(password, user.rows[0].password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generează JWT
  const token = jwt.sign(
    { email: user.rows[0].email, role: user.rows[0].role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({ token, user: user.rows[0] });
});

router.get('/me', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [req.user.email]);
  res.json(result.rows[0]);
});
```

### Frontend: Pagină Login

```javascript
// pages/Login.js
import { useState } from 'react';
import { apiClient } from '@/api/apiClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { token } = await apiClient.auth.login(email, password);
      localStorage.setItem('auth_token', token);
      window.location.href = '/';
    } catch (error) {
      alert('Login failed');
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 7. Pași de Migrare

1. **Setup Backend:**
   - Creează proiect Node.js: `npm init -y`
   - Instalează dependințe: `npm install express pg cors jsonwebtoken bcryptjs dotenv`
   - Configurează PostgreSQL și creează tabelele
   - Implementează routes-urile

2. **Creează apiClient.js** în frontend

3. **Înlocuiește import-urile:**
   - Înlocuiește `import { base44 } from "@/api/base44Client"` cu `import { apiClient } from "@/api/apiClient"`

4. **Înlocuiește apelurile:**
   - `base44.entities.Transaction.list()` → `apiClient.transactions.list()`
   - `base44.entities.Transaction.create(data)` → `apiClient.transactions.create(data)`
   - `base44.entities.Transaction.update(id, data)` → `apiClient.transactions.update(id, data)`
   - `base44.entities.Transaction.delete(id)` → `apiClient.transactions.delete(id)`
   - Similar pentru toate entitățile

5. **Testează fiecare pagină** după migrare

---

## 8. Variabile de Mediu

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here
PORT=3001
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
```

---

## 9. Docker Setup (Opțional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: finance_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: finance_db
      DB_USER: postgres
      DB_PASSWORD: your_password

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

**Succes cu integrarea!** 🚀