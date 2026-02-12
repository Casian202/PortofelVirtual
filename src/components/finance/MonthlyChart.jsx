import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)} RON
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Nu există date pentru grafic
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3D" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748B", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748B", fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="venituri" fill="#10B981" radius={[6, 6, 0, 0]} name="Venituri" />
        <Bar dataKey="cheltuieli" fill="#EF4444" radius={[6, 6, 0, 0]} name="Cheltuieli" />
      </BarChart>
    </ResponsiveContainer>
  );
}