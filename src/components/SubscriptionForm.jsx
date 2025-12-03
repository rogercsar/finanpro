import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { X } from 'lucide-react';

export default function SubscriptionForm({ onClose, onSuccess, initialData = null }) {
    const { user } = useAuth();
    const { activeProfile } = useProfile();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: initialData?.name || '',
        amount: initialData?.amount || '',
        currency: initialData?.currency || 'BRL',
        billing_cycle: initialData?.billing_cycle || 'monthly',
        next_payment_date: initialData?.next_payment_date || '',
        status: initialData?.status || 'active',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                ...form,
                user_id: user.id,
                profile_id: activeProfile.id,
                amount: parseFloat(form.amount),
            };

            let error;
            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update(dataToSave)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('subscriptions')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving subscription:', error);
            alert('Erro ao salvar assinatura: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {initialData ? 'Editar' : 'Nova'} Assinatura
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
                        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                            <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moeda</label>
                            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200">
                                <option value="BRL">BRL (R$)</option>
                                <option value="USD">USD (U$)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200">
                            <option value="active">Ativa</option>
                            <option value="paused">Pausada</option>
                            <option value="canceled">Cancelada</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ciclo</label>
                            <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200">
                                <option value="monthly">Mensal</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Próximo Pagamento</label>
                            <input type="date" value={form.next_payment_date} onChange={e => setForm({ ...form, next_payment_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-slate-200" />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
