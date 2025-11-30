import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionDetailPage() {
    const { id } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactionDetails = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setTransaction(data);

                if (data?.goal_id) {
                    const { data: goalData } = await supabase
                        .from('goals')
                        .select('id, name')
                        .eq('id', data.goal_id)
                        .single();
                    setGoal(goalData);
                }
            } catch (error) {
                console.error('Error fetching transaction details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactionDetails();
    }, [id]);

    if (loading) {
        return <div className="text-center p-12 dark:text-slate-400">Carregando detalhes da transação...</div>;
    }

    if (!transaction) {
        return <div className="text-center p-12 dark:text-slate-400">Transação não encontrada.</div>;
    }

    const isIncome = transaction?.type === 'income';

    return (
        <div className="space-y-6">
            <Link to={isIncome ? "/income" : "/expenses"} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <ArrowLeft className="w-4 h-4" />
                Voltar para {isIncome ? 'Entradas' : 'Saídas'}
            </Link>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-6">
                    {isIncome ? <TrendingUp className="w-10 h-10 text-green-500" /> : <TrendingDown className="w-10 h-10 text-red-500" />}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{transaction.description || 'Transação'}</h1>
                        <p className={`text-lg font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="space-y-3 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Data:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{format(new Date(`${transaction.date}T00:00:00`), 'dd/MM/yyyy')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Categoria:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{transaction.category}</span></div>
                    {goal && (
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400">Meta Associada:</span>
                            <Link to={`/goals/${goal.id}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                                <Target className="w-4 h-4" /> {goal.name}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}