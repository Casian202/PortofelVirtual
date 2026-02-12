/**
 * pages.config.js - Page routing configuration
 */

import Dashboard from './pages/Dashboard';
import Incomes from './pages/Incomes';
import Expenses from './pages/Expenses';
import BudgetSettings from './pages/BudgetSettings';
import Investments from './pages/Investments';
import Goals from './pages/Goals';
import Wallet from './pages/Wallet';
import Admin from './pages/Admin';
import ExchangeRates from './pages/ExchangeRates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Incomes": Incomes,
    "Expenses": Expenses,
    "Wallet": Wallet,
    "Admin": Admin,
    "ExchangeRates": ExchangeRates,
    "BudgetSettings": BudgetSettings,
    "Investments": Investments,
    "Goals": Goals,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};