import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';

export default function ExchangeRates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRates, setEditingRates] = useState({});

  // Fetch exchange rates
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/exchange-rates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      return response.json();
    }
  });

  // Update exchange rate mutation
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
      queryClient.invalidateQueries(['exchange-rates']);
      toast({
        title: 'Success',
        description: 'Exchange rate updated successfully'
      });
      setEditingRates({});
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update exchange rate',
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
        title: 'Error',
        description: 'Please enter a valid rate',
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
      'USD': 'US Dollar',
      'GBP': 'British Pound'
    };
    return names[currency] || currency;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Exchange Rates Management</h1>
        <p className="text-muted-foreground">Set exchange rates for foreign currencies (1 RON = X currency)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {rates.map((rate) => (
          <Card key={rate.currency}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{getCurrencySymbol(rate.currency)}</span>
                <span>{getCurrencyName(rate.currency)}</span>
              </CardTitle>
              <CardDescription>
                Current rate: 1 {rate.currency} = {parseFloat(rate.rate).toFixed(4)} RON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`rate-${rate.currency}`}>
                  New Exchange Rate
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id={`rate-${rate.currency}`}
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder={parseFloat(rate.rate).toFixed(4)}
                      value={editingRates[rate.currency] || ''}
                      onChange={(e) => handleRateChange(rate.currency, e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleSaveRate(rate.currency)}
                    disabled={!editingRates[rate.currency] || updateRateMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  1 {rate.currency} = X RON
                </p>
              </div>

              {rate.updated_at && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Last updated: {new Date(rate.updated_at).toLocaleString()}
                  {rate.updated_by_email && (
                    <> by {rate.updated_by_email}</>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>How Exchange Rates Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Exchange rates define how much 1 unit of foreign currency equals in RON</p>
          <p>• Example: If 1 EUR = 5.00 RON, then €100 = 500 RON</p>
          <p>• Users can track income and expenses in different currencies</p>
          <p>• All currencies will be converted to RON equivalent for totals and reports</p>
        </CardContent>
      </Card>
    </div>
  );
}
