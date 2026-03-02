import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Save, RefreshCw, CalendarClock } from "lucide-react";
import { format } from "date-fns";

// Helper: get current date/time in Romania timezone
const getRomaniaDate = () => {
  const now = new Date();
  const ro = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return ro; // returns YYYY-MM-DD
};

const getRomaniaDay = () => {
  const now = new Date();
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bucharest', day: 'numeric' }).format(now));
};

export default function TransactionForm({ open, onOpenChange, type, categories, currentMonth, onSubmit, editingTransaction = null }) {
  const getInitialFormData = () => ({
    category_id: "",
    category_name: "",
    amount: "",
    description: "",
    date: getRomaniaDate(),
    currency: "RON",
    is_recurring: false,
    recurring_day: getRomaniaDay(),
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // When editingTransaction changes, populate form
  React.useEffect(() => {
    if (editingTransaction) {
      setFormData({
        category_id: editingTransaction.category_id || "",
        category_name: editingTransaction.category_name || "",
        amount: String(editingTransaction.amount || ""),
        description: editingTransaction.description || "",
        date: editingTransaction.date ? editingTransaction.date.slice(0, 10) : getRomaniaDate(),
        currency: editingTransaction.currency || "RON",
        is_recurring: editingTransaction.is_recurring || false,
        recurring_day: editingTransaction.recurring_day || getRomaniaDay(),
      });
    } else {
      setFormData(getInitialFormData());
    }
  }, [editingTransaction]);

  const handleCategoryChange = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    setFormData({ ...formData, category_id: catId, category_name: cat?.name || "" });
  };

  const handleSubmit = () => {
    if (!formData.category_name || !formData.amount) return;

    // If recurring, override the date to use the selected day in the current month
    let submitDate = formData.date;
    if (formData.is_recurring) {
      const day = String(formData.recurring_day).padStart(2, '0');
      submitDate = `${currentMonth}-${day}`;
    }
    onSubmit({
      ...formData,
      date: submitDate,
      amount: parseFloat(formData.amount),
      type,
      month: currentMonth,
    });
    setFormData(getInitialFormData());
    onOpenChange(false);
  };

  const isEditing = !!editingTransaction;

  const typeLabel = type === "income" ? "Venit" : "Cheltuială";
  const currencies = ['RON', 'EUR', 'USD', 'GBP'];
  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {isEditing ? (
              <Save className={`w-5 h-5 ${type === "income" ? "text-emerald-400" : "text-red-400"}`} />
            ) : (
              <Plus className={`w-5 h-5 ${type === "income" ? "text-emerald-400" : "text-red-400"}`} />
            )}
            {isEditing ? `Editează ${typeLabel}` : `Adaugă ${typeLabel}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-400 text-sm">Categorie</Label>
            <Select value={formData.category_id} onValueChange={handleCategoryChange}>
              <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11">
                <SelectValue placeholder="Selectează categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="hover:bg-[#222636]">
                    <span className="flex items-center gap-2">
                      {cat.icon && <span>{cat.icon}</span>}
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Sumă ({getCurrencySymbol(formData.currency)})</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11 text-lg font-semibold flex-1"
              />
              <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white">
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr} className="hover:bg-[#222636]">
                      {getCurrencySymbol(curr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Data</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#0F1117] border border-[#2A2E3D] p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${formData.is_recurring ? 'text-orange-400' : 'text-slate-500'}`} />
              <div>
                <Label className="text-sm text-white cursor-pointer">Recurentă lunar</Label>
                <p className="text-xs text-slate-500">Se va genera automat în fiecare lună</p>
              </div>
            </div>
            <Switch
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
          </div>

          {formData.is_recurring && (
            <div>
              <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Ziua din lună
              </Label>
              <Select
                value={String(formData.recurring_day)}
                onValueChange={(val) => setFormData({ ...formData, recurring_day: parseInt(val) })}
              >
                <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11">
                  <SelectValue placeholder="Selectează ziua" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-h-60">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)} className="hover:bg-[#222636]">
                      Ziua {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-orange-400/70 mt-1">Tranzacția se va genera pe data de {formData.recurring_day} în fiecare lună</p>
            </div>
          )}

          <div>
            <Label className="text-slate-400 text-sm">Descriere (opțional)</Label>
            <Textarea
              placeholder="Adaugă detalii..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            disabled={!formData.category_name || !formData.amount}
            className={`rounded-xl font-medium ${
              type === "income"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Actualizează' : 'Salvează'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}