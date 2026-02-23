import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#10B981", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B"];

const CustomTooltip = ({ active, payload, currency, total }) => {
  if (active && payload && payload.length) {
    const percent = total > 0 ? (payload[0].value / total) * 100 : 0;
    return (
      <div className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-3 shadow-2xl">
        <p className="text-sm font-medium text-white">{payload[0].name}</p>
        <p className="text-sm text-emerald-400 mt-1">
          {formatCurrency(payload[0].value)} {currency}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {percent.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function IncomesPieChart({ data, currency = 'RON' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Nu există venituri pentru această lună
      </div>
    );
  }

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

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
        <Tooltip content={<CustomTooltip currency={currency} total={total} />} />
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