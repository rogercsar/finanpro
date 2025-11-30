import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, parse, lastDayOfMonth } from 'date-fns';

export default function ReportsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                console.log('Fetching report for user:', user?.id);
                const startOfMonth = `${filterDate}-01`;
                
                // Get the actual last day of the month
                const monthDate = parse(`${filterDate}-01`, 'yyyy-MM-dd', new Date());
                const lastDay = lastDayOfMonth(monthDate);
                const endOfMonth = format(lastDay, 'yyyy-MM-dd');

                // First, let's check if there are ANY transactions
                const { data: allTrans, error: allError } = await supabase
                    .from('transactions')
                    .select('*');
                console.log('All transactions in DB:', allTrans, 'Error:', allError);

                // Now filter by user
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user?.id)
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
                    .order('date', { ascending: true });

                console.log('User transactions:', data, 'Error:', error);
                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error('Error fetching report:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchReport();
    }, [filterDate, user]);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Relatório Mensal</h2>
                <input
                    type="month"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Entradas</h3>
                    <div className="text-2xl font-bold text-green-600">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Saídas</h3>
                    <div className="text-2xl font-bold text-red-600">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-sm text-white">
                    <h3 className="text-sm font-semibold text-blue-100 mb-2">Saldo Real</h3>
                    <div className={`text-2xl font-bold ${ (totalIncome - totalExpense) >= 0 ? 'text-green-300' : 'text-red-300' }`}>R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">Detalhamento</h3>
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost" onClick={() => {
                            // generate CSV
                            const header = ['Data','Tipo','Categoria','Descrição','Valor'];
                            const rows = transactions.map(t => [format(new Date(t.date), 'dd/MM/yyyy'), t.type, t.category, (t.description || ''), Number(t.amount).toFixed(2)]);
                            const csv = [header, ...rows].map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `relatorio-${filterDate}.csv`;
                            a.click();
                        }}>Exportar CSV</button>
                        <button onClick={() => setFilterDate(new Date().toISOString().slice(0,7))} className="btn-ghost">Hoje</button>
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-700">Data</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Tipo</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Categoria</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Descrição</th>
                            <th className="px-6 py-3 font-semibold text-slate-700 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-slate-600">{format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {t.type === 'income' ? 'Entrada' : 'Saída'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-600">{t.category}</td>
                                <td className="px-6 py-3 text-slate-600">{t.description}</td>
                                <td className={`px-6 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    R$ {Number(t.amount).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
