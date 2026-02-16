# API Documentation - PortofelVirtual FastAPI

Această documentație descrie toate endpoint-urile API disponibile pentru integrarea cu OpenWebUI și alți clienți.

## Cuprins

1. [Autentificare](#1-autentificare)
2. [Tranzacții](#2-tranzacții)
3. [Categorii](#3-categorii)
4. [Investiții](#4-investiții)
5. [Obiective de Economisire](#5-obiective-de-economisire)
6. [Portofel și Sumar](#6-portofel-și-sumar)
7. [Cursuri de Schimb](#7-cursuri-de-schimb)
8. [Administrație](#8-administrație)
9. [Endpoint-uri pentru AI (OpenWebUI)](#9-endpoint-uri-pentru-ai-openwebui)
10. [Structura Bazei de Date](#10-structura-bazei-de-date)

---

## Autentificare

Toate endpoint-urile (exceptând `/api/auth/login` și `/api/health`) necesită autentificare JWT.

**Header necesar:**
```
Authorization: Bearer <token>
```

Token-ul se obține prin endpoint-ul de login.

---

## 1. Autentificare

### POST `/api/auth/login`
Autentifică utilizatorul și returnează token JWT.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "parola123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "must_change_password": false
  }
}
```

### GET `/api/auth/me`
Returnează informațiile utilizatorului curent.

**Response:** Obiect User

### POST `/api/auth/change-password`
Schimbă parola utilizatorului.

**Request Body:**
```json
{
  "current_password": "parola_veche",
  "new_password": "parola_noua"
}
```

---

## 2. Tranzacții

### GET `/api/transactions`
Listează toate tranzacțiile utilizatorului.

**Query Parameters:**
- `sort` - Sortare după dată: `asc` sau `desc` (default: `desc`)
- `type` - Filtrare după tip: `income` sau `expense`
- `month` - Filtrare după lună: format `YYYY-MM`
- `limit` - Număr maxim rezultate (default: 100, max: 1000)
- `offset` - Paginare (default: 0)

**Response:** Listă de obiecte Transaction

### GET `/api/transactions/{id}`
Returnează o tranzacție specifică.

### POST `/api/transactions`
Creează o tranzacție nouă.

**Request Body:**
```json
{
  "amount": 150.50,
  "type": "expense",
  "category_id": "uuid-opțional",
  "category_name": "Food",
  "description": "Cumpărături săptămânale",
  "date": "2024-01-15",
  "month": "2024-01",
  "currency": "RON",
  "is_recurring": false,
  "recurring_day": null
}
```

**Câmpuri obligatorii:** `amount`, `type`, `category_name`, `date`, `month`

### PUT `/api/transactions/{id}`
Actualizează o tranzacție existentă.

### DELETE `/api/transactions/{id}`
Șterge o tranzacție.

### POST `/api/transactions/generate-recurring`
Generează tranzacțiile recurente pentru o lună specificată.

**Request Body:**
```json
{
  "month": "2024-02"
}
```

### POST `/api/transactions/stop-recurring/{group_id}`
Oprește viitoarele tranzacții recurente dintr-un grup.

---

## 3. Categorii

### GET `/api/categories`
Listează toate categoriile utilizatorului.

**Query Parameters:**
- `type` - Filtrare după tip: `income` sau `expense`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Salary",
    "type": "income",
    "icon": "💰",
    "color": "#4CAF50",
    "is_active": true,
    "created_date": "2024-01-01T00:00:00Z"
  }
]
```

### GET `/api/categories/{id}`
Returnează o categorie specifică.

### POST `/api/categories`
Creează o categorie nouă.

**Request Body:**
```json
{
  "name": "Food",
  "type": "expense",
  "icon": "🍔",
  "color": "#FF5722",
  "is_active": true
}
```

### PUT `/api/categories/{id}`
Actualizează o categorie existentă.

### DELETE `/api/categories/{id}`
Șterge o categorie.

---

## 4. Investiții

### GET `/api/investments`
Listează toate investițiile utilizatorului.

**Query Parameters:**
- `sort` - Sortare după data achiziției: `asc` sau `desc`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Bitcoin",
    "type": "crypto",
    "initial_amount": 1000.00,
    "current_value": 1500.00,
    "purchase_date": "2023-01-15",
    "notes": "Cumpărat pe Binance",
    "created_date": "2023-01-15T00:00:00Z"
  }
]
```

### GET `/api/investments/{id}`
Returnează o investiție specifică.

### POST `/api/investments`
Creează o investiție nouă.

**Request Body:**
```json
{
  "name": "Apple Stock",
  "type": "stocks",
  "initial_amount": 5000.00,
  "current_value": 5500.00,
  "purchase_date": "2023-06-01",
  "notes": "10 shares AAPL"
}
```

### PUT `/api/investments/{id}`
Actualizează o investiție existentă.

### DELETE `/api/investments/{id}`
Șterge o investiție.

---

## 5. Obiective de Economisire

### GET `/api/goals`
Listează toate obiectivele de economisire.

**Query Parameters:**
- `sort` - Sortare după deadline: `asc` sau `desc`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Emergency Fund",
    "target_amount": 10000.00,
    "current_amount": 5000.00,
    "deadline": "2024-12-31",
    "icon": "💰",
    "color": "#2196F3",
    "is_completed": false,
    "currency": "RON"
  }
]
```

### GET `/api/goals/{id}`
Returnează un obiectiv specific.

### POST `/api/goals`
Creează un obiectiv nou.

**Request Body:**
```json
{
  "name": "Vacation",
  "target_amount": 3000.00,
  "current_amount": 0,
  "deadline": "2024-06-01",
  "icon": "🏖️",
  "color": "#FF9800",
  "currency": "RON"
}
```

### PUT `/api/goals/{id}`
Actualizează un obiectiv existent.

### DELETE `/api/goals/{id}`
Șterge un obiectiv.

### POST `/api/goals/{id}/add-amount`
Adaugă o sumă la un obiectiv.

**Query Parameters:**
- `amount` - Suma de adăugat (pozitivă)

---

## 6. Portofel și Sumar

### GET `/api/wallet/balance`
Returnează balanța curentă pe monede.

**Response:**
```json
[
  {
    "currency": "RON",
    "total_income": 50000.00,
    "total_expenses": 35000.00,
    "balance": 15000.00,
    "transaction_count": 150
  },
  {
    "currency": "EUR",
    "total_income": 1000.00,
    "total_expenses": 500.00,
    "balance": 500.00,
    "transaction_count": 10
  }
]
```

### GET `/api/wallet/summary`
Returnează sumarul complet al portofelului.

**Response:**
```json
{
  "balances": [...],
  "monthly_summaries": [
    {
      "month": "2024-01",
      "total_income": 5000.00,
      "total_expenses": 3000.00,
      "net_savings": 2000.00,
      "cumulative_savings": 2000.00,
      "transaction_count": 25
    }
  ],
  "total_balance_ron": 15200.00
}
```

### GET `/api/wallet/monthly/{month}`
Returnează sumarul pentru o lună specifică.

### GET `/api/wallet/stats/categories`
Returnează statistici pe categorii.

---

## 7. Cursuri de Schimb

### GET `/api/exchange-rates`
Listează toate cursurile de schimb.

**Response:**
```json
[
  {
    "id": 1,
    "currency": "EUR",
    "rate": 4.97,
    "updated_at": "2024-01-15T00:00:00Z"
  },
  {
    "id": 2,
    "currency": "USD",
    "rate": 4.58,
    "updated_at": "2024-01-15T00:00:00Z"
  }
]
```

### POST `/api/exchange-rates` (Admin)
Adaugă un curs de schimb nou.

**Request Body:**
```json
{
  "currency": "GBP",
  "rate": 5.75
}
```

### PUT `/api/exchange-rates/{currency}` (Admin)
Actualizează un curs de schimb existent.

### DELETE `/api/exchange-rates/{currency}` (Admin)
Șterge un curs de schimb.

---

## 8. Administrație (doar admin)

### GET `/api/admin/users`
Listează toți utilizatorii.

### POST `/api/admin/users`
Creează un utilizator nou.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "parola123",
  "full_name": "New User"
}
```

### DELETE `/api/admin/users/{id}`
Șterge un utilizator.

### PUT `/api/admin/users/{id}/role`
Schimbă rolul unui utilizator.

**Query Parameters:**
- `role` - Noul rol: `user` sau `admin`

---

## 9. Endpoint-uri pentru AI (OpenWebUI)

Aceste endpoint-uri sunt special concepute pentru a fi ușor de utilizat de către asistenții AI.

### GET `/api/ai/data`
**Cel mai important endpoint pentru AI!**

Returnează TOATE datele utilizatorului într-un singur request structurat.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  "categories": [...],
  "transactions": [...],
  "investments": [...],
  "goals": [...],
  "exchange_rates": [...],
  "wallet_summary": {
    "balances": [...],
    "monthly_summaries": [...],
    "total_balance_ron": 15000.00
  }
}
```

### GET `/api/ai/explain`
Returnează o explicație textuală a datelor utilizatorului.

**Response:**
```json
{
  "user": {
    "description": "The authenticated user of the budget application",
    "data": {"name": "John Doe", "email": "user@example.com", "role": "user"}
  },
  "categories": {
    "description": "Budget categories for organizing income and expenses",
    "income_categories": [...],
    "expense_categories": [...]
  },
  "transactions": {
    "description": "Financial transactions (income and expenses)",
    "total_count": 150,
    "income_count": 30,
    "expense_count": 120
  },
  "investments": {
    "description": "User's investments (stocks, crypto, etc.)",
    "total_count": 3,
    "total_initial": 10000.00,
    "total_current": 12000.00
  },
  "goals": {
    "description": "Savings goals the user is working towards",
    "goals": [
      {
        "name": "Emergency Fund",
        "target": 10000.00,
        "current": 5000.00,
        "progress": "50.0%",
        "completed": false
      }
    ]
  },
  "wallet": {
    "description": "Current financial summary",
    "total_balance_ron": 15000.00,
    "balances_by_currency": [...]
  }
}
```

### POST `/api/ai/transaction`
Creează o tranzacție cu input simplificat. Ideal pentru AI!

**Caracteristici speciale:**
- Auto-setează `date` la data curentă dacă nu e specificată
- Auto-generează `month` din dată
- Creează automat categoria dacă nu există

**Request Body:**
```json
{
  "amount": 150.50,
  "type": "expense",
  "category_name": "Food",
  "description": "Cumpărături săptămânale",
  "currency": "RON"
}
```

**Pentru tranzacții recurente:**
```json
{
  "amount": 5000,
  "type": "income",
  "category_name": "Salary",
  "description": "Salariu lunar",
  "is_recurring": true,
  "recurring_day": 1
}
```

### POST `/api/ai/goal`
Creează un obiectiv de economisire cu input simplificat.

**Request Body:**
```json
{
  "name": "Emergency Fund",
  "target_amount": 10000,
  "current_amount": 2000,
  "deadline": "2024-12-31",
  "icon": "💰"
}
```

### POST `/api/ai/investment`
Creează o investiție cu input simplificat.

**Request Body:**
```json
{
  "name": "Bitcoin",
  "type": "crypto",
  "initial_amount": 1000,
  "current_value": 1500,
  "notes": "Cumpărat pe Binance"
}
```

### POST `/api/ai/goal/{goal_id}/contribute`
Adaugă bani la un obiectiv de economisire.

**Query Parameters:**
- `amount` - Suma de adăugat

### GET `/api/ai/categories/suggest`
Returnează sugestii de categorii pentru AI.

**Response:**
```json
{
  "existing_categories": [...],
  "suggested_categories": {
    "income": [
      {"name": "Salary", "icon": "💰", "description": "Regular employment income"},
      {"name": "Freelance", "icon": "💻", "description": "Freelance or contract work"}
    ],
    "expense": [
      {"name": "Food", "icon": "🍔", "description": "Groceries, restaurants, food delivery"},
      {"name": "Transport", "icon": "🚗", "description": "Gas, public transport, car maintenance"}
    ]
  },
  "tip": "When creating a transaction, use the category_name from existing categories..."
}
```

---

## 10. Structura Bazei de Date

### Tabelul `users`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | Email unic |
| `password_hash` | VARCHAR(255) | Parolă hashată (bcrypt) |
| `full_name` | VARCHAR(255) | Nume complet |
| `role` | VARCHAR(50) | Rol: 'user' sau 'admin' |
| `must_change_password` | BOOLEAN | Trebuie să schimbe parola |
| `created_date` | TIMESTAMP | Data creării |
| `updated_date` | TIMESTAMP | Data ultimei actualizări |

### Tabelul `budget_categories`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Nume categorie |
| `type` | VARCHAR(50) | 'income' sau 'expense' |
| `icon` | VARCHAR(50) | Emoji (default: '💡') |
| `color` | VARCHAR(50) | Cod culoare hex |
| `is_active` | BOOLEAN | Este activă |
| `created_by` | UUID | FK către users |
| `created_date` | TIMESTAMP | Data creării |
| `updated_date` | TIMESTAMP | Data ultimei actualizări |

### Tabelul `transactions`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | UUID | Primary key |
| `amount` | DECIMAL(15,2) | Suma |
| `type` | VARCHAR(50) | 'income' sau 'expense' |
| `category_id` | UUID | FK către categories (opțional) |
| `category_name` | VARCHAR(255) | Nume categorie |
| `description` | TEXT | Descriere |
| `date` | DATE | Data tranzacției |
| `month` | VARCHAR(7) | Luna (YYYY-MM) |
| `currency` | VARCHAR(3) | Moneda (default: 'RON') |
| `is_recurring` | BOOLEAN | Este recurentă |
| `recurring_group_id` | UUID | ID grup pentru recurente |
| `recurring_day` | INTEGER | Ziua lunii pentru recurentă |
| `created_by` | UUID | FK către users |
| `created_date` | TIMESTAMP | Data creării |
| `updated_date` | TIMESTAMP | Data ultimei actualizări |

### Tabelul `investments`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Nume investiție |
| `type` | VARCHAR(100) | Tip (crypto, stocks, etc.) |
| `initial_amount` | DECIMAL(15,2) | Suma inițială |
| `current_value` | DECIMAL(15,2) | Valoarea curentă |
| `purchase_date` | DATE | Data achiziției |
| `notes` | TEXT | Note |
| `created_by` | UUID | FK către users |
| `created_date` | TIMESTAMP | Data creării |
| `updated_date` | TIMESTAMP | Data ultimei actualizări |

### Tabelul `savings_goals`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Nume obiectiv |
| `target_amount` | DECIMAL(15,2) | Suma țintă |
| `current_amount` | DECIMAL(15,2) | Suma curentă |
| `deadline` | DATE | Data limită |
| `icon` | VARCHAR(50) | Emoji (default: '🎯') |
| `color` | VARCHAR(50) | Cod culoare hex |
| `is_completed` | BOOLEAN | Este completat |
| `currency` | VARCHAR(3) | Moneda |
| `created_by` | UUID | FK către users |
| `created_date` | TIMESTAMP | Data creării |
| `updated_date` | TIMESTAMP | Data ultimei actualizări |

### Tabelul `exchange_rates`
| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | SERIAL | Primary key |
| `currency` | VARCHAR(3) | Cod monedă (EUR, USD, etc.) |
| `rate` | DECIMAL(10,4) | Curs față de RON |
| `updated_at` | TIMESTAMP | Data actualizării |
| `updated_by` | UUID | FK către users |

---

## Configurare și Rulare

### Opțiunea 1: Docker (Recomandat)

Aplicația FastAPI este integrată în stack-ul Docker principal al aplicației PortofelVirtual.

```bash
# Din rădăcina proiectului (unde este docker-compose.yml)
docker compose up --build
```

Aceasta va porni toate serviciile:
- **PostgreSQL** (port 5433)
- **Backend Express** (port 3001)
- **FastAPI** (port 8000) ← NOU
- **Frontend** (port 8888)

### Opțiunea 2: Rulare Locală (Dezvoltare)

Pentru dezvoltare locală fără Docker:

1. **Instalează dependențele:**
```bash
cd fastapi_app
pip install -r requirements.txt
```

2. **Creează fișierul `.env`:**
```env
# Pentru conexiune locală la PostgreSQL
DATABASE_URL=postgresql://postgres:portofel_virtual_secure_2024@localhost:5433/portofelvirtual
JWT_SECRET=portofel_virtual_jwt_secret_key_2024
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
FASTAPI_PORT=8000
FASTAPI_HOST=0.0.0.0
CORS_ORIGINS=*
```

3. **Pornește serverul:**
```bash
# Linux/Mac
./run.sh

# Windows
run.bat

# Sau direct
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Variabile de Mediu

| Variabilă | Descriere | Default |
|-----------|-----------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://...` |
| `JWT_SECRET` | Secret JWT | `portofel_virtual_jwt_secret_key_2024` |
| `JWT_ALGORITHM` | Algoritm JWT | `HS256` |
| `JWT_EXPIRE_DAYS` | Zile expirare token | `7` |
| `FASTAPI_PORT` | Port server | `8000` |
| `FASTAPI_HOST` | Host server | `0.0.0.0` |
| `CORS_ORIGINS` | Origin CORS | `*` |

### Documentație Interactivă

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

### Arhitectură Docker

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Frontend   │  │   Backend   │  │      FastAPI        │  │
│  │  (Nginx)    │  │  (Express)  │  │  (Python/Uvicorn)   │  │
│  │  Port: 8888 │  │  Port: 3001 │  │     Port: 8000      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          │                                  │
│                   ┌──────┴──────┐                           │
│                   │  PostgreSQL │                           │
│                   │   Port: 5432│                           │
│                   │ (intern)    │                           │
│                   └─────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Porturi expuse:**
- `8888` - Frontend React
- `3001` - Backend Express API
- `8000` - FastAPI (pentru OpenWebUI/AI)
- `5433` - PostgreSQL (extern)

---

## Integrare cu OpenWebUI

Pentru a integra acest API cu OpenWebUI, configurează un tool personalizat cu următoarele specificații:

### Configurare Tool

1. **Nume**: PortofelVirtual Budget API
2. **Base URL**: `http://localhost:8000/api`
3. **Autentificare**: Bearer Token (din `/auth/login`)

### Endpoint-uri Recomandate pentru AI

| Acțiune | Endpoint | Metodă |
|---------|----------|--------|
| Obține toate datele | `/ai/data` | GET |
| Înțelege datele | `/ai/explain` | GET |
| Adaugă tranzacție | `/ai/transaction` | POST |
| Adaugă obiectiv | `/ai/goal` | POST |
| Adaugă investiție | `/ai/investment` | POST |
| Contribuie la obiectiv | `/ai/goal/{id}/contribute?amount=X` | POST |
| Sugestii categorii | `/ai/categories/suggest` | GET |

### Exemple de Prompt-uri pentru AI

**Pentru a obține datele utilizatorului:**
```
GET /api/ai/data
Headers: Authorization: Bearer <token>
```

**Pentru a adăuga o cheltuială:**
```
POST /api/ai/transaction
Headers: Authorization: Bearer <token>
Body: {
  "amount": 150,
  "type": "expense",
  "category_name": "Food",
  "description": "Cumpărături"
}
```

**Pentru a adăuga un venit recurent:**
```
POST /api/ai/transaction
Headers: Authorization: Bearer <token>
Body: {
  "amount": 5000,
  "type": "income",
  "category_name": "Salary",
  "description": "Salariu lunar",
  "is_recurring": true,
  "recurring_day": 1
}
```

---

## Note Importante

1. **Autentificare**: Toate endpoint-urile (exceptând login și health) necesită token JWT valid
2. **Timezone**: Toate datele sunt stocate în timezone-ul Europe/Bucharest
3. **Moneda implicită**: RON (Romanian Leu)
4. **Cursuri de schimb**: Sunt relative la RON (1 EUR = 4.97 RON înseamnă că rate = 4.97)
5. **Categorii**: Se creează automat când adaugi o tranzacție prin `/ai/transaction`
6. **Tranzacții recurente**: Se generează manual prin `/transactions/generate-recurring`