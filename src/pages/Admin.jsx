import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserPlus, Users, Shield, Trash2, Edit, TrendingUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function AdminPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRates, setEditingRates] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user"
  });

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Exchange rates queries
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/exchange-rates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      return response.json();
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ currency, rate }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/exchange-rates/${currency}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rate })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update exchange rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      setEditingRates({});
    }
  });

  const handleRateChange = (currency, value) => {
    setEditingRates(prev => ({ ...prev, [currency]: value }));
  };

  const handleSaveRate = (currency) => {
    const newRate = parseFloat(editingRates[currency]);
    if (isNaN(newRate) || newRate <= 0) return;
    updateRateMutation.mutate({ currency, rate: newRate });
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return symbols[currency] || currency;
  };

  const getCurrencyName = (currency) => {
    const names = { 'EUR': 'Euro', 'USD': 'Dolar American', 'GBP': 'Liră Sterlină' };
    return names[currency] || currency;
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreateDialog(false);
      setFormData({ email: "", password: "", full_name: "", role: "user" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleCreate = () => {
    if (!formData.email || !formData.password) return;
    createUserMutation.mutate(formData);
  };

  const handleDelete = (userId) => {
    if (confirm("Sigur doriți să ștergeți acest utilizator?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
          >
            <Shield className="w-7 h-7 text-amber-400" />
            Administrare
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">Gestionare utilizatori și cursuri valutare</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-[#1A1D29] border border-[#2A2E3D]">
          <TabsTrigger value="users" className="data-[state=active]:bg-[#222636]">
            <Users className="w-4 h-4 mr-2" />
            Utilizatori
          </TabsTrigger>
          <TabsTrigger value="exchange-rates" className="data-[state=active]:bg-[#222636]">
            <TrendingUp className="w-4 h-4 mr-2" />
            Cursuri Valutare
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium h-10 px-5"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Cont Nou
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-[#1A1D29] border border-[#2A2E3D] p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Utilizatori Înregistrați</h2>
              <span className="text-sm text-slate-500">({users.length})</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#2A2E3D]">
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Nume Complet</TableHead>
                    <TableHead className="text-slate-400">Rol</TableHead>
                    <TableHead className="text-slate-400 hidden md:table-cell">Schimbare Parolă</TableHead>
                    <TableHead className="text-slate-400 hidden md:table-cell">Data creării</TableHead>
                    <TableHead className="text-slate-400 text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-b border-[#2A2E3D]/50 hover:bg-[#0F1117]/50">
                      <TableCell className="font-medium text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.full_name || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin" 
                            ? "bg-amber-500/10 text-amber-400" 
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.must_change_password ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                            Da
                          </span>
                        ) : (
                          <span className="text-slate-500">Nu</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 hidden md:table-cell">
                        {format(new Date(user.created_date), "d MMM yyyy", { locale: ro })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                          className="h-8 w-8 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Nu există utilizatori înregistrați
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </TabsContent>

        {/* Exchange Rates Tab */}
        <TabsContent value="exchange-rates" className="space-y-6 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-slate-400 text-sm mb-4">
              Definește cursul valutar (cât valorează 1 unitate de valută străină în RON)
            </p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {rates.map((rate) => (
                <Card key={rate.currency} className="bg-[#1A1D29] border-[#2A2E3D]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{getCurrencySymbol(rate.currency)}</span>
                      <span>{getCurrencyName(rate.currency)}</span>
                    </CardTitle>
                    <CardDescription>
                      Curs actual: 1 {rate.currency} = <span className="text-emerald-400 font-bold">{parseFloat(rate.rate).toFixed(4)}</span> RON
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`rate-${rate.currency}`} className="text-slate-400 text-xs">
                        Curs nou (1 {rate.currency} = X RON)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`rate-${rate.currency}`}
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder={parseFloat(rate.rate).toFixed(4)}
                          value={editingRates[rate.currency] || ''}
                          onChange={(e) => handleRateChange(rate.currency, e.target.value)}
                          className="bg-[#0F1117] border-[#2A2E3D] text-white"
                        />
                        <Button
                          onClick={() => handleSaveRate(rate.currency)}
                          disabled={!editingRates[rate.currency] || updateRateMutation.isPending}
                          size="icon"
                          className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {rate.updated_at && (
                      <p className="text-xs text-slate-500 border-t border-[#2A2E3D] pt-2">
                        Actualizat: {new Date(rate.updated_at).toLocaleString('ro-RO')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {rates.length === 0 && !ratesLoading && (
                <div className="col-span-full text-center py-8 text-slate-500">
                  Nu există cursuri valutare definite
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-[#1A1D29]/50 border border-[#2A2E3D] p-4"
          >
            <h3 className="font-bold text-sm mb-2">Cum funcționează cursurile valutare</h3>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Cursul definește câți RON valorează 1 unitate de valută străină</li>
              <li>• Exemplu: dacă 1 EUR = 5.00 RON, atunci €100 = 500 RON</li>
              <li>• Utilizatorii pot adăuga venituri/cheltuieli în EUR, USD sau GBP</li>
              <li>• Totalurile se convertesc automat la valuta selectată</li>
            </ul>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1A1D29] border-[#2A2E3D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Creare Cont Nou</DialogTitle>
            <DialogDescription className="text-slate-400">
              Completați datele pentru crearea unui cont nou
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-400 text-sm">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1"
                placeholder="email@exemplu.ro"
              />
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Parolă Inițială *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1"
                placeholder="Minim 8 caractere"
              />
              <p className="text-xs text-slate-500 mt-1">
                Utilizatorul va fi forțat să schimbe parola la prima logare
              </p>
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Nume Complet</Label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1"
                placeholder="Numele complet al utilizatorului"
              />
            </div>

            <div>
              <Label className="text-slate-400 text-sm">Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="bg-[#0F1117] border-[#2A2E3D] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-[#2A2E3D] text-white">
                  <SelectItem value="user">Utilizator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createUserMutation.isError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {createUserMutation.error.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              className="text-slate-400 hover:text-white"
            >
              Anulează
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createUserMutation.isPending || !formData.email || !formData.password}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createUserMutation.isPending ? "Se creează..." : "Creare Cont"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
