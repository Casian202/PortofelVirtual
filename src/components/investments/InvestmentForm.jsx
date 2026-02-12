import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, Plus } from "lucide-react";
import { format } from "date-fns";

// Helper: get current date in Romania timezone
const getRomaniaDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
};

export default function InvestmentForm({ open, onOpenChange, investment, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "stocks",
    initial_amount: "",
    current_value: "",
    purchase_date: getRomaniaDate(),
    notes: "",
  });

  useEffect(() => {
    if (investment) {
      setFormData({
        name: investment.name || "",
        type: investment.type || "stocks",
        initial_amount: investment.initial_amount || "",
        current_value: investment.current_value || "",
        purchase_date: investment.purchase_date || getRomaniaDate(),
        notes: investment.notes || "",
      });
    } else {
      setFormData({
        name: "",
        type: "stocks",
        initial_amount: "",
        current_value: "",
        purchase_date: getRomaniaDate(),
        notes: "",
      });
    }
  }, [investment, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.initial_amount || !formData.current_value) return;
    onSubmit({
      ...formData,
      initial_amount: parseFloat(formData.initial_amount),
      current_value: parseFloat(formData.current_value),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {investment ? "Editează Investiție" : "Investiție Nouă"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-400 text-sm">Nume Investiție</Label>
            <Input
              placeholder="Ex: Acțiuni Apple, Bitcoin..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Tip Investiție</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white">
                <SelectItem value="stocks">📈 Acțiuni</SelectItem>
                <SelectItem value="crypto">₿ Crypto</SelectItem>
                <SelectItem value="real_estate">🏠 Imobiliare</SelectItem>
                <SelectItem value="bonds">📜 Obligațiuni</SelectItem>
                <SelectItem value="mutual_funds">💼 Fonduri Mutuale</SelectItem>
                <SelectItem value="other">💰 Altele</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400 text-sm">Investiție Inițială (RON)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.initial_amount}
                onChange={(e) => setFormData({ ...formData, initial_amount: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Valoare Curentă (RON)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Data Achiziției</Label>
            <Input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Note (opțional)</Label>
            <Textarea
              placeholder="Adaugă detalii..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white rounded-xl"
          >
            Anulează
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.initial_amount || !formData.current_value}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium"
          >
            {investment ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvează
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}