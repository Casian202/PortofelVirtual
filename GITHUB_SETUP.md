# GitHub Setup Instructions

The codebase is now prepared for GitHub with all sensitive data cleaned up (`.env`, `node_modules`, `dist/` are gitignored).

## Steps to Push to GitHub

### 1. Create a Private Repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `PortofelVirtual`
3. **Description:** Modern financial management application with multi-currency support
4. **Private:** Yes (make sure to select "Private")
5. **Initialize without README/gitignore** (we already have these)
6. Click **Create repository**

### 2. Push Your Code

After creating the repository, you'll see push instructions. Run these commands:

```bash
cd C:\Users\casy_\Desktop\Buget

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/PortofelVirtual.git

# Rename branch to main (optional but recommended)
git branch -m master main

# Push all commits to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### 3. Verify

1. Refresh your GitHub repository page
2. You should see:
   - 2 commits (✓ Initial commit + ✓ Complete multi-currency implementation)
   - All code files
   - README.md with setup instructions and **default admin credentials**

## Default Admin Credentials
To create admin account execute after running
docker exec portofelvirtual-backend node -e "
import bcrypt from 'bcryptjs';
import { query } from './src/db.js';

(async () => {
  const pwd = 'Temporara123!';
  const hash = await bcrypt.hash(pwd, 10);
  await query('INSERT INTO users (id, email, password_hash, full_name, role) VALUES (\$1, \$2, \$3, \$4, \$5) ON CONFLICT DO NOTHING', ['00000000-0000-0000-0000-000000000002', 'test@test.ro', hash, 'Test Admin', 'admin']);
  console.log('Admin creat: test@test.ro / Temporara123!');
})();
"

**IMPORTANT:** Change this password immediately after first login!

## Repository Contents

The repository contains:
- ✅ Full React frontend code
- ✅ Express.js backend code
- ✅ PostgreSQL database migrations
- ✅ Docker Compose setup
- ✅ Environment configuration
- ✅ Complete README with setup guide
- ✅ `.gitignore` (excludes `.env`, `node_modules`, `dist/`, etc.)

## No Sensitive Data

The following are properly gitignored and NOT in the repository:
- ❌ `.env` files
- ❌ `node_modules/`
- ❌ `dist/` (build output)
- ❌ `.vscode/` settings
- ❌ User tokens or secrets

## After Pushing

Your repository will be private and include:

**Initial Setup Commit:**
- All project files
- Database migrations
- Docker configuration
- API backend with routes
- React frontend components

**Multi-Currency Feature Commit:**
- Currency selectors on Dashboard, Goals, Investments, Wallet
- Exchange rate conversion UI
- Per-transaction currency display
- Goal currency-specific add amount dialog
- Investment portfolio with currency conversion

## Next Steps

1. ✅ Create private GitHub repository
2. ✅ Push the code
3. ✅ Repository created (you're here)
4. Share repository URL with team members (add as collaborators if needed)
5. Configure branch protection rules (optional)
6. Set up CI/CD if desired

---

**Questions?** Check the README.md for detailed setup and API documentation.
