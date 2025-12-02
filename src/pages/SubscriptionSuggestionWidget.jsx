import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BellRing, Plus, X } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

export default function SubscriptionSuggestionWidget() {
    const { user } = useAuth();
    const { activeProfile } = useProfile();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSuggestions = useCallback(async () => {
        if (!user || !activeProfile) return;
        setLoading(true);

        try {
            // 1. Chama a função de detecção no backend
            const { data: detected, error: rpcError } = await supabase.rpc('detect_recurring_transactions', { p_user_id: user.id, p_profile_id: activeProfile.id });
            if (rpcError) throw rpcError;

            if (detected && detected.length > 0) {
                // 2. Tenta inserir as novas sugestões. O 'upsert' com 'ignoreDuplicates'
                // garante que não teremos sugestões repetidas.
                const suggestionsToInsert = detected.map(d => ({
                    user_id: user.id,
                    profile_id: activeProfile.id,
                    description: d.description,
                    amount: d.amount,
                    currency: d.currency,
                    transaction_count: d.transaction_count,
                    last_transaction_date: d.last_transaction_date,
                }));

                await supabase.from('suggested_subscriptions').upsert(suggestionsToInsert, {
                    onConflict: 'user_id, profile_id, description, amount, currency',
                    ignoreDuplicates: true,
                });
            }

            // 3. Busca todas as sugestões com status 'suggested' para exibir
            const { data: activeSuggestions, error: selectError } = await supabase
                .from('suggested_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('profile_id', activeProfile.id)
                .eq('status', 'suggested');

            if (selectError) throw selectError;

            setSuggestions(activeSuggestions);

        } catch (error) {
            console.error('Error handling subscription suggestions:', error);
        } finally {
            setLoading(false);
        }
    }, [user, activeProfile]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const handleDismiss = async (suggestionId) => {
        await supabase
            .from('suggested_subscriptions')
            .update({ status: 'dismissed' })
            .eq('id', suggestionId);
        
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    };

    const handleAdd = async (suggestion) => {
        // Lógica para adicionar a assinatura (pode abrir um modal pré-preenchido)
        // Por agora, vamos apenas marcar como 'aceita'
        await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                profile_id: activeProfile.id,
                name: suggestion.description,
                amount: suggestion.amount,
                currency: suggestion.currency,
                billing_cycle: 'monthly', // Default
                next_payment_date: new Date().toISOString().split('T')[0],
            });

        await supabase
            .from('suggested_subscriptions')
            .update({ status: 'accepted' })
            .eq('id', suggestion.id);

        alert(`Assinatura "${suggestion.description}" adicionada com sucesso!`);
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    };

    if (loading || suggestions.length === 0) {
        return null; // Não mostra nada se estiver carregando ou se não houver sugestões
    }

    return (
        <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/30 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-500" />
                Sugestões de Assinaturas
            </h4>
            {suggestions.map(s => (
                <div key={s.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg flex justify-between items-center text-sm">
                    <p className="text-slate-700 dark:text-slate-300">Pagamento recorrente para <strong className="capitalize">{s.description}</strong> detectado.</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleAdd(s)} className="btn-ghost text-blue-600 dark:text-blue-400 text-xs p-2 flex items-center gap-1"><Plus className="w-4 h-4"/> Adicionar</button>
                        <button onClick={() => handleDismiss(s.id)} className="btn-ghost text-slate-400 dark:text-slate-500 p-2"><X className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
        </div>
    );
}