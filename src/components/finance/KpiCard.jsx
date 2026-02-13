import React from "react";
import { motion } from "framer-motion";

export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, color = "emerald", delay = 0 }) {
  const colorMap = {
    emerald: {
      bg: "from-emerald-500/10 to-emerald-500/5",
      border: "border-emerald-500/20",
      icon: "bg-emerald-500/15 text-emerald-400",
      shadow: "shadow-emerald-500/5",
      value: "text-emerald-400"
    },
    blue: {
      bg: "from-blue-500/10 to-blue-500/5",
      border: "border-blue-500/20",
      icon: "bg-blue-500/15 text-blue-400",
      shadow: "shadow-blue-500/5",
      value: "text-blue-400"
    },
    red: {
      bg: "from-red-500/10 to-red-500/5",
      border: "border-red-500/20",
      icon: "bg-red-500/15 text-red-400",
      shadow: "shadow-red-500/5",
      value: "text-red-400"
    },
    amber: {
      bg: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-500/20",
      icon: "bg-amber-500/15 text-amber-400",
      shadow: "shadow-amber-500/5",
      value: "text-amber-400"
    }
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} p-4 sm:p-6 shadow-xl ${c.shadow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${c.value}`}>{value}</p>
          {trendLabel && (
            <p className="text-xs text-slate-500 mt-2">{trendLabel}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {/* Decorative element */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/[0.02]" />
    </motion.div>
  );
}