import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AddAmountDialog({ open, onOpenChange, goal, onSubmit }) {
  const [amount, setAmount] = useState("");

  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onSubmit(parseFloat(amount));
    setAmount("");
  };

  const remaining = goal ? goal.target_amount - (goal.current_amount || 0) : 0;
  const goalCurrency = goal?.currency || 'RON';
  const sym = getCurrencySymbol(goalCurrency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Adaugă Bani la Obiectiv</DialogTitle>
        </DialogHeader>

        {goal && (
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-[#0F1117]">
              <div className="text-3xl">{goal.icon || "🎯"}</div>
              <div>
                <p className="font-semibold">{goal.name}</p>
                <p className="text-xs text-slate-500">
                  Mai lipsesc: {formatCurrency(remaining)} {sym}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Sumă de adăugat ({sym})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-12 text-lg font-semibold"
                autoFocus
              />
            </div>

            <div className="flex gap-2 mt-3">
              {[100, 500, 1000].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 bg-[#0F1117] border-[#2A2E3D] hover:bg-[#222636] text-slate-300 rounded-lg"
                >
                  +{val}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setAmount("");
            }}
            className="text-slate-400 hover:text-white rounded-xl"
          >
            Anulează
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}