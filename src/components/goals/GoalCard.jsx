import React from "react";
import { motion } from "framer-motion";
import { Edit, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

export default function GoalCard({ goal, onEdit, onDelete, onAddAmount, delay = 0, displayCurrency, convertAmount, getCurrencySymbol }) {
  const progress = goal.target_amount > 0 
    ? ((goal.current_amount || 0) / goal.target_amount) * 100 
    : 0;
  const remaining = goal.target_amount - (goal.current_amount || 0);
  const isCompleted = progress >= 100;

  const goalCurrency = goal.currency || 'RON';
  // If convertAmount is provided, convert to display currency; otherwise show goal's own currency
  const showCurrency = displayCurrency && getCurrencySymbol ? getCurrencySymbol(displayCurrency) : (getCurrencySymbol ? getCurrencySymbol(goalCurrency) : goalCurrency);
  const displayTarget = convertAmount ? convertAmount(goal.target_amount, goalCurrency) : goal.target_amount;
  const displayCurrent = convertAmount ? convertAmount(goal.current_amount || 0, goalCurrency) : (goal.current_amount || 0);
  const displayRemaining = convertAmount ? convertAmount(remaining, goalCurrency) : remaining;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`group relative rounded-2xl border p-6 transition-all ${
        isCompleted 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-[#1A1D29] border-[#2A2E3D] hover:border-[#3A3E4D]"
      }`}
    >
      {isCompleted && (
        <div className="absolute top-4 right-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#0F1117] flex items-center justify-center text-2xl">
          {goal.icon || "🎯"}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{goal.name}</h3>
          {goal.deadline && (
            <p className="text-xs text-slate-500">
              Termen: {format(new Date(goal.deadline), "d MMM yyyy", { locale: ro })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Progres</span>
          <span className="font-bold text-emerald-400">{progress.toFixed(1)}%</span>
        </div>
        
        <div className="h-3 rounded-full bg-[#0F1117] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isCompleted 
                ? "bg-gradient-to-r from-emerald-500 to-green-400" 
                : "bg-gradient-to-r from-blue-500 to-emerald-500"
            }`}
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <div>
            <p className="text-xs text-slate-500">Economisit</p>
            <p className="font-semibold text-white">
              {formatCurrency(displayCurrent)} {showCurrency}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Țintă</p>
            <p className="font-semibold text-emerald-400">
              {formatCurrency(displayTarget)} {showCurrency}
            </p>
          </div>
        </div>

        {!isCompleted && remaining > 0 && (
          <div className="pt-2 border-t border-[#2A2E3D]">
            <p className="text-xs text-slate-500">Mai lipsesc</p>
            <p className="font-bold text-amber-400">
              {formatCurrency(displayRemaining)} {showCurrency}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isCompleted && (
          <Button
            onClick={() => onAddAmount(goal)}
            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl h-9"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Bani
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(goal)}
          className="h-9 w-9 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(goal.id)}
          className="h-9 w-9 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}