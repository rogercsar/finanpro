import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AlertsContext = createContext();

export function AlertsProvider({ children }) {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch alerts on mount and every 30 seconds
    useEffect(() => {
        if (user?.id) {
            fetchAlerts();
            const interval = setInterval(fetchAlerts, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.id]);

    // Fetch budgets on mount
    useEffect(() => {
        if (user?.id) {
            fetchBudgets();
        }
    }, [user?.id]);

    const fetchAlerts = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            setAlerts(data || []);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const fetchBudgets = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('budget_limits')
                .select('*')
                .eq('user_id', user.id);
            
            if (error) throw error;
            setBudgets(data || []);
        } catch (error) {
            console.error('Error fetching budgets:', error);
        }
    };

    const createAlert = async (type, title, message, severity = 'medium', category = null, data = null) => {
        if (!user?.id) return null;
        try {
            const { data: newAlert, error } = await supabase
                .from('alerts')
                .insert([{
                    user_id: user.id,
                    type,
                    title,
                    message,
                    severity,
                    category,
                    data
                }])
                .select()
                .single();
            
            if (error) throw error;
            setAlerts(prev => [newAlert, ...prev]);
            return newAlert;
        } catch (error) {
            console.error('Error creating alert:', error);
            return null;
        }
    };

    const markAlertAsRead = async (alertId) => {
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ read: true })
                .eq('id', alertId);
            
            if (error) throw error;
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
        } catch (error) {
            console.error('Error marking alert as read:', error);
        }
    };

    const clearAllAlerts = async () => {
        if (!user?.id) return;
        try {
            const { error } = await supabase
                .from('alerts')
                .delete()
                .eq('user_id', user.id);
            
            if (error) throw error;
            setAlerts([]);
        } catch (error) {
            console.error('Error clearing alerts:', error);
        }
    };

    const setBudgetLimit = async (category, monthlyLimit) => {
        if (!user?.id) return null;
        try {
            const { data: budget, error } = await supabase
                .from('budget_limits')
                .upsert([{
                    user_id: user.id,
                    category,
                    monthly_limit: parseFloat(monthlyLimit)
                }], { onConflict: 'user_id,category' })
                .select()
                .single();
            
            if (error) throw error;
            await fetchBudgets();
            return budget;
        } catch (error) {
            console.error('Error setting budget limit:', error);
            return null;
        }
    };

    const deleteBudgetLimit = async (category) => {
        if (!user?.id) return;
        try {
            const { error } = await supabase
                .from('budget_limits')
                .delete()
                .eq('user_id', user.id)
                .eq('category', category);
            
            if (error) throw error;
            await fetchBudgets();
        } catch (error) {
            console.error('Error deleting budget limit:', error);
        }
    };

    const unreadAlertCount = alerts.filter(a => !a.read).length;

    return (
        <AlertsContext.Provider value={{
            alerts,
            budgets,
            loading,
            createAlert,
            markAlertAsRead,
            clearAllAlerts,
            setBudgetLimit,
            deleteBudgetLimit,
            fetchAlerts,
            fetchBudgets,
            unreadAlertCount
        }}>
            {children}
        </AlertsContext.Provider>
    );
}

export function useAlerts() {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error('useAlerts must be used within AlertsProvider');
    }
    return context;
}
