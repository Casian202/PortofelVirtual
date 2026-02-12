import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Settings, TrendingUp, TrendingDown } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CategoryBadge from "../components/finance/CategoryBadge";

const EMOJI_LIST = ["💡", "💧", "🔥", "📱", "📺", "🏠", "🚗", "🍕", "🛒", "💊", "✈️", "📚", "💰", "💼", "🎁", "🎮", "👕", "💻", "📡", "🏋️"];

export default function BudgetSettings() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense",
    icon: "💡",
  });
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.BudgetCategory.list(),
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('category_')) {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => api.BudgetCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategory({ name: "", type: "expense", icon: "💡" });
      setEditingCategory(null);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.BudgetCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategory({ name: "", type: "expense", icon: "💡" });
      setEditingCategory(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.BudgetCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleSubmit = () => {
    if (!newCategory.name.trim()) return;
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: { ...newCategory, is_active: true }
      });
    } else {
      createMutation.mutate({ ...newCategory, is_active: true });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      type: category.type,
      icon: category.icon || "💡",
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setNewCategory({ name: "", type: "expense", icon: "💡" });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <Settings className="w-7 h-7 text-slate-400" />
            Setări Buget
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">
            Definește categoriile de venituri și cheltuieli
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium h-10 px-5"
        >
          <Plus className="w-4 h-4 mr-2" />
          Categorie Nouă
        </Button>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl p-1 h-auto">
          <TabsTrigger
            value="expenses"
            className="rounded-lg data-[state=active]:bg-red-500/15 data-[state=active]:text-red-400 px-6 py-2.5"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Cheltuieli ({expenseCategories.length})
          </TabsTrigger>
          <TabsTrigger
            value="incomes"
            className="rounded-lg data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 px-6 py-2.5"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Venituri ({incomeCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
          >
            <h2 className="text-lg font-bold mb-4">Categorii Cheltuieli</h2>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
                  <TrendingDown className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">Nu ai categorii de cheltuieli definite</p>
                <p className="text-slate-600 text-xs mt-1">
                  Adaugă categorii precum: Curent, Apă, Gaz, Netflix, etc.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {expenseCategories.map((cat) => (
                  <CategoryBadge
                    key={cat.id}
                    category={cat}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="incomes" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
          >
            <h2 className="text-lg font-bold mb-4">Categorii Venituri</h2>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#222636] flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">Nu ai categorii de venituri definite</p>
                <p className="text-slate-600 text-xs mt-1">
                  Adaugă categorii precum: Salariu, Freelance, Investiții, etc.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomeCategories.map((cat) => (
                  <CategoryBadge
                    key={cat.id}
                    category={cat}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCategory ? "Editează Categorie" : "Categorie Nouă"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-400 text-sm">Nume Categorie</Label>
              <Input
                placeholder="Ex: Curent, Netflix, Salariu..."
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11"
              />
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Tip</Label>
              <Select
                value={newCategory.type}
                onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}
              >
                <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1.5 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white">
                  <SelectItem value="expense" className="hover:bg-[#222636]">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400" /> Cheltuială
                    </span>
                  </SelectItem>
                  <SelectItem value="income" className="hover:bg-[#222636]">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Venit
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Icon</Label>
              <div className="grid grid-cols-10 gap-2 mt-2">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      newCategory.icon === emoji
                        ? "bg-emerald-500/20 border-2 border-emerald-500 scale-110"
                        : "bg-[#0F1117] border border-[#2A2E3D] hover:border-[#3A3E4D]"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleCloseForm}
              className="text-slate-400 hover:text-white rounded-xl"
            >
              Anulează
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newCategory.name.trim()}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingCategory ? "Salvează Modificările" : "Adaugă Categorie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}