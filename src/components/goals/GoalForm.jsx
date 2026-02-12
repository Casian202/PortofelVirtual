import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const EMOJI_LIST = ["🎯", "🚗", "🏠", "✈️", "💍", "🎓", "💻", "📱", "🎮", "🏖️", "🎸", "📷", "🏋️", "🎨", "🛵"];

export default function GoalForm({ open, onOpenChange, goal, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
    icon: "🎯",
    currency: "RON",
  });

  const currencies = ['RON', 'EUR', 'USD', 'GBP'];
  const getCurrencySymbol = (curr) => {
    const symbols = { 'RON': 'RON', 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[curr] || curr;
  };

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || "",
        target_amount: goal.target_amount || "",
        current_amount: goal.current_amount || "",
        deadline: goal.deadline || "",
        icon: goal.icon || "🎯",
        currency: goal.currency || "RON",
      });
    } else {
      setFormData({
        name: "",
        target_amount: "",
        current_amount: "",
        deadline: "",
        icon: "🎯",
        currency: "RON",
      });
    }
  }, [goal, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.target_amount) return;
    onSubmit({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount || 0),
      is_completed: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {goal ? "Editează Obiectiv" : "Obiectiv Nou"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-400 text-sm">Nume Obiectiv</Label>
            <Input
              placeholder="Ex: Mașină nouă, Vacanță..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Icon</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                    formData.icon === emoji
                      ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                      : "bg-[#0F1117] border border-[#2A2E3D] hover:border-[#3A3E4D]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Valută</Label>
            <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
              <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400 text-sm">Sumă Țintă ({getCurrencySymbol(formData.currency)})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Suma Economisită</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-sm">Termen (opțional)</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
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
            disabled={!formData.name || !formData.target_amount}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium"
          >
            {goal ? (
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