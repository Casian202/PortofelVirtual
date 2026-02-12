import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { ro } from "date-fns/locale";

export default function MonthSelector({ currentMonth, onChange }) {
  const date = new Date(currentMonth + "-01");

  const goBack = () => {
    const prev = subMonths(date, 1);
    onChange(format(prev, "yyyy-MM"));
  };

  const goForward = () => {
    const next = addMonths(date, 1);
    onChange(format(next, "yyyy-MM"));
  };

  const goToday = () => {
    onChange(format(new Date(), "yyyy-MM"));
  };

  const monthLabel = format(date, "MMMM yyyy", { locale: ro });

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={goBack}
        className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#222636]"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <button
        onClick={goToday}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] hover:border-emerald-500/30 transition-colors text-sm font-medium capitalize"
      >
        <Calendar className="w-4 h-4 text-emerald-400" />
        {monthLabel}
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={goForward}
        className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#222636]"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}