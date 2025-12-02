import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext'; // Importar o contexto de perfil

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const { activeProfile } = useProfile(); // Usar o perfil ativo
    const [baseCurrency, setBaseCurrency] = useState('BRL');
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchCurrencySettings = useCallback(async () => {
        if (!user || !activeProfile) return; // CORREÇÃO: Adicionado guarda para o perfil ativo

        setLoading(true);
        try {
            // 1. Buscar a moeda base do perfil do usuário
            // CORREÇÃO: Usar o perfil ativo para buscar a moeda base
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('base_currency')
                .eq('id', activeProfile.id) // Filtrar pelo ID do perfil ativo
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError; // Ignora erro se não encontrar perfil
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
    }, [user, activeProfile]); // Adicionar activeProfile como dependência

    useEffect(() => {
        if (activeProfile) fetchCurrencySettings();
    }, [fetchCurrencySettings, activeProfile]);

    const value = { baseCurrency, exchangeRates, loading, fetchCurrencySettings };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => useContext(CurrencyContext);