import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Repeat, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import SubscriptionForm from '../components/SubscriptionForm'; // Importar o formulário

const currencySymbols = {
  BRL: 'R$',
  USD: 'U$',
  EUR: '€',
};

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);

  const fetchSubscriptions = async () => {
      if (!activeProfile) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id) // FILTRO DE PERFIL
          .order('name', { ascending: true });

        if (error) throw error;
        setSubscriptions(data || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchSubscriptions();
  }, [user, activeProfile]);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta assinatura?')) return;
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
      setSubscriptions(subs => subs.filter(s => s.id !== id));
      alert('Assinatura excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Erro ao excluir assinatura.');
    }
  };

  const handlePay = async (subscription) => {
    if (!confirm(`Registrar pagamento de ${subscription.name} e agendar próximo vencimento?`)) return;

    try {
      // 1. Registrar a saída
      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: user.id,
        profile_id: activeProfile.id,
        type: 'expense',
        amount: subscription.amount,
        category: 'Assinaturas',
        description: `Pagamento: ${subscription.name}`,
        date: new Date().toISOString().split('T')[0],
        currency: subscription.currency,
      });
      if (transactionError) throw transactionError;

      // 2. Atualizar a data da assinatura
      const currentDate = new Date(subscription.next_payment_date + 'T00:00:00');
      const nextDate = subscription.billing_cycle === 'monthly' ? addMonths(currentDate, 1) : addYears(currentDate, 1);
      
      const { error: subscriptionError } = await supabase.from('subscriptions').update({ next_payment_date: nextDate.toISOString().split('T')[0] }).eq('id', subscription.id);
      if (subscriptionError) throw subscriptionError;

      alert('Pagamento registrado e data atualizada!');
      fetchSubscriptions(); // Recarrega a lista
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Erro ao processar pagamento: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Carregando assinaturas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Minhas Assinaturas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie seus pagamentos recorrentes.</p>
        </div>
        <button
          onClick={() => {
            setEditingSubscription(null);
            setIsFormOpen(true);
          }}
          className="w-full sm:w-auto btn-primary bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Assinatura
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Nenhuma assinatura encontrada para este perfil.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map(sub => (
            <div key={sub.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 dark:text-slate-200 capitalize">{sub.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sub.status === 'active' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {sub.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 my-4">
                {currencySymbols[sub.currency] || 'R$'} {Number(sub.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / {sub.billing_cycle === 'monthly' ? 'mês' : 'ano'}</span>
              </p>
              {sub.next_payment_date && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Próximo pagamento em: {format(new Date(`${sub.next_payment_date}T00:00:00`), 'dd/MM/yyyy')}
                </p>
              )}
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePay(sub)}
                    disabled={!sub.next_payment_date}
                    className="flex-1 btn-primary bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-sm"
                    title="Pagar e registrar saída"
                  >
                    <DollarSign className="w-4 h-4 mr-1" /> Pagar
                  </button>
                  <button onClick={() => { setEditingSubscription(sub); setIsFormOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(sub.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <SubscriptionForm
          initialData={editingSubscription}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchSubscriptions();
          }}
        />
      )}
    </div>
  );
}
