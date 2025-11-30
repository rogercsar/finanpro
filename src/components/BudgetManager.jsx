import { useState } from 'react';
import { useAlerts } from '../context/AlertsContext';
import { Trash2, Plus } from 'lucide-react';

export default function BudgetManager({ budgets = [] }) {
    const { setBudgetLimit, deleteBudgetLimit } = useAlerts();
    const [newCategory, setNewCategory] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [loading, setLoading] = useState(false);

    const categories = [
        'Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde',
        'Educação', 'Salário', 'Freelance', 'Investimentos', 'Outros'
    ];

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

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-4">💰 Limites de Orçamento</h3>

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
