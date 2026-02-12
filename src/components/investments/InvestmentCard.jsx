import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

const typeIcons = {
  stocks: "📈",
  crypto: "₿",
  real_estate: "🏠",
  bonds: "📜",
  mutual_funds: "💼",
  other: "💰"
};

export default function InvestmentCard({ investment, onEdit, onDelete, delay = 0, displayCurrency, convertAmount, getCurrencySymbol }) {
  const profit = (investment.current_value || 0) - (investment.initial_amount || 0);
  const profitPercent = investment.initial_amount > 0 
    ? ((profit / investment.initial_amount) * 100).toFixed(2) 
    : 0;
  const isPositive = profit >= 0;

  const conv = convertAmount || ((v) => v);
  const sym = getCurrencySymbol ? getCurrencySymbol(displayCurrency || 'RON') : 'RON';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6 hover:border-[#3A3E4D] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0F1117] flex items-center justify-center text-2xl">
            {typeIcons[investment.type] || "💰"}
          </div>
          <div>
            <h3 className="font-bold text-lg">{investment.name}</h3>
            <p className="text-xs text-slate-500 capitalize">
              {investment.type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(investment)}
            className="h-8 w-8 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(investment.id)}
            className="h-8 w-8 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Investiție inițială</span>
          <span className="font-semibold text-slate-300">
            {formatCurrency(conv(investment.initial_amount))} {sym}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Valoare curentă</span>
          <span className="font-semibold text-white">
            {formatCurrency(conv(investment.current_value))} {sym}
          </span>
        </div>
        <div className="pt-3 border-t border-[#2A2E3D]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Profit/Pierdere</span>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{formatCurrency(conv(profit))} {sym}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-slate-400">Randament</span>
            <span className={`font-bold text-lg ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{profitPercent}%
            </span>
          </div>
        </div>
        <div className="pt-2 text-xs text-slate-500">
          Cumpărat: {format(new Date(investment.purchase_date), "d MMM yyyy", { locale: ro })}
        </div>
      </div>
    </motion.div>
  );
}