import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#EF4444", "#F59E0B", "#F97316", "#EC4899", "#8B5CF6", "#6366F1", "#3B82F6", "#06B6D4", "#10B981", "#84CC16"];

const CustomTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-3 shadow-2xl">
        <p className="text-sm font-medium text-white">{payload[0].name}</p>
        <p className="text-sm text-red-400 mt-1">
          {formatCurrency(payload[0].value)} {currency}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {(payload[0].percent * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function ExpensesPieChart({ data, currency = 'RON' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Nu există cheltuieli pentru această lună
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: "12px", color: "#94A3B8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}