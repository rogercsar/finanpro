import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext'; // Usar o contexto de perfil
import { useCurrency } from '../context/CurrencyContext';
import { DollarSign, Euro, Save } from 'lucide-react';

const currencyOptions = [
  { code: 'BRL', name: 'Real Brasileiro (R$)' },
  { code: 'USD', name: 'Dólar Americano (U$)' },
  { code: 'EUR', name: 'Euro (€)' },
];

export default function CurrencySettingsPage() {
  const { activeProfile, updateProfile } = useProfile(); // Obter perfil ativo e função de update
  const { baseCurrency, exchangeRates, fetchCurrencySettings, loading } = useCurrency();
  
  const [localBaseCurrency, setLocalBaseCurrency] = useState(baseCurrency);
  const [wantsWeeklySummary, setWantsWeeklySummary] = useState(false);
  const [localRates, setLocalRates] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalBaseCurrency(baseCurrency);
    const initialRates = {
      USD: exchangeRates.USD || '',
      EUR: exchangeRates.EUR || '',
    };
    setLocalRates(initialRates);
    setWantsWeeklySummary(activeProfile?.weekly_summary_email || false);
  }, [baseCurrency, exchangeRates, activeProfile]);

  const handleSaveSettings = async () => {
    setIsSaving(true);

    // 1. Salvar configurações no perfil
    await updateProfile({
      base_currency: localBaseCurrency,
      weekly_summary_email: wantsWeeklySummary,
    });

    // 2. Salvar (ou atualizar) taxas de câmbio
    // (Esta lógica precisa ser ajustada para usar o user.id correto)
    for (const currencyCode of ['USD', 'EUR']) {
      const rateValue = parseFloat(localRates[currencyCode]);
      if (rateValue > 0) {
        await supabase
          .from('user_exchange_rates')
          .upsert({
            user_id: activeProfile.user_id,
            target_currency: currencyCode,
            rate: rateValue,
          }, { onConflict: 'user_id, target_currency' });
      } else {
        // Remove a taxa se o valor for zerado ou inválido
        await supabase
          .from('user_exchange_rates')
          .delete()
          .match({ user_id: activeProfile.user_id, target_currency: currencyCode });
      }
    }

    await fetchCurrencySettings(); // Recarrega os dados no contexto
    setIsSaving(false);
    alert('Configurações salvas com sucesso!');
  };

  if (loading) {
    return <div className="text-center p-8">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Configurações de Moeda</h1>

      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Moeda Principal</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Selecione a moeda principal para a exibição dos totais consolidados no seu dashboard.
        </p>
        <select
          value={localBaseCurrency}
          onChange={(e) => setLocalBaseCurrency(e.target.value)}
          className="w-full md:w-1/2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700"
        >
          {currencyOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Notificações por Email</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Resumo Semanal</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Receba um resumo de suas finanças toda segunda-feira.
            </p>
          </div>
          <button
            onClick={() => setWantsWeeklySummary(!wantsWeeklySummary)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wantsWeeklySummary ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsWeeklySummary ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Taxas de Câmbio</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Defina o valor de 1 unidade de moeda estrangeira em relação à sua moeda principal ({localBaseCurrency}).
        </p>
        <div className="space-y-4">
          {['USD', 'EUR'].filter(c => c !== localBaseCurrency).map(currency => (
            <div key={currency} className="flex items-center gap-4">
              <span className="font-medium w-28">1 {currency} =</span>
              <input type="number" step="0.0001" placeholder="Ex: 5.25" value={localRates[currency] || ''} onChange={(e) => setLocalRates(prev => ({ ...prev, [currency]: e.target.value }))} className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700" />
              <span className="font-medium">{localBaseCurrency}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSaveSettings} disabled={isSaving} className="btn-primary flex items-center gap-2">
          <Save className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}