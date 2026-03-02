import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

import MonthSelector from "../components/finance/MonthSelector";
import TransactionForm from "../components/finance/TransactionForm";
import TransactionList from "../components/finance/TransactionList";
import KpiCard from "../components/finance/KpiCard";

const getCurrencySymbol = (curr) => {
  const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
  return symbols[curr] || curr;
};

const currencyColors = {
  'RON': 'emerald',
  'EUR': 'blue',
  'USD': 'amber',
  'GBP': 'purple'
};

// Helper: get current month in Romania timezone
const getRomaniaMonth = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);
};

export default function Incomes() {
  const [currentMonth, setCurrentMonth] = useState(getRomaniaMonth());
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.BudgetCategory.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.Transaction.list("-date"),
  });

  // Auto-generate recurring transactions when month changes (only once per month)
  useEffect(() => {
    const key = `recurring_generated_${currentMonth}`;
    if (localStorage.getItem(key)) return;

    const generateRecurring = async () => {
      try {
        const result = await api.Transaction.generateRecurring(currentMonth);
        if (result.created > 0) {
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
        localStorage.setItem(key, 'true');
      } catch (error) {
        // Set flag even on error to avoid retrying endlessly
        localStorage.setItem(key, 'true');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // If a recurring transaction was created, clear the generation flag so it can be picked up
      toast({ title: "Venit adăugat", description: "Tranzacția a fost salvată cu succes." });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: error?.response?.data?.error || "Nu s-a putut adăuga venitul.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setEditingTransaction(null);
      toast({ title: "Venit actualizat", description: "Tranzacția a fost actualizată cu succes." });
    },
    onError: (error) => {
      toast({ title: "Eroare", description: error?.response?.data?.error || "Nu s-a putut actualiza venitul.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.Transaction.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(["transactions"]);
      // Optimistically remove the transaction from the list
      queryClient.setQueryData(["transactions"], (old) =>
        old ? old.filter((t) => t.id !== id) : []
      );
      return { previousTransactions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Venit șters", description: "Tranzacția a fost ștearsă cu succes." });
    },
    onError: (error, _id, context) => {
      // Rollback to previous data on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(["transactions"], context.previousTransactions);
      }
      toast({ title: "Eroare la ștergere", description: error?.response?.data?.error || "Nu s-a putut șterge venitul. Încearcă din nou.", variant: "destructive" });
    },
  });

  const incomeCategories = categories.filter((c) => c.type === "income" && c.is_active !== false);
  const allMonthIncomes = transactions.filter((t) => t.type === "income" && !t.is_meal_voucher && t.month === currentMonth);

  // Get unique currencies used in this month's incomes
  const usedCurrencies = useMemo(() => {
    const currencies = new Set(allMonthIncomes.map(t => t.currency || 'RON'));
    return Array.from(currencies);
  }, [allMonthIncomes]);

  // Filter incomes based on search and filters
  const monthIncomes = useMemo(() => {
    return allMonthIncomes.filter(t => {
      const matchesSearch = !searchQuery || 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || t.category_id === parseInt(filterCategory);
      const matchesCurrency = filterCurrency === "all" || (t.currency || 'RON') === filterCurrency;
      return matchesSearch && matchesCategory && matchesCurrency;
    });
  }, [allMonthIncomes, searchQuery, filterCategory, filterCurrency]);

  // Group totals by currency - only currencies that have transactions
  const totalsByCurrency = {};
  monthIncomes.forEach((t) => {
    const curr = t.currency || 'RON';
    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + (t.amount || 0);
  });
  const activeCurrencies = Object.keys(totalsByCurrency);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight"
          >
            Venituri
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Gestionează veniturile lunare</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
          <Button
            onClick={() => setShowForm(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium h-10 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Venit
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${activeCurrencies.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : activeCurrencies.length === 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {activeCurrencies.map((curr, idx) => (
          <KpiCard
            key={curr}
            title={`Total Venituri ${getCurrencySymbol(curr)}`}
            value={formatCurrency(totalsByCurrency[curr]) + " " + getCurrencySymbol(curr)}
            icon={TrendingUp}
            color={currencyColors[curr] || 'emerald'}
            delay={idx * 0.05}
          />
        ))}
        <KpiCard
          title="Nr. Tranzacții"
          value={monthIncomes.length.toString()}
          icon={TrendingUp}
          color="blue"
          delay={activeCurrencies.length * 0.05}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-3 sm:p-6"
      >
        <div className="flex flex-col gap-4 mb-4">
          <h2 className="text-base sm:text-lg font-bold">Lista Venituri</h2>
          
          {/* Search and Filters - responsive grid for mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Caută..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full h-10 sm:h-9 bg-[#0F1117] border-[#2A2E3D] text-sm rounded-xl"
              />
            </div>
            
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 sm:h-9 px-3 rounded-xl bg-[#0F1117] border border-[#2A2E3D] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Toate categoriile</option>
              {incomeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            {/* Currency Filter */}
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="h-10 sm:h-9 px-3 rounded-xl bg-[#0F1117] border border-[#2A2E3D] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Toate valutele</option>
              {usedCurrencies.map(curr => (
                <option key={curr} value={curr}>{getCurrencySymbol(curr)}</option>
              ))}
            </select>
          </div>
        </div>
        
        <TransactionList
          transactions={monthIncomes}
          type="income"
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={(tx) => {
            setEditingTransaction(tx);
            setShowForm(true);
          }}
        />
      </motion.div>

      <TransactionForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTransaction(null);
        }}
        type="income"
        categories={incomeCategories}
        currentMonth={currentMonth}
        editingTransaction={editingTransaction}
        onSubmit={(data) => {
          if (editingTransaction) {
            updateMutation.mutate({ id: editingTransaction.id, data });
          } else {
            createMutation.mutate(data);
            // Clear recurring generation flag if creating a recurring transaction
            if (data.is_recurring) {
              // Clear all recurring flags so new recurring gets generated in other months
              Object.keys(localStorage).forEach(k => {
                if (k.startsWith('recurring_generated_')) localStorage.removeItem(k);
              });
            }
          }
        }}
      />
    </div>
  );
}