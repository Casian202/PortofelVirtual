import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { ro } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import KpiCard from "../components/finance/KpiCard";
import MonthSelector from "../components/finance/MonthSelector";
import MonthlyChart from "../components/finance/MonthlyChart";
import TransactionList from "../components/finance/TransactionList";
import ExpensesPieChart from "../components/finance/ExpensesPieChart";
import IncomesPieChart from "../components/finance/IncomesPieChart";
import CategoryTable from "../components/finance/CategoryTable";

// Helper: get current month in Romania timezone
const getRomaniaMonth = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);
};

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(getRomaniaMonth());
  const [selectedCurrency, setSelectedCurrency] = useState('RON');
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.Transaction.list("-date"),
  });

  const currencies = ['RON', 'EUR', 'USD', 'GBP'];
  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };
  const currencyIndex = currencies.indexOf(selectedCurrency);
  const prevCurrency = () => setSelectedCurrency(currencies[(currencyIndex - 1 + currencies.length) % currencies.length]);
  const nextCurrency = () => setSelectedCurrency(currencies[(currencyIndex + 1) % currencies.length]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('transaction_')) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const monthTx = transactions.filter((t) => t.month === currentMonth && t.currency === selectedCurrency);
  const monthIncomes = monthTx.filter((t) => t.type === "income");
  const monthExpenses = monthTx.filter((t) => t.type === "expense");

  const totalIncome = monthIncomes.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = monthExpenses.reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const savings = balance > 0 ? balance : 0;

  // Build last 6 months chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(currentMonth + "-01"), 5 - i);
    const m = format(d, "yyyy-MM");
    const label = format(d, "MMM", { locale: ro });
    const mTx = transactions.filter((t) => t.month === m && t.currency === selectedCurrency);
    return {
      name: label,
      venituri: mTx.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0),
      cheltuieli: mTx.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0),
    };
  });

  const recentTx = monthTx.slice(0, 5);

  // Expense breakdown by category
  const expensesByCategory = {};
  monthExpenses.forEach((tx) => {
    if (!expensesByCategory[tx.category_name]) {
      expensesByCategory[tx.category_name] = { amount: 0, count: 0 };
    }
    expensesByCategory[tx.category_name].amount += tx.amount || 0;
    expensesByCategory[tx.category_name].count += 1;
  });

  const expensePieData = Object.entries(expensesByCategory).map(([name, data]) => ({
    name,
    value: data.amount,
  }));

  const expenseTableData = Object.entries(expensesByCategory)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount);

  // Income breakdown by category
  const incomesByCategory = {};
  monthIncomes.forEach((tx) => {
    if (!incomesByCategory[tx.category_name]) {
      incomesByCategory[tx.category_name] = { amount: 0, count: 0 };
    }
    incomesByCategory[tx.category_name].amount += tx.amount || 0;
    incomesByCategory[tx.category_name].count += 1;
  });

  const incomePieData = Object.entries(incomesByCategory).map(([name, data]) => ({
    name,
    value: data.amount,
  }));

  const incomeTableData = Object.entries(incomesByCategory)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount);

  // Additional KPIs
  const avgExpense = monthExpenses.length > 0 ? totalExpense / monthExpenses.length : 0;
  const avgIncome = monthIncomes.length > 0 ? totalIncome / monthIncomes.length : 0;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight"
          >
            Panou de Control
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Sumar financiar</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-1 bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevCurrency}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-[#222636]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[70px] text-center text-sm font-bold text-emerald-400">
              {getCurrencySymbol(selectedCurrency)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextCurrency}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-[#222636]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Balanță Lunară"
          value={formatCurrency(balance) + " " + getCurrencySymbol(selectedCurrency)}
          icon={Wallet}
          color={balance >= 0 ? "emerald" : "red"}
          delay={0}
          trendLabel={`Rată economisire: ${savingsRate}%`}
        />
        <KpiCard
          title="Total Venituri"
          value={formatCurrency(totalIncome) + " " + getCurrencySymbol(selectedCurrency)}
          icon={TrendingUp}
          color="blue"
          delay={0.1}
          trendLabel={`${monthIncomes.length} tranzacții`}
        />
        <KpiCard
          title="Total Cheltuieli"
          value={formatCurrency(totalExpense) + " " + getCurrencySymbol(selectedCurrency)}
          icon={TrendingDown}
          color="red"
          delay={0.2}
          trendLabel={`${monthExpenses.length} tranzacții`}
        />
        <KpiCard
          title="Economii"
          value={formatCurrency(savings) + " " + getCurrencySymbol(selectedCurrency)}
          icon={PiggyBank}
          color="amber"
          delay={0.3}
          trendLabel={savings > 0 ? "Bilanț pozitiv" : "Deficit"}
        />
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">Cheltuială Medie</h3>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(avgExpense)} {getCurrencySymbol(selectedCurrency)}</p>
          <p className="text-xs text-slate-500 mt-1">per tranzacție</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">Venit Mediu</h3>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(avgIncome)} {getCurrencySymbol(selectedCurrency)}</p>
          <p className="text-xs text-slate-500 mt-1">per tranzacție</p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Evoluție Ultimele 6 Luni</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Venituri
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" /> Cheltuieli
            </span>
          </div>
        </div>
        <MonthlyChart data={chartData} />
      </motion.div>

      {/* Pie Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Distribuție Cheltuieli
          </h2>
          <ExpensesPieChart data={expensePieData} currency={getCurrencySymbol(selectedCurrency)} />
        </motion.div>

        {/* Incomes Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Distribuție Venituri
          </h2>
          <IncomesPieChart data={incomePieData} currency={getCurrencySymbol(selectedCurrency)} />
        </motion.div>
      </div>

      {/* Category Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <h2 className="text-lg font-bold mb-4">Detalii Cheltuieli pe Categorie</h2>
          <CategoryTable data={expenseTableData} type="expense" currency={getCurrencySymbol(selectedCurrency)} />
        </motion.div>

        {/* Incomes Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
        >
          <h2 className="text-lg font-bold mb-4">Detalii Venituri pe Categorie</h2>
          <CategoryTable data={incomeTableData} type="income" currency={getCurrencySymbol(selectedCurrency)} />
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
      >
        <h2 className="text-lg font-bold mb-4">Tranzacții Recente</h2>
        {recentTx.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Nu există tranzacții în această lună
          </div>
        ) : (
          <div className="space-y-2">
            {recentTx.map((tx, idx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0F1117] border border-[#2A2E3D]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                    tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {tx.type === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.category_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(tx.date), "d MMM", { locale: ro })}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.type === "income" ? "text-emerald-400" : "text-red-400"
                }`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)} {getCurrencySymbol(selectedCurrency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}