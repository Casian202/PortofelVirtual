# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **PortofelVirtual** (Romanian for "Virtual Wallet") - a full-stack personal budget management application with:
- **Frontend**: React 18 + Vite + TailwindCSS + shadcn/ui + React Query + React Router
- **Backend**: Express.js + PostgreSQL + WebSocket for real-time updates
- **Authentication**: JWT-based with password change enforcement
- **Timezone**: Europe/Bucharest (Romania) across all dates

## Commands

### Frontend (root directory)
```bash
npm run dev          # Start development server (Vite on port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # Run TypeScript type checking
```

### Backend (`backend/` directory)
```bash
cd backend
npm run dev          # Start with hot reload (--watch)
npm run start        # Start production server
npm run migrate      # Run migrations manually
npm run seed         # Seed database with initial data
```

### Docker (full stack)
```bash
docker compose up --build    # Build and run both frontend + backend
```

## Architecture

### Frontend Structure
```
src/
├── api/apiClient.js         # Axios instance + WebSocket + all API methods
├── lib/
│   ├── AuthContext.jsx       # Auth state management (login, logout, checkAuth)
│   ├── query-client.js       # React Query client configuration
│   └── utils.js             # Utility functions (cn merge, date helpers)
├── components/
│   ├── ui/                  # shadcn/ui components (Dialog, Button, Table, etc.)
│   ├── finance/             # Transaction, Category, Charts components
│   ├── investments/         # Investment cards and forms
│   └── goals/               # Goal components
├── pages/                   # Page components (Dashboard, Incomes, Expenses, etc.)
├── pages.config.js          # Page routing configuration
├── App.jsx                  # Main app with ProtectedRoute, DashboardRoute
└── main.jsx                 # Entry point
```

### Backend Structure
```
backend/
├── src/
│   ├── server.js            # Express app + WebSocket + auto-migrations
│   ├── db.js               # PostgreSQL connection + query helper
│   ├── middleware/auth.js  # JWT authentication middleware
│   ├── routes/             # API routes (auth, transactions, categories, investments, goals, wallet, admin, exchangeRates)
│   └── seed.js             # Database seeding
└── migrations/             # SQL migration files
```

### Database Schema
- **users**: id, email, password_hash, full_name, role, must_change_password
- **transactions**: id, amount, type (income/expense), category_id, description, date, month
- **budget_categories**: id, name, type, icon, color, is_active
- **investments**: id, name, type, initial_amount, current_value, purchase_date
- **savings_goals**: id, name, target_amount, current_amount, deadline, is_completed

### Key Patterns

1. **Page Configuration**: All pages are registered in `pages.config.js`:
   ```javascript
   export const pagesConfig = {
       mainPage: "Dashboard",
       Pages: { "Dashboard": Dashboard, "Incomes": Incomes, ... },
       Layout: __Layout,
   };
   ```

2. **API Client**: All backend calls go through `src/api/apiClient.js` which exports an `api` object with nested methods:
   ```javascript
   api.Transaction.list()
   api.BudgetCategory.create({...})
   api.Investment.update(id, {...})
   ```

3. **Authentication**: JWT stored in localStorage (`auth_token`), user data in localStorage (`user`). AuthContext provides `useAuth()` hook.

4. **Real-time Updates**: WebSocket connection established on login, broadcasts to specific user by ID.

5. **Route Protection**: `ProtectedRoute` checks authentication, `DashboardRoute` enforces password change if required.

6. **Database**: Auto-migrates on backend startup by running SQL files from `backend/migrations/`. All timestamps use `TIMESTAMP WITH TIME ZONE` with `Europe/Bucharest`.

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### Backend (backend/.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
CORS_ORIGIN=http://localhost:5173
```
