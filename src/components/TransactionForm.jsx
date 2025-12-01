import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import { useCurrency } from './CurrencyContext';

export default function TransactionForm({ type, onClose, onSuccess, initialData = null }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const { baseCurrency } = useCurrency();
    const [goals, setGoals] = useState([]);
    const [formData, setFormData] = useState({
        amount: initialData?.amount || '',
        category: initialData?.category || '',
        description: initialData?.description || '',
        // Correctly handle timezone by creating a date string in the local timezone
        // and then taking only the date part. Avoids UTC conversion issues.
        date: initialData?.date || new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
        goal_id: initialData?.goal_id || '',
        currency: initialData?.currency || baseCurrency,
    });

    const categories = type === 'income'
        ? ['Salário', 'Freelance', 'Investimentos', 'Outros']
        : ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'];

    useEffect(() => {
        const fetchGoals = async () => {
            const { data } = await supabase
                .from('goals')
                .select('id, name, status')
                .eq('user_id', user?.id)
                .eq('status', 'active')
                .order('name');
            
            setGoals(data || []);
        };

        if (user) fetchGoals();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Ensure the date is treated as a string in YYYY-MM-DD format without timezone conversion.
            // The value from the input[type=date] is already in this format.
            const dateString = formData.date;
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));

            const dataToSave = {
                user_id: user.id,
                type,
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description,
                date: utcDate.toISOString().split('T')[0],
                goal_id: formData.goal_id || null,
                currency: formData.currency,
            };

            let error;
            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update(dataToSave)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('Erro ao salvar transação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {initialData ? 'Editar' : 'Nova'} {type === 'income' ? 'Entrada' : 'Saída'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 col-span-2"
                            placeholder="0,00"
                        />
                        <select
                            required
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                        >
                            <option value="BRL">R$</option>
                            <option value="USD">U$</option>
                            <option value="EUR">€</option>
                        </select>
                    </div>

                    <div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                        >
                            <option value="">Selecione...</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                            placeholder="Opcional"
                        />
                    </div>

                    {goals.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Associar a uma Meta
                            </label>
                            <select
                                value={formData.goal_id}
                                onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                            >
                                <option value="">Nenhuma meta</option>
                                {goals.map(goal => (
                                    <option key={goal.id} value={goal.id}>{goal.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn-primary flex-1 ${type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
