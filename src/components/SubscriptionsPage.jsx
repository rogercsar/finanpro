import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Repeat, Plus } from 'lucide-react';
import { format } from 'date-fns';
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

  useEffect(() => {
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

    fetchSubscriptions();
  }, [user, activeProfile]);

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
          // onClick={() => setIsFormOpen(true)} // Adicionar lógica de formulário no futuro
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
            <div key={sub.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 dark:text-slate-200 capitalize">{sub.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Correção na Página de Conquistas (`AchievementsPage.jsx`)

As conquistas devem ser específicas para cada perfil. Para isso, precisamos adicionar o filtro de perfil ao buscar as conquistas desbloqueadas.

```diff