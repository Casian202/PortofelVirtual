import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, TrendingUp, TrendingDown, Wallet, Plus, Minus, Trash2, FileText, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import KpiCard from "../components/finance/KpiCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper: get current date in Romania timezone
const getRomaniaDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
};

export default function MealVouchers() {
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [showSpendForm, setShowSpendForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch meal voucher balance using dedicated endpoint
  const { data: mealVoucherData } = useQuery({
    queryKey: ["meal-voucher-balance"],
    queryFn: () => api.MealVouchers.getBalance(),
  });

  // Fetch categories to find "Alimente"
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.BudgetCategory.list(),
  });

  // Fetch meal voucher transactions using dedicated endpoint
  const { data: mealVoucherTransactions = [] } = useQuery({
    queryKey: ["meal-voucher-transactions"],
    queryFn: () => api.MealVouchers.list(),
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('meal_voucher_') || message.type.startsWith('transaction_')) {
        queryClient.invalidateQueries({ queryKey: ["meal-voucher-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["meal-voucher-balance"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Receive meal voucher mutation
  const receiveMutation = useMutation({
    mutationFn: (data) => api.MealVouchers.receive(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-balance"] });
    },
  });

  // Spend meal voucher mutation
  const spendMutation = useMutation({
    mutationFn: (data) => api.MealVouchers.spend(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-balance"] });
    },
  });

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.MealVouchers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["meal-voucher-balance"] });
    },
  });

  // Get the "Alimente" category for spending
  const alimenteCategory = categories.find((c) => c.name === "Alimente" && c.type === "expense");

  // KPI values
  const balance = mealVoucherData?.balance || 0;
  const totalIncome = mealVoucherData?.total_income || 0;
  const totalExpense = mealVoucherData?.total_expense || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <UtensilsCrossed className="w-7 h-7 text-purple-400" />
            Bonuri de Masă
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Gestionează bonurile de masă - încasări și cheltuieli</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Sold Bonuri de Masă"
          value={`${formatCurrency(balance)} RON`}
          icon={Wallet}
          color={balance >= 0 ? "purple" : "red"}
          delay={0}
          trendLabel="Disponibil acum"
        />
        <KpiCard
          title="Total Încasat"
          value={`${formatCurrency(totalIncome)} RON`}
          icon={TrendingUp}
          color="emerald"
          delay={0.1}
          trendLabel="Total bonuri primite"
        />
        <KpiCard
          title="Total Cheltuit"
          value={`${formatCurrency(totalExpense)} RON`}
          icon={TrendingDown}
          color="red"
          delay={0.2}
          trendLabel="Total bonuri folosite"
        />
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={() => setShowReceiveForm(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium h-11 px-6 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Primește Bonuri
        </Button>
        <Button
          onClick={() => setShowSpendForm(true)}
          disabled={!alimenteCategory}
          className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium h-11 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus className="w-5 h-5" />
          Cheltuiește Bonuri
        </Button>
        {!alimenteCategory && (
          <p className="text-xs text-amber-400 self-center">
            Categoria "Alimente" nu există. Creează categoria mai întâi în setări.
          </p>
        )}
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-3 sm:p-6"
      >
        <h2 className="text-base sm:text-lg font-bold mb-4">Istoric Tranzacții Bonuri de Masă</h2>
        {mealVoucherTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">
              Nu există tranzacții cu bonuri de masă
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {mealVoucherTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group flex items-center justify-between p-3 sm:p-4 rounded-xl bg-[#0F1117] border border-[#2A2E3D] hover:border-[#3A3E4D] transition-all gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg shrink-0 ${
                      tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}>
                      <UtensilsCrossed className={`w-4 h-4 sm:w-5 sm:h-5 ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-slate-200">{tx.category_name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          tx.type === "income"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}>
                          {tx.type === "income" ? "Încasare" : "Cheltuială"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {format(new Date(tx.date), "d MMMM yyyy", { locale: ro })}
                        </span>
                        {tx.description && (
                          <>
                            <span className="text-slate-600 hidden sm:inline">·</span>
                            <span className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">{tx.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    <span className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                      tx.type === "income" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)} RON
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(tx.id)}
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Receive Form Dialog */}
      <MealVoucherForm
        open={showReceiveForm}
        onOpenChange={setShowReceiveForm}
        type="income"
        categories={categories.filter((c) => c.type === "income" && c.is_active !== false)}
        onSubmit={(data) => receiveMutation.mutate(data)}
      />

      {/* Spend Form Dialog */}
      <MealVoucherForm
        open={showSpendForm}
        onOpenChange={setShowSpendForm}
        type="expense"
        categories={alimenteCategory ? [alimenteCategory] : []}
        onSubmit={(data) => spendMutation.mutate(data)}
        isSpendForm={true}
      />
    </div>
  );
}

// Meal Voucher Form Component
function MealVoucherForm({ open, onOpenChange, type, categories, onSubmit, isSpendForm = false }) {
  // For income (receive), default to recurring=true since meal vouchers come monthly
  const [formData, setFormData] = useState({
    category_id: "",
    category_name: "",
    amount: "",
    description: "",
    date: getRomaniaDate(),
    is_recurring: type === "income", // Default true for receiving bonuri
    recurring_day: 1, // Default to 1st of the month
  });

  // Auto-select category for spend form
  useEffect(() => {
    if (isSpendForm && categories.length > 0 && !formData.category_id) {
      setFormData((prev) => ({
        ...prev,
        category_id: categories[0].id,
        category_name: categories[0].name,
      }));
    }
  }, [isSpendForm, categories, formData.category_id]);

  // Reset recurring_day when is_recurring changes
  useEffect(() => {
    if (formData.is_recurring && !formData.recurring_day) {
      const currentDate = new Date(formData.date);
      setFormData(prev => ({ ...prev, recurring_day: currentDate.getDate() || 1 }));
    }
  }, [formData.is_recurring, formData.date, formData.recurring_day]);

  const handleSubmit = () => {
    if (!formData.category_name || !formData.amount) return;

    // Submit data - backend sets is_meal_voucher automatically
    onSubmit({
      category_id: formData.category_id,
      category_name: formData.category_name,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      month: formData.date.slice(0, 7),
      currency: "RON",
      is_recurring: type === "income" ? formData.is_recurring : false,
      recurring_day: type === "income" && formData.is_recurring ? formData.recurring_day : null,
    });
    setFormData({
      category_id: isSpendForm && categories.length > 0 ? categories[0].id : "",
      category_name: isSpendForm && categories.length > 0 ? categories[0].name : "",
      amount: "",
      description: "",
      date: getRomaniaDate(),
      is_recurring: type === "income",
      recurring_day: 1,
    });
    onOpenChange(false);
  };

  const title = type === "income" ? "Primește Bonuri de Masă" : "Cheltuiește Bonuri de Masă";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UtensilsCrossed className={`w-5 h-5 ${type === "income" ? "text-emerald-400" : "text-red-400"}`} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category Selection - Hidden for spend form if only one category */}
          {!isSpendForm && (
            <div>
              <Label className="text-slate-400 text-sm">Categorie</Label>
              <Select
                value={formData.category_id}
                onValueChange={(catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  setFormData({ ...formData, category_id: catId, category_name: cat?.name || "" });
                }}
              >
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
          )}

          {/* For spend form, show fixed category */}
          {isSpendForm && categories.length > 0 && (
            <div className="rounded-xl bg-[#0F1117] border border-[#2A2E3D] p-3">
              <Label className="text-slate-400 text-sm">Categorie</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-white font-medium">{categories[0].name}</span>
                <span className="text-xs text-slate-500 ml-auto">Bonuri de masă</span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-slate-400 text-sm">Sumă (RON)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11 text-lg font-semibold"
            />
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

          {/* Recurring switch - only for receive form (income) */}
          {!isSpendForm && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                  <Label className="text-white text-sm font-medium">Recurent lunar</Label>
                </div>
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Bonurile de masă se adaugă automat în fiecare lună
              </p>

              {formData.is_recurring && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20">
                  <Label className="text-slate-400 text-xs">Ziua lunii pentru încasare (1-31)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.recurring_day}
                    onChange={(e) => setFormData({ ...formData, recurring_day: parseInt(e.target.value) || 1 })}
                    className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1 rounded-xl h-9 w-24 text-center"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-slate-400 text-sm">Descriere (opțional)</Label>
            <Textarea
              placeholder={type === "income" ? "Ex: Bonuri de masă pentru luna..." : "Ex: Cumpărături de la..."}
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
            {type === "income" ? "Primește" : "Cheltuiește"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
