import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Repeat, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SubscriptionDetailPage() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                // Fetch recurring expense item
                const { data: itemData, error: itemError } = await supabase
                    .from('recurring_expenses')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (itemError) throw itemError;
                setItem(itemData);

                // Fetch payment history (transactions linked to this item's name)
                const { data: historyData, error: historyError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('description', `Pagamento: ${itemData.name}`)
                    .order('date', { ascending: false });
                
                if (historyError) throw historyError;
                setPaymentHistory(historyData);

            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id]);

    if (loading) {
        return <div className="text-center p-12 dark:text-slate-400">Carregando detalhes...</div>;
    }

    if (!item) {
        return <div className="text-center p-12 dark:text-slate-400">Item não encontrado.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Link to="/subscriptions" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Assinaturas
            </Link>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-6">
                    <Repeat className="w-10 h-10 text-purple-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.name}</h1>
                        <p className={`text-lg font-semibold text-slate-600 dark:text-slate-300`}>
                            R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                        </p>
                    </div>
                </div>
                <div className="space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tipo:</span> <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{item.type === 'subscription' ? 'Assinatura' : 'Dívida'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Dia do Vencimento:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{item.payment_date}</span></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Histórico de Pagamentos</h2>
                <div className="space-y-3">
                    {paymentHistory.length > 0 ? (
                        paymentHistory.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Pagamento Efetuado</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(`${p.date}T00:00:00`), 'dd/MM/yyyy')}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum pagamento registrado para este item.</p>
                    )}
                </div>
            </div>
        </div>
    );
}