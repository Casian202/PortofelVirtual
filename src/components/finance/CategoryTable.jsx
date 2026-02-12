import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CategoryTable({ data, type = "expense" }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Nu există date pentru această lună
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-xl border border-[#2A2E3D] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#0F1117] border-b border-[#2A2E3D] hover:bg-[#0F1117]">
            <TableHead className="text-slate-400 font-medium">Categorie</TableHead>
            <TableHead className="text-slate-400 font-medium text-right">Sumă</TableHead>
            <TableHead className="text-slate-400 font-medium text-right">%</TableHead>
            <TableHead className="text-slate-400 font-medium text-right">Tranzacții</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => {
            const percent = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
            return (
              <TableRow key={idx} className="border-b border-[#2A2E3D] hover:bg-[#0F1117]/50">
                <TableCell className="font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    type === "income" ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                  {item.category}
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  type === "income" ? "text-emerald-400" : "text-red-400"
                }`}>
                  {formatCurrency(item.amount)} RON
                </TableCell>
                <TableCell className="text-right text-slate-400">
                  {percent}%
                </TableCell>
                <TableCell className="text-right text-slate-400">
                  {item.count}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-[#0F1117] border-t-2 border-[#2A2E3D] hover:bg-[#0F1117]">
            <TableCell className="font-bold">TOTAL</TableCell>
            <TableCell className={`text-right font-bold text-lg ${
              type === "income" ? "text-emerald-400" : "text-red-400"
            }`}>
              {formatCurrency(total)} RON
            </TableCell>
            <TableCell className="text-right font-bold">100%</TableCell>
            <TableCell className="text-right font-bold text-slate-400">
              {data.reduce((sum, item) => sum + item.count, 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}