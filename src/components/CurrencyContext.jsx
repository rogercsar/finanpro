import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [baseCurrency, setBaseCurrency] = useState('BRL');
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchCurrencySettings = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // 1. Buscar a moeda base do perfil do usuário
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('base_currency')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (profile) {
                setBaseCurrency(profile.base_currency);
            }

            // 2. Buscar as taxas de câmbio definidas pelo usuário
            const { data: rates, error: ratesError } = await supabase
                .from('user_exchange_rates')
                .select('target_currency, rate')
                .eq('user_id', user.id);

            if (ratesError) throw ratesError;

            const ratesMap = rates.reduce((acc, rate) => {
                acc[rate.target_currency] = rate.rate;
                return acc;
            }, {});
            setExchangeRates(ratesMap);

        } catch (error) {
            console.error('Error fetching currency settings:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCurrencySettings();
    }, [fetchCurrencySettings]);

    const value = { baseCurrency, exchangeRates, loading, fetchCurrencySettings };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => useContext(CurrencyContext);