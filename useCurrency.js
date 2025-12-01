import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [baseCurrency, setBaseCurrency] = useState('BRL');
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCurrencySettings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Buscar moeda base do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('base_currency')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBaseCurrency(profile.base_currency);
      }

      // 2. Buscar taxas de câmbio do usuário
      const { data: rates, error: ratesError } = await supabase
        .from('user_exchange_rates')
        .select('target_currency, rate')
        .eq('user_id', user.id);

      if (rates) {
        const ratesMap = rates.reduce((acc, rate) => {
          acc[rate.target_currency] = rate.rate;
          return acc;
        }, {});
        setExchangeRates(ratesMap);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCurrencySettings();
  }, [fetchCurrencySettings]);

  const convertToBRL = useCallback((amount, currency) => {
    if (!amount || !currency || currency === baseCurrency) {
      return amount;
    }
    const rate = exchangeRates[currency];
    // Se não houver taxa cadastrada, retorna o valor original para não quebrar os cálculos
    return amount * (rate || 1);
  }, [baseCurrency, exchangeRates]);

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || baseCurrency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const value = {
    baseCurrency,
    exchangeRates,
    loading,
    fetchCurrencySettings,
    convertToBRL,
    formatCurrency,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};