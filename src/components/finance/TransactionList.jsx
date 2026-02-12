import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

export default function TransactionList({ transactions, type, onDelete }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-slate-500 text-sm">
          Nu există {type === "income" ? "venituri" : "cheltuieli"} în această lună
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {transactions.map((tx, idx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="group flex items-center justify-between p-4 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] hover:border-[#3A3E4D] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}>
                {tx.category_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium text-sm text-slate-200">{tx.category_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {format(new Date(tx.date), "d MMM yyyy", { locale: ro })}
                  </span>
                  {tx.description && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">{tx.description}</span>
                    </>
                  )}
                  {tx.is_recurring && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                        <RefreshCw className="w-3 h-3" />
                        Recurentă{tx.recurring_day ? ` (ziua ${tx.recurring_day})` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-bold text-sm ${
                type === "income" ? "text-emerald-400" : "text-red-400"
              }`}>
                {type === "income" ? "+" : "-"}{formatCurrency(tx.amount)} {tx.currency || 'RON'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(tx.id)}
                className="h-8 w-8 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}