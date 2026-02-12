import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, PieChart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import KpiCard from "../components/finance/KpiCard";
import InvestmentCard from "../components/investments/InvestmentCard";
import InvestmentForm from "../components/investments/InvestmentForm";

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState('RON');
  const queryClient = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ["investments"],
    queryFn: () => api.Investment.list("-purchase_date"),
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

  // Convert amount from RON to display currency
  const convertAmount = (amount) => {
    if (!amount) return 0;
    if (displayCurrency === 'RON') return amount;
    if (ratesMap[displayCurrency]) return amount / ratesMap[displayCurrency];
    return amount;
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('investment_')) {
        queryClient.invalidateQueries({ queryKey: ["investments"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => api.Investment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setShowForm(false);
      setEditingInvestment(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.Investment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setShowForm(false);
      setEditingInvestment(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.Investment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments"] }),
  });

  const handleSubmit = (data) => {
    if (editingInvestment) {
      updateMutation.mutate({ id: editingInvestment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (investment) => {
    setEditingInvestment(investment);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInvestment(null);
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.initial_amount || 0), 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  const totalProfit = totalCurrentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <PieChart className="w-7 h-7 text-emerald-400" />
            Investiții
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Gestionează portofoliul tău</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium h-10 px-5"
        >
          <Plus className="w-4 h-4 mr-2" />
          Investiție Nouă
        </Button>
      </div>

      {/* Currency Selector */}
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
          title="Total Investit"
          value={formatCurrency(convertAmount(totalInvested)) + " " + getCurrencySymbol(displayCurrency)}
          icon={TrendingDown}
          color="blue"
        />
        <KpiCard
          title="Valoare Curentă"
          value={formatCurrency(convertAmount(totalCurrentValue)) + " " + getCurrencySymbol(displayCurrency)}
          icon={PieChart}
          color="emerald"
          delay={0.1}
        />
        <KpiCard
          title="Profit/Pierdere"
          value={formatCurrency(convertAmount(totalProfit)) + " " + getCurrencySymbol(displayCurrency)}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          color={totalProfit >= 0 ? "emerald" : "red"}
          delay={0.2}
          trendLabel={`${totalProfit >= 0 ? "+" : ""}${formatCurrency(convertAmount(totalProfit))} ${getCurrencySymbol(displayCurrency)}`}
        />
        <KpiCard
          title="Randament Total"
          value={`${profitPercent >= 0 ? "+" : ""}${profitPercent}%`}
          icon={profitPercent >= 0 ? TrendingUp : TrendingDown}
          color={profitPercent >= 0 ? "emerald" : "red"}
          delay={0.3}
        />
      </div>

      {investments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
            <PieChart className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">Nu ai investiții încă</h3>
          <p className="text-slate-500 text-sm mb-6">
            Începe să îți construiești portofoliul adăugând prima investiție
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Prima Investiție
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map((inv, idx) => (
            <InvestmentCard
              key={inv.id}
              investment={inv}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              delay={idx * 0.05}
              displayCurrency={displayCurrency}
              convertAmount={convertAmount}
              getCurrencySymbol={getCurrencySymbol}
            />
          ))}
        </div>
      )}

      <InvestmentForm
        open={showForm}
        onOpenChange={handleCloseForm}
        investment={editingInvestment}
        onSubmit={handleSubmit}
      />
    </div>
  );
}