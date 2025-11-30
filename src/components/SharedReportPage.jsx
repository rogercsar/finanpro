import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function SharedReportPage() {
    const { token } = useParams();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSharedReport = async () => {
            try {
                // 1. Find the shared link by token
                const { data: linkData, error: linkError } = await supabase
                    .from('shared_links')
                    .select('*')
                    .eq('token', token)
                    .single();

                if (linkError || !linkData) throw new Error('Link de compartilhamento inválido ou expirado.');

                // 2. Fetch the report data based on the link info
                if (linkData.item_type === 'report') {
                    const monthDate = parse(linkData.item_id, 'yyyy-MM', new Date());
                    const { data: transactions, error: transError } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('user_id', linkData.user_id)
                        .gte('date', `${linkData.item_id}-01`)
                        .lte('date', format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd'));

                    if (transError) throw transError;
                    
                    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
                    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                    
                    const expenseByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                    }, {});

                    setReportData({
                        month: format(monthDate, 'MMMM \'de\' yyyy', { locale: ptBR }),
                        totalIncome,
                        totalExpense,
                        balance: totalIncome - totalExpense,
                        pieData: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
                    });
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedReport();
    }, [token]);

    if (loading) return <div className="text-center p-12">Carregando relatório...</div>;
    if (error) return <div className="text-center p-12 text-red-500">{error}</div>;
    if (!reportData) return <div className="text-center p-12">Nenhum dado para exibir.</div>;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-2xl font-bold text-slate-800">Relatório Financeiro Compartilhado</h1>
                <p className="text-slate-500 mb-6">Referente a {reportData.month}</p>

                <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                    <div>
                        <p className="text-sm text-slate-500">Entradas</p>
                        <p className="text-xl font-bold text-green-600">R$ {reportData.totalIncome.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Saídas</p>
                        <p className="text-xl font-bold text-red-600">R$ {reportData.totalExpense.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Saldo</p>
                        <p className="text-xl font-bold text-blue-600">R$ {reportData.balance.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">Despesas por Categoria</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={reportData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {reportData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-slate-400 mt-8">Gerado por FinanIA</p>
            </div>
        </div>
    );
}