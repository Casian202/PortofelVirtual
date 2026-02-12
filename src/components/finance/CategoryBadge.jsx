import React from "react";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CategoryBadge({ category, onDelete, onEdit }) {
  const isIncome = category.type === "income";

  return (
    <div className="group flex items-center justify-between p-4 rounded-xl bg-[#0F1117] border border-[#2A2E3D] hover:border-[#3A3E4D] transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
          isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}>
          {category.icon || category.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm text-slate-200">{category.name}</p>
          <p className={`text-xs ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
            {isIncome ? "Venit" : "Cheltuială"}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="h-8 w-8 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category.id)}
          className="h-8 w-8 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}