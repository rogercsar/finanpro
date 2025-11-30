import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Target, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function GoalDetailPage() {
    const { id } = useParams();
    const [goal, setGoal] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGoalDetails = async () => {
            setLoading(true);
            try {
                // Fetch goal
                const { data: goalData, error: goalError } = await supabase
                    .from('goals')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (goalError) throw goalError;
                setGoal(goalData);

                // Fetch associated transactions
                const { data: transData, error: transError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('goal_id', id)
                    .order('date', { ascending: false });
                if (transError) throw transError;
                setTransactions(transData);

            } catch (error) {
                console.error('Error fetching goal details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGoalDetails();
    }, [id]);

    if (loading) {
        return <div className="text-center p-12 dark:text-slate-400">Carregando detalhes da meta...</div>;
    }

    if (!goal) {
        return <div className="text-center p-12 dark:text-slate-400">Meta não encontrada.</div>;
    }

    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);

    return (
        <div className="space-y-6">
            <Link to="/goals" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Metas
            </Link>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-4">
                    <Target className="w-10 h-10 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{goal.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{goal.description}</p>
                    </div>
                </div>

                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                    <span>R$ {goal.current_amount.toLocaleString('pt-BR')}</span>
                    <span>R$ {goal.target_amount.toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Histórico de Transações</h2>
                <div className="space-y-3">
                    {transactions.length > 0 ? (
                        transactions.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{t.description || t.category}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}</p>
                                </div>
                                <div className={`flex items-center gap-2 font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    R$ {t.amount.toLocaleString('pt-BR')}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma transação associada a esta meta ainda.</p>
                    )}
                </div>
            </div>
        </div>
    );
}