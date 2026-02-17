import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import MonthSelector from "../components/finance/MonthSelector";
import TransactionForm from "../components/finance/TransactionForm";
import TransactionList from "../components/finance/TransactionList";
import KpiCard from "../components/finance/KpiCard";

const getCurrencySymbol = (curr) => {
  const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
  return symbols[curr] || curr;
};

const currencyColors = {
  'RON': 'red',
  'EUR': 'blue',
  'USD': 'amber',
  'GBP': 'purple'
};

// Helper: get current month in Romania timezone
const getRomaniaMonth = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);
};

export default function Expenses() {
  const [currentMonth, setCurrentMonth] = useState(getRomaniaMonth());
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.BudgetCategory.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.Transaction.list("-date"),
  });

  // Auto-generate recurring transactions when month changes
  useEffect(() => {
    const generateRecurring = async () => {
      try {
        await api.Transaction.generateRecurring(currentMonth);
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      } catch (error) {
        // Silently ignore if no recurring to generate
        console.log('Recurring generation:', error?.response?.data?.message || 'done');
      }
    };
    generateRecurring();
  }, [currentMonth, queryClient]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('transaction_') || message.type.startsWith('category_')) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => api.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const expenseCategories = categories.filter((c) => c.type === "expense" && c.is_active !== false);
  const monthExpenses = transactions.filter((t) => t.type === "expense" && !t.is_meal_voucher && t.month === currentMonth);

  // Group totals by currency - only currencies that have transactions
  const totalsByCurrency = {};
  monthExpenses.forEach((t) => {
    const curr = t.currency || 'RON';
    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + (t.amount || 0);
  });
  const activeCurrencies = Object.keys(totalsByCurrency);
  const totalExpense = monthExpenses.reduce((s, t) => s + (t.amount || 0), 0);

  // Top spending categories (grouped by currency)
  const categoryTotals = {};
  monthExpenses.forEach((t) => {
    const curr = t.currency || 'RON';
    const key = `${t.category_name}|${curr}`;
    if (!categoryTotals[key]) categoryTotals[key] = { name: t.category_name, currency: curr, amount: 0 };
    categoryTotals[key].amount += (t.amount || 0);
  });
  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight"
          >
            Cheltuieli
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Gestionează cheltuielile lunare</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
          <Button
            onClick={() => setShowForm(true)}
            className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium h-10 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Adaugă Cheltuială</span>
            <span className="sm:hidden">Adaugă</span>
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${activeCurrencies.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : activeCurrencies.length === 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {activeCurrencies.map((curr, idx) => (
          <KpiCard
            key={curr}
            title={`Total Cheltuieli ${getCurrencySymbol(curr)}`}
            value={formatCurrency(totalsByCurrency[curr]) + " " + getCurrencySymbol(curr)}
            icon={TrendingDown}
            color={currencyColors[curr] || 'red'}
            delay={idx * 0.05}
          />
        ))}
        <KpiCard
          title="Nr. Tranzacții"
          value={monthExpenses.length.toString()}
          icon={TrendingDown}
          color="amber"
          delay={activeCurrencies.length * 0.05}
        />
      </div>

      {/* Top categories breakdown */}
      {topCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-3 sm:p-6"
        >
          <h2 className="text-base sm:text-lg font-bold mb-4">Top Categorii</h2>
          <div className="space-y-3">
            {topCategories.map((cat) => {
              const totalForCurr = totalsByCurrency[cat.currency] || 1;
              const pct = totalForCurr > 0 ? (cat.amount / totalForCurr) * 100 : 0;
              return (
                <div key={`${cat.name}-${cat.currency}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300">{cat.name}</span>
                    <span className="text-sm font-medium text-red-400">{formatCurrency(cat.amount)} {getCurrencySymbol(cat.currency)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0F1117] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-3 sm:p-6"
      >
        <h2 className="text-base sm:text-lg font-bold mb-4">Lista Cheltuieli</h2>
        <TransactionList
          transactions={monthExpenses}
          type="expense"
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </motion.div>

      <TransactionForm
        open={showForm}
        onOpenChange={setShowForm}
        type="expense"
        categories={expenseCategories}
        currentMonth={currentMonth}
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}