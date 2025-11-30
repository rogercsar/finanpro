import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2, Plus } from 'lucide-react';
import TransactionForm from './TransactionForm';

export default function TransactionList({ type }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', type)
                .order('date', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('transactions_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchTransactions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [type]);

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            fetchTransactions();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Erro ao excluir');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                    {type === 'income' ? 'Entradas' : 'Saídas'}
                </h2>
                <button
                    onClick={() => {
                        setEditingTransaction(null);
                        setIsFormOpen(true);
                    }}
                    className={`btn-primary ${type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova {type === 'income' ? 'Entrada' : 'Saída'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Data</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Descrição</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Categoria</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Valor</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Carregando...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Nenhuma transação encontrada.</td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600">
                                            {/* Fix timezone issue on display by adding T00:00:00 */}
                                            {format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{t.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingTransaction(t);
                                                        setIsFormOpen(true);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <TransactionForm
                    type={type}
                    initialData={editingTransaction}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={fetchTransactions}
                />
            )}
        </div>
    );
}
