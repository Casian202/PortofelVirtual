import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { ro } from "date-fns/locale";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Calendar, PiggyBank, DollarSign, ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import KpiCard from "../components/finance/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from "recharts";

export default function WalletPage() {
  const [selectedCurrency, setSelectedCurrency] = useState('RON');
  
  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };

  const getCurrencyIcon = (curr) => {
    if (curr === 'RON') return Coins;
    return DollarSign;
  };

  const { data: walletData } = useQuery({
    queryKey: ["wallet", selectedCurrency],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/wallet/summary?currency=${selectedCurrency}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch wallet data");
      return response.json();
    },
  });

  const { data: balanceData } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/wallet/balance", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch balance data");
      return response.json();
    },
  });

  const monthlyData = walletData?.monthly_data || [];
  const totalCumulative = walletData?.total_cumulative || 0;
  const balances = balanceData?.balances || {};
  const totalInRon = balanceData?.total_in_ron || 0;
  const currentBalance = balances[selectedCurrency] || 0;

  // Only show currencies that have a non-zero balance
  const ownedCurrencies = Object.keys(balances).filter(c => balances[c] !== 0 && balances[c] !== undefined);
  // Ensure selectedCurrency is valid - if user has no activity in selected currency, auto-switch
  const ownedIndex = ownedCurrencies.indexOf(selectedCurrency);
  const prevCurrencyOwned = () => {
    if (ownedCurrencies.length <= 1) return;
    const idx = ownedCurrencies.indexOf(selectedCurrency);
    setSelectedCurrency(ownedCurrencies[(idx - 1 + ownedCurrencies.length) % ownedCurrencies.length]);
  };
  const nextCurrencyOwned = () => {
    if (ownedCurrencies.length <= 1) return;
    const idx = ownedCurrencies.indexOf(selectedCurrency);
    setSelectedCurrency(ownedCurrencies[(idx + 1) % ownedCurrencies.length]);
  };

  // Prepare chart data
  const chartData = monthlyData.map(item => {
    const date = parse(item.month, "yyyy-MM", new Date());
    return {
      month: format(date, "MMM yyyy", { locale: ro }),
      venituri: item.total_income,
      cheltuieli: item.total_expense,
      balanta: item.balance,
      cumulativ: item.cumulative_savings
    };
  });

  // Calculate statistics
  const positiveMonths = monthlyData.filter(m => m.balance > 0).length;
  const negativeMonths = monthlyData.filter(m => m.balance < 0).length;
  const avgMonthlySavings = monthlyData.length > 0 
    ? monthlyData.reduce((sum, m) => sum + m.balance, 0) / monthlyData.length 
    : 0;

  const lastMonthSavings = monthlyData.length > 0 
    ? monthlyData[monthlyData.length - 1].cumulative_savings 
    : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-3 shadow-2xl">
          <p className="text-xs text-slate-400 mb-2">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)} {getCurrencySymbol(selectedCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <Wallet className="w-7 h-7 text-emerald-400" />
            Portofel
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Economii și solduri disponibile</p>
        </div>
      </div>

      {/* Available Balance KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KpiCard
          title="Total Disponibil (RON echivalent)"
          value={formatCurrency(totalInRon) + " RON"}
          icon={Wallet}
          color="emerald"
          delay={0}
          trendLabel="Toate valutele"
        />
        <KpiCard
          title={`Sold Curent ${getCurrencySymbol(selectedCurrency)}`}
          value={formatCurrency(currentBalance) + " " + getCurrencySymbol(selectedCurrency)}
          icon={getCurrencyIcon(selectedCurrency)}
          color={currentBalance >= 0 ? "blue" : "red"}
          delay={0.1}
          trendLabel="Disponibil acum"
        />
      </div>

      {/* Currency Wallet Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold mb-4">Portofel Valută</h2>
        <div className={`grid gap-4 ${ownedCurrencies.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : ownedCurrencies.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {ownedCurrencies.map((curr, idx) => {
            const balance = balances[curr] || 0;
            return (
              <Card key={curr} className="bg-[#1A1D29] border-[#2A2E3D]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Sold {getCurrencySymbol(curr)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-2xl font-bold ${
                      balance >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {formatCurrency(balance)}
                    </span>
                    <span className="text-xl text-slate-500">{getCurrencySymbol(curr)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Currency Selector for Cumulative View */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Evoluție Economii Cumulative</h2>
        <div className="flex items-center gap-1 bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-2 py-1 w-fit">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevCurrencyOwned}
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
            onClick={nextCurrencyOwned}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-[#222636]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cumulative Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Evoluție Economii Cumulative</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" /> Cumulativ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Balanță Lunară
            </span>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3D" />
              <XAxis 
                dataKey="month" 
                stroke="#94A3B8" 
                style={{ fontSize: "12px" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94A3B8" style={{ fontSize: "12px" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="balanta" fill="#10B981" name="Balanță" radius={[4, 4, 0, 0]} />
              <Line 
                type="monotone" 
                dataKey="cumulativ" 
                stroke="#F59E0B" 
                strokeWidth={3}
                name="Cumulativ"
                dot={{ fill: "#F59E0B", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
            Nu există date disponibile
          </div>
        )}
      </motion.div>

      {/* Monthly Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
      >
        <h2 className="text-lg font-bold mb-4">Detalii pe Luni</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2E3D]">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Luna</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Venituri</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cheltuieli</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Balanță</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cumulativ</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((item, idx) => {
                const date = parse(item.month, "yyyy-MM", new Date());
                const monthLabel = format(date, "MMMM yyyy", { locale: ro });
                return (
                  <tr key={idx} className="border-b border-[#2A2E3D]/50 hover:bg-[#0F1117]/50">
                    <td className="py-3 px-4 font-medium capitalize">{monthLabel}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      {formatCurrency(item.total_income)} {getCurrencySymbol(selectedCurrency)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-400">
                      {formatCurrency(item.total_expense)} {getCurrencySymbol(selectedCurrency)}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      item.balance >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {item.balance >= 0 ? "+" : ""}{formatCurrency(item.balance)} {getCurrencySymbol(selectedCurrency)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      item.cumulative_savings >= 0 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {formatCurrency(item.cumulative_savings)} {getCurrencySymbol(selectedCurrency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {monthlyData.length > 0 && (
              <tfoot>
                <tr className="bg-[#0F1117] border-t-2 border-[#2A2E3D]">
                  <td className="py-3 px-4 font-bold">TOTAL</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.total_income, 0))} {getCurrencySymbol(selectedCurrency)}
                  </td>
                  <td className="py-3 px-4 text-right text-red-400 font-bold">
                    {formatCurrency(monthlyData.reduce((sum, m) => sum + m.total_expense, 0))} {getCurrencySymbol(selectedCurrency)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    totalCumulative >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {totalCumulative >= 0 ? "+" : ""}{formatCurrency(totalCumulative)} {getCurrencySymbol(selectedCurrency)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold text-lg ${
                    totalCumulative >= 0 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {formatCurrency(totalCumulative)} {getCurrencySymbol(selectedCurrency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>
    </div>
  );
}
