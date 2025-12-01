import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../hooks/useCurrency';
import { DollarSign, Euro, BrazilianReal, Save, Trash2 } from 'lucide-react';

const currencyOptions = [
  { code: 'BRL', name: 'Real Brasileiro', icon: <BrazilianReal className="w-5 h-5" /> },
  { code: 'USD', name: 'Dólar Americano', icon: <DollarSign className="w-5 h-5" /> },
  { code: 'EUR', name: 'Euro', icon: <Euro className="w-5 h-5" /> },
];

const CurrencySettingsPage = () => {
  const { baseCurrency, exchangeRates, fetchCurrencySettings, loading } = useCurrency();
  const [localBaseCurrency, setLocalBaseCurrency] = useState(baseCurrency);
  const [localRates, setLocalRates] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalBaseCurrency(baseCurrency);
    // Inicializa as taxas locais com as taxas do contexto, garantindo que USD e EUR existam
    const initialRates = {
      USD: exchangeRates.USD || '',
      EUR: exchangeRates.EUR || '',
    };
    setLocalRates(initialRates);
  }, [baseCurrency, exchangeRates]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Salvar moeda base
    await supabase
      .from('profiles')
      .update({ base_currency: localBaseCurrency })
      .eq('id', user.id);

    // 2. Salvar taxas de câmbio
    for (const currency of ['USD', 'EUR']) {
      const rateValue = parseFloat(localRates[currency]);
      if (rateValue > 0) {
        await supabase
          .from('user_exchange_rates')
          .upsert({
            user_id: user.id,
            target_currency: currency,
            rate: rateValue,
          }, { onConflict: 'user_id, target_currency' });
      } else {
        // Remove a taxa se o valor for zerado ou inválido
        await supabase
          .from('user_exchange_rates')
          .delete()
          .match({ user_id: user.id, target_currency: currency });
      }
    }

    await fetchCurrencySettings(); // Recarrega os dados no contexto
    setIsSaving(false);
  };

  const handleRateChange = (currency, value) => {
    setLocalRates(prev => ({ ...prev, [currency]: value }));
  };

  if (loading) {
    return <div className="text-center p-8">Carregando configurações...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Configurações de Moeda</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Moeda Principal</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Selecione a moeda principal para a exibição dos totais consolidados no seu dashboard.
        </p>
        <select
          value={localBaseCurrency}
          onChange={(e) => setLocalBaseCurrency(e.target.value)}
          className="w-full md:w-1/2 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        >
          {currencyOptions.map(c => (
            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Taxas de Câmbio</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Defina o valor de 1 unidade de moeda estrangeira em relação à sua moeda principal.
          Por exemplo, se sua moeda principal é BRL, informe quantos Reais valem 1 Dólar.
        </p>
        <div className="space-y-4">
          {['USD', 'EUR'].map(currency => (
            <div key={currency} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32">
                {currencyOptions.find(c => c.code === currency)?.icon}
                <span className="font-medium">1 {currency} =</span>
              </div>
              <input
                type="number"
                step="0.0001"
                placeholder="Ex: 5.25"
                value={localRates[currency] || ''}
                onChange={(e) => handleRateChange(currency, e.target.value)}
                className="flex-1 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                disabled={localBaseCurrency === currency}
              />
              <span className="font-medium">{localBaseCurrency}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};

export default CurrencySettingsPage;