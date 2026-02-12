import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import KpiCard from "../components/finance/KpiCard";
import GoalCard from "../components/goals/GoalCard";
import GoalForm from "../components/goals/GoalForm";
import AddAmountDialog from "../components/goals/AddAmountDialog";

export default function Goals() {
  const [showForm, setShowForm] = useState(false);
  const [showAddAmount, setShowAddAmount] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('RON');
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.SavingsGoal.list("-created_date"),
  });

  const { data: exchangeRates = [] } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const response = await fetch("/api/exchange-rates", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch exchange rates");
      return response.json();
    },
  });

  const currencies = ['RON', 'EUR', 'USD', 'GBP'];
  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };
  const currencyIndex = currencies.indexOf(displayCurrency);
  const prevCurrency = () => setDisplayCurrency(currencies[(currencyIndex - 1 + currencies.length) % currencies.length]);
  const nextCurrency = () => setDisplayCurrency(currencies[(currencyIndex + 1) % currencies.length]);

  // Create rate map
  const ratesMap = {};
  exchangeRates.forEach(r => ratesMap[r.currency] = parseFloat(r.rate));

  // Convert amount to display currency
  const convertAmount = (amount, fromCurrency) => {
    if (!amount) return 0;
    if (fromCurrency === displayCurrency) return amount;
    
    // Convert to RON first if needed
    let amountInRon = amount;
    if (fromCurrency !== 'RON' && ratesMap[fromCurrency]) {
      amountInRon = amount * ratesMap[fromCurrency];
    }
    
    // Then convert from RON to display currency if needed
    if (displayCurrency !== 'RON' && ratesMap[displayCurrency]) {
      return amountInRon / ratesMap[displayCurrency];
    }
    
    return amountInRon;
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('goal_')) {
        queryClient.invalidateQueries({ queryKey: ["goals"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => api.SavingsGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setShowForm(false);
      setEditingGoal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.SavingsGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setShowForm(false);
      setEditingGoal(null);
      setShowAddAmount(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.SavingsGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleAddAmount = (goal) => {
    setSelectedGoal(goal);
    setShowAddAmount(true);
  };

  const handleAddAmountSubmit = (amount) => {
    if (!selectedGoal) return;
    const newAmount = (selectedGoal.current_amount || 0) + amount;
    const isCompleted = newAmount >= selectedGoal.target_amount;
    updateMutation.mutate({
      id: selectedGoal.id,
      data: { ...selectedGoal, current_amount: newAmount, is_completed: isCompleted }
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  const totalTarget = goals.reduce((sum, g) => 
    sum + convertAmount(g.target_amount || 0, g.currency || 'RON'), 0);
  const totalSaved = goals.reduce((sum, g) => 
    sum + convertAmount(g.current_amount || 0, g.currency || 'RON'), 0);
  const totalRemaining = totalTarget - totalSaved;
  const overallProgress = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;
  const completedGoals = goals.filter(g => g.is_completed || (g.current_amount >= g.target_amount)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <Target className="w-7 h-7 text-emerald-400" />
            Obiective Financiare
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Planifică și urmărește-ți obiectivele</p>
        </div>
        <div className="flex gap-3 items-center">
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium h-10 px-5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Obiectiv Nou
          </Button>
        </div>
      </div>

      {/* Currency Converter */}
      <div className="flex flex-col gap-2 bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm text-slate-400">Afișare valută:</span>
          <div className="flex items-center gap-1 bg-[#0F1117] border border-[#2A2E3D] rounded-xl px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevCurrency}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-[#222636]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[70px] text-center text-sm font-bold text-emerald-400">
              {getCurrencySymbol(displayCurrency)}
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
        </div>
        {displayCurrency !== 'RON' && ratesMap[displayCurrency] && (
          <p className="text-xs text-slate-500">
            Curs: 1 {displayCurrency} = {ratesMap[displayCurrency].toFixed(4)} RON
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Țintă"
          value={formatCurrency(totalTarget) + " " + getCurrencySymbol(displayCurrency)}
          icon={Target}
          color="blue"
        />
        <KpiCard
          title="Total Economisit"
          value={formatCurrency(totalSaved) + " " + getCurrencySymbol(displayCurrency)}
          icon={TrendingUp}
          color="emerald"
          delay={0.1}
        />
        <KpiCard
          title="Progres General"
          value={`${overallProgress}%`}
          icon={TrendingUp}
          color="amber"
          delay={0.2}
          trendLabel={`${goals.length} obiective active`}
        />
        <KpiCard
          title="Obiective Finalizate"
          value={completedGoals.toString()}
          icon={Target}
          color="emerald"
          delay={0.3}
          trendLabel={`din ${goals.length} total`}
        />
      </div>

      {goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
            <Target className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">Nu ai obiective încă</h3>
          <p className="text-slate-500 text-sm mb-6">
            Începe să îți planifici viitorul adăugând primul obiectiv financiar
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Primul Obiectiv
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal, idx) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              onAddAmount={handleAddAmount}
              delay={idx * 0.05}
              displayCurrency={displayCurrency}
              convertAmount={convertAmount}
              getCurrencySymbol={getCurrencySymbol}
            />
          ))}
        </div>
      )}

      <GoalForm
        open={showForm}
        onOpenChange={handleCloseForm}
        goal={editingGoal}
        onSubmit={handleSubmit}
      />

      <AddAmountDialog
        open={showAddAmount}
        onOpenChange={setShowAddAmount}
        goal={selectedGoal}
        onSubmit={handleAddAmountSubmit}
      />
    </div>
  );
}