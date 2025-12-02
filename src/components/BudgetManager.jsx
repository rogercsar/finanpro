import { useState, useEffect } from 'react';
import { useAlerts } from '../context/AlertsContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Lightbulb, Check } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

export default function BudgetManager({ budgets = [] }) {
    const { user } = useAuth();
    const { setBudgetLimit, deleteBudgetLimit } = useAlerts();
    const { activeProfile } = useProfile();
    const [newCategory, setNewCategory] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    const categories = [
        'Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde',
        'Educação', 'Salário', 'Freelance', 'Investimentos', 'Outros'
    ];

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!user || !activeProfile) return;
            try {
                const { data, error } = await supabase.rpc('suggest_budgets', { p_user_id: user.id, p_profile_id: activeProfile.id });
                if (error) throw error;
                setSuggestions(data || []);
            } catch (error) {
                console.error('Error fetching budget suggestions:', error);
            }
        };

        fetchSuggestions();
    }, [user, budgets, activeProfile]); // Recarrega sugestões quando os orçamentos ou perfil mudam

    const handleAddBudget = async () => {
        if (!newCategory || !newLimit || parseFloat(newLimit) <= 0) {
            alert('Informe categoria e limite válidos');
            return;
        }
        setLoading(true);
        try {
            await setBudgetLimit(newCategory, parseFloat(newLimit));
            setNewCategory('');
            setNewLimit('');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBudget = async (category) => {
        if (confirm(`Remover limite de R$ para ${category}?`)) {
            await deleteBudgetLimit(category);
        }
    };

    const handleAcceptSuggestion = async (category, limit) => {
        await setBudgetLimit(category, limit);
        // Remove a sugestão da lista após ser aceita
        setSuggestions(prev => prev.filter(s => s.category !== category));
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-4">💰 Limites de Orçamento</h3>

            {/* Budget Suggestions */}
            {suggestions.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Sugestões da IA</p>
                    {suggestions.slice(0, 2).map(s => (
                        <div key={s.category} className="flex items-center justify-between text-sm mb-1 p-2 bg-white/50 dark:bg-slate-800/30 rounded">
                            <span>{s.category}: <span className="font-semibold">R$ {s.suggested_limit.toLocaleString('pt-BR')}</span></span>
                            <button onClick={() => handleAcceptSuggestion(s.category, s.suggested_limit)} className="btn-ghost text-blue-600 text-xs p-1 flex items-center gap-1"><Check className="w-3 h-3"/> Aceitar</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add new budget */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Adicionar novo limite</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="sm:flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                    >
                        <option value="">Selecione categoria</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Limite (R$)"
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="sm:w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                    />
                    <button
                        onClick={handleAddBudget}
                        disabled={loading}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Budget list */}
            <div className="space-y-2">
                {budgets.length === 0 ? (
                    <p className="text-sm text-slate-600 py-2">Nenhum limite configurado</p>
                ) : (
                    budgets.map(budget => (
                        <div key={budget.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900">{budget.category}</p>
                                <p className="text-sm text-slate-600">R$ {parseFloat(budget.monthly_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
                            </div>
                            <button
                                onClick={() => handleDeleteBudget(budget.category)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover limite"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
