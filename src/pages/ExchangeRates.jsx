import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, DollarSign, Info, Loader2, ArrowUpRight, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { api } from '@/api/apiClient';

export default function ExchangeRates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRates, setEditingRates] = useState({});

  // Fetch exchange rates using apiClient
  const { data: rates = [], isLoading, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => api.ExchangeRates.list()
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((message) => {
      if (message.type.startsWith('exchange_rate_')) {
        queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Update exchange rate mutation
  const updateRateMutation = useMutation({
    mutationFn: ({ currency, rate }) => api.ExchangeRates.update(currency, rate),
    onSuccess: () => {
      queryClient.invalidateQueries(['exchange-rates']);
      toast({
        title: 'Succes',
        description: 'Cursul valutar a fost actualizat cu succes'
      });
      setEditingRates({});
    },
    onError: (error) => {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut actualiza cursul valutar',
        variant: 'destructive'
      });
    }
  });

  const handleRateChange = (currency, value) => {
    setEditingRates(prev => ({
      ...prev,
      [currency]: value
    }));
  };

  const handleSaveRate = (currency) => {
    const newRate = parseFloat(editingRates[currency]);
    if (isNaN(newRate) || newRate <= 0) {
      toast({
        title: 'Eroare',
        description: 'Introduceți un curs valid',
        variant: 'destructive'
      });
      return;
    }
    updateRateMutation.mutate({ currency, rate: newRate });
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£'
    };
    return symbols[currency] || currency;
  };

  const getCurrencyName = (currency) => {
    const names = {
      'EUR': 'Euro',
      'USD': 'Dolar American',
      'GBP': 'Liră Sterlină'
    };
    return names[currency] || currency;
  };

  const getCurrencyColor = (currency) => {
    const colors = {
      'EUR': 'from-blue-500 to-indigo-500',
      'USD': 'from-emerald-500 to-green-500',
      'GBP': 'from-purple-500 to-violet-500'
    };
    return colors[currency] || 'from-slate-500 to-gray-500';
  };

  const getCurrencyBgColor = (currency) => {
    const colors = {
      'EUR': 'bg-blue-500/10 border-blue-500/20',
      'USD': 'bg-emerald-500/10 border-emerald-500/20',
      'GBP': 'bg-purple-500/10 border-purple-500/20'
    };
    return colors[currency] || 'bg-slate-500/10 border-slate-500/20';
  };

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
            <RefreshCw className="w-7 h-7 text-blue-400" />
            Cursuri Valutare
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestionează cursurile de schimb pentru valute străine
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="rounded-xl border-[#2A2E3D] hover:bg-[#1A1D29] text-slate-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Exchange Rate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rates.map((rate, idx) => (
              <motion.div
                key={rate.currency}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`bg-[#1A1D29] border-[#2A2E3D] hover:border-[#3A3E4D] transition-all overflow-hidden`}>
                  {/* Currency Header */}
                  <div className={`h-2 bg-gradient-to-r ${getCurrencyColor(rate.currency)}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${getCurrencyBgColor(rate.currency)} flex items-center justify-center`}>
                          <span className="text-2xl font-bold">{getCurrencySymbol(rate.currency)}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{getCurrencyName(rate.currency)}</CardTitle>
                          <CardDescription className="text-slate-500">
                            {rate.currency}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Curent</p>
                        <p className="text-lg font-bold text-white">
                          {parseFloat(rate.rate).toFixed(4)}
                        </p>
                        <p className="text-xs text-slate-500">RON</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="pt-2 border-t border-[#2A2E3D]">
                      <Label className="text-slate-400 text-xs">
                        Nou Curs de Schimb
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder={parseFloat(rate.rate).toFixed(4)}
                            value={editingRates[rate.currency] || ''}
                            onChange={(e) => handleRateChange(rate.currency, e.target.value)}
                            className="bg-[#0F1117] border-[#2A2E3D] text-white rounded-xl h-10 pr-14"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                            RON
                          </span>
                        </div>
                        <Button
                          onClick={() => handleSaveRate(rate.currency)}
                          disabled={!editingRates[rate.currency] || updateRateMutation.isPending}
                          className={`bg-gradient-to-r ${getCurrencyColor(rate.currency)} hover:opacity-90 text-white rounded-xl h-10 px-4`}
                        >
                          {updateRateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        1 {rate.currency} = X RON
                      </p>
                    </div>

                    {rate.updated_at && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-[#2A2E3D]">
                        <Clock className="w-3 h-3" />
                        <span>
                          Actualizat: {new Date(rate.updated_at).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {rate.updated_by_email && (
                          <span className="text-slate-600">• {rate.updated_by_email}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-blue-400" />
                  Cum Funcționează Cursurile Valutare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <DollarSign className="w-3 h-3 text-blue-400" />
                    </div>
                    <p>Cursurile definesc cât valorează 1 unitate de valută străină în RON</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p>Exemplu: Dacă 1 EUR = 5.00 RON, atunci €100 = 500 RON</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw className="w-3 h-3 text-purple-400" />
                    </div>
                    <p>Utilizatorii pot urmări venituri și cheltuieli în diferite valute</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="w-3 h-3 text-amber-400" />
                    </div>
                    <p>Toate sumele sunt convertite în RON pentru totaluri și rapoarte</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}