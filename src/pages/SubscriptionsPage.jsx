import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Repeat, Plus, Pencil, Trash2, Check } from 'lucide-react';

export default function SubscriptionsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        name: '',
        type: 'subscription',
        amount: '',
        payment_date: '',
        last_paid_month: null,
    });

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('recurring_expenses')
                .select('*')
                .eq('user_id', user?.id)
                .order('amount', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching recurring expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchItems();
    }, [user]);

    const resetForm = () => {
        setForm({ name: '', type: 'subscription', amount: '', payment_date: '', last_paid_month: null });
        setEditingItem(null);
        setIsFormOpen(false);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            type: item.type,
            amount: item.amount,
            payment_date: item.payment_date,
            last_paid_month: item.last_paid_month,
        });
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = {
                user_id: user.id,
                name: form.name,
                type: form.type,
                amount: parseFloat(form.amount),
                payment_date: parseInt(form.payment_date),
            };

            if (editingItem?.id) {
                await supabase.from('recurring_expenses').update(dataToSave).eq('id', editingItem.id);
            } else {
                await supabase.from('recurring_expenses').insert([dataToSave]);
            }
            fetchItems();
            resetForm();
        } catch (error) {
            console.error('Error saving item:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        await supabase.from('recurring_expenses').delete().eq('id', id);
        fetchItems();
    };

    const handleMarkAsPaid = async (item) => {
        if (!confirm(`Confirma o pagamento de "${item.name}" no valor de R$ ${item.amount}? Uma nova transação de saída será criada.`)) return;
        
        setLoading(true);
        try {
            // 1. Create the expense transaction
            const { error: transactionError } = await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'expense',
                amount: item.amount,
                category: item.type === 'subscription' ? 'Assinaturas' : 'Dívidas',
                description: `Pagamento: ${item.name}`,
                date: new Date().toISOString().split('T')[0],
            });

            if (transactionError) throw transactionError;

            // 2. Update the recurring expense item with the last paid month
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const { error: updateError } = await supabase
                .from('recurring_expenses')
                .update({ last_paid_month: firstDayOfMonth.toISOString().split('T')[0] })
                .eq('id', item.id);

            if (updateError) throw updateError;

            fetchItems(); // Refresh the list
        } catch (error) {
            console.error('Error marking as paid:', error);
            alert('Erro ao marcar como pago: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalMonthlyCost = items.reduce((acc, item) => acc + parseFloat(item.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center sm:text-left">Assinaturas e Dívidas</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center sm:text-left">Gerencie suas despesas recorrentes.</p>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Novo Item
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Custo Mensal Total</h3>
                <p className="text-3xl font-bold text-blue-600">R$ {totalMonthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <p className="text-center text-slate-500 dark:text-slate-400">Carregando...</p>
                ) : items.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma assinatura ou dívida cadastrada.</p>
                ) : (
                    items.map(item => {
                        const today = new Date();
                        const lastPaid = item.last_paid_month ? new Date(item.last_paid_month) : null;
                        const isPaidThisMonth = lastPaid && lastPaid.getUTCMonth() === today.getUTCMonth() && lastPaid.getUTCFullYear() === today.getUTCFullYear();

                        return (
                        <Link to={`/subscriptions/${item.id}`} key={item.id} className="block bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.type === 'subscription' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.type === 'subscription' ? 'Assinatura' : 'Dívida'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Vence todo dia {item.payment_date}</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <p className="font-bold text-lg text-slate-900 dark:text-slate-100">R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    {isPaidThisMonth ? (
                                        <div className="flex items-center gap-1 text-green-600 text-sm font-semibold py-2 px-3 bg-green-100 rounded-lg">
                                            <Check className="w-4 h-4" />
                                            Pago
                                        </div>
                                    ) : (
                                        <button onClick={(e) => { e.preventDefault(); handleMarkAsPaid(item); }} disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700 text-sm disabled:opacity-50">
                                            {loading ? 'Processando...' : 'Pagar e Registrar Saída'}
                                        </button>
                                    )}
                                    <div className="flex gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                        <button onClick={(e) => { e.preventDefault(); handleEdit(item); }} className="p-2 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.preventDefault(); handleDelete(item.id); }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        )
                    })
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{editingItem ? 'Editar' : 'Novo'} Item</h3>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
                                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full input-form dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full input-form dark:bg-slate-800 dark:border-slate-700">
                                    <option value="subscription">Assinatura</option>
                                    <option value="debt">Dívida</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Mensal (R$)</label>
                                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="w-full input-form dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia do Pagamento</label>
                                <input type="number" min="1" max="31" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} required className="w-full input-form dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={resetForm} className="btn-ghost flex-1">Cancelar</button>
                                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}