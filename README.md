# PortofelVirtual - Modern Financial Management App

A comprehensive financial management application built with React, Express.js, and PostgreSQL. Track expenses, manage investments, set savings goals, and monitor your wallet across multiple currencies.

## Features

- 💰 **Multi-Currency Support** — Manage transactions in RON, EUR, USD, GBP with real-time exchange rates
- 📊 **Dashboard** — Overview of income, expenses, and savings with interactive charts
- 💳 **Wallet Management** — Track balances across different currencies
- 🎯 **Savings Goals** — Set financial targets and monitor progress
- 📈 **Investment Tracking** — Manage portfolio with profit/loss calculations
- 🏦 **Admin Panel** — User management and exchange rate settings
- 🔐 **Secure Authentication** — Token-based authentication system

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS for styling
- Framer Motion for animations
- React Query for state management
- Recharts for data visualization

### Backend
- Node.js 20 with Express.js
- PostgreSQL 15 for database
- JWT authentication
- WebSocket support for real-time updates

### Deployment
- Docker & Docker Compose
- Nginx (frontend reverse proxy)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ (if not using Docker)

### Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd PortofelVirtual
```

2. **Start with Docker (Recommended)**
```bash
docker compose up -d
```

The application will be available at:
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:3001
- Database: localhost:5432

3. **Initial Admin Account**
```
Email: admin@portofelvirtual.ro
Password: AdminPass123!
```

4. **First Steps**
   - Open http://localhost in your browser
   - Login with the credentials above
   - Go to Admin page to manage users and exchange rates
   - Create your first budget category and transaction

### Local Development

1. **Install dependencies**
```bash
npm install
cd backend && npm install && cd ..
```

2. **Set up environment variables**

Create `.env` file in project root:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portofelvirtual
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

3. **Run frontend (Vite dev server)**
```bash
npm run dev
```

4. **Run backend**
```bash
cd backend
npm start
```

5. **Database setup**
The database is automatically initialized on first Docker Compose startup with migrations.

## Project Structure

```
├── src/                    # Frontend source
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── api/              # API client
│   ├── lib/              # Utilities
│   └── hooks/            # Custom React hooks
├── backend/               # Backend source
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth & validation
│   │   ├── db.js        # Database client
│   │   └── server.js    # Express setup
│   ├── migrations/       # SQL migrations
│   └── package.json
├── public/               # Static assets
├── docker-compose.yml
├── frontend.Dockerfile
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your_secret_key
NODE_ENV=production|development
PORT=3001
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001
```

## API Documentation

### Authentication
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Login and receive JWT token

### Transactions
- `GET /api/transactions` — Fetch all transactions
- `POST /api/transactions` — Create transaction
- `PUT /api/transactions/:id` — Update transaction
- `DELETE /api/transactions/:id` — Delete transaction

### Savings Goals
- `GET /api/goals` — Fetch all goals
- `POST /api/goals` — Create goal
- `PUT /api/goals/:id` — Update goal
- `DELETE /api/goals/:id` — Delete goal

### Exchange Rates
- `GET /api/exchange-rates` — Fetch current rates
- `PUT /api/exchange-rates/:id` — Update rates (Admin only)

### Wallet
- `GET /api/wallet/balance` — Fetch current balances
- `GET /api/wallet/summary` — Fetch wallet stats

## Database Schema

Main tables:
- `users` — User accounts and authentication
- `transactions` — Income/expense records with categories
- `budget_categories` — Expense and income categories
- `savings_goals` — Financial targets with progress tracking
- `investments` — Investment portfolio with returns
- `exchange_rates` — Currency conversion rates (RON/EUR/USD/GBP)

## Default Admin Account

```
Email: admin@portofelvirtual.ro
Password: AdminPass123!
```

⚠️ **IMPORTANT:** Change this password immediately after first login.

## Key Features Explained

### Multi-Currency Dashboard
- View KPI cards for each active currency
- Switch between currencies using arrow selectors
- Real-time exchange rate conversions

### Transaction Management
- Add income/expense with category and custom amount currency
- Edit/delete transactions
- Filter by type and date range
- Display actual currency for each transaction

### Wallet (Portofel)
- Shows only currencies you have transactions in
- Displays balance for each currency
- Cumulative savings chart with monthly breakdown
- Currency-specific views with conversion

### Savings Goals
- Set goals in any currency (RON/EUR/USD/GBP)
- Track progress with visual progress bars
- Add funds to goals dynamically
- Currency conversion when viewing in display currency

### Investments
- Manage portfolio with RON-based initial cost
- View profit/loss with currency conversion
- Display returns as percentage
- Edit investment details

### Admin Panel
- Manage user accounts (create/view/delete)
- Update exchange rates manually
- Monitor system health

## Development Notes

- All backend code uses ES Modules (import/export syntax)
- Frontend uses absolute path aliases (@/) for cleaner imports
- Database migrations run automatically on Docker startup
- Exchange rates are editable through Admin panel
- WebSocket connections for real-time updates
- Responsive design works on all screen sizes

## Building & Deployment

### Production Build
```bash
npm run build
docker compose build --no-cache frontend backend
docker compose up -d
```

### Docker Services
- `portofelvirtual-frontend` — Nginx serving React bundle
- `portofelvirtual-backend` — Node.js Express server
- `portofelvirtual-db` — PostgreSQL database

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support & Contact

- Email: support@portofelvirtual.ro
- Issues: Use GitHub Issues tracker
- Documentation: Check inline code comments

---

**Happy budgeting! 💚**
