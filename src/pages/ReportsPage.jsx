import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Share2, Copy, Mail, MessageSquare, Smartphone, X } from 'lucide-react';
import { format, parse, lastDayOfMonth, startOfMonth } from 'date-fns';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend
} from 'recharts';

export default function ReportsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {                
                const monthDate = parse(filterDate, 'yyyy-MM', new Date());
                const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
                const endDate = format(lastDayOfMonth(monthDate), 'yyyy-MM-dd');

                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user?.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: true });

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

    const expenseByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {});

    const pieData = Object.entries(expenseByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const handleShare = async () => {
        setIsGeneratingLink(true);
        try {
            const token = `${user.id.substring(0, 4)}${Date.now()}`;
            const { error } = await supabase.from('shared_links').insert({
                user_id: user.id,
                item_type: 'report',
                item_id: filterDate, // YYYY-MM
                token: token
            });

            if (error) throw error;

            const url = `${window.location.origin}/share/report/${token}`;
            setShareUrl(url);
            setShareModalOpen(true);
        } catch (error) {
            console.error('Error creating share link:', error);
            alert('Erro ao criar link de compartilhamento.');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const balanceData = [{ name: 'Balanço', income: totalIncome, expense: totalExpense }];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Relatório Mensal</h2>
                <input
                    type="month"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Total Entradas</h3>
                    <div className="text-2xl font-bold text-green-600">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Total Saídas</h3>
                    <div className="text-2xl font-bold text-red-600">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                    <h3 className="text-sm font-semibold text-blue-100 mb-2">Saldo Real</h3>
                    <div className={`text-2xl font-bold ${ (totalIncome - totalExpense) >= 0 ? 'text-green-300' : 'text-red-300' }`}>R$ {(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Despesas por Categoria</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} labelLine={false}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '0.5rem' }} itemStyle={{ color: '#cbd5e1' }} labelStyle={{ color: '#f1f5f9' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-4">
                        {pieData.slice(0, 5).map((entry, index) => (
                            <div key={index} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Entradas vs. Saídas</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balanceData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} cursor={{ fill: '#f8fafc' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[0, 8, 8, 0]} barSize={40} />
                                <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[0, 8, 8, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Detalhamento do Mês</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handleShare} disabled={isGeneratingLink} className="btn-ghost flex items-center gap-2 disabled:opacity-50">
                            <Share2 className="w-4 h-4" />
                            {isGeneratingLink ? 'Gerando...' : 'Compartilhar'}
                        </button>
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
                    </div>
                </div>
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="w-full text-left text-sm"> 
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Data</th>
                                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Tipo</th>
                                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Categoria</th>
                                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Descrição</th>
                                <th className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}</td>
                                    <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'income' ? 'Entrada' : 'Saída'}</span></td>
                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{t.category}</td>
                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{t.description || '-'}</td>
                                    <td className={`px-6 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((t) => (
                        <div key={t.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description || t.category}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}</p>
                                </div>
                                <p className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.category}</span> 
                            </div>
                        </div>
                    ))}
                </div>
                {/* Loading and Empty States */}
                {loading && <div className="text-center p-8 text-slate-500 dark:text-slate-400">Carregando...</div>}
                {!loading && transactions.length === 0 && <div className="text-center p-8 text-slate-500 dark:text-slate-400">Nenhuma transação neste mês.</div>}
            </div>

            {/* Share Modal */}
            {shareModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShareModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Compartilhar Relatório</h3>
                            <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <a href={`https://wa.me/?text=Confira%20meu%20relatório%20financeiro%20do%20FinanIA:%20${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="share-button bg-green-50 hover:bg-green-100 text-green-700">
                                <MessageSquare className="w-6 h-6" /> WhatsApp
                            </a>
                            <a href={`mailto:?subject=Relatório Financeiro&body=Confira meu relatório financeiro do FinanIA: ${encodeURIComponent(shareUrl)}`} className="share-button bg-blue-50 hover:bg-blue-100 text-blue-700">
                                <Mail className="w-6 h-6" /> E-mail
                            </a>
                            <a href={`sms:?&body=Confira%20meu%20relatório%20financeiro%20do%20FinanIA:%20${encodeURIComponent(shareUrl)}`} className="share-button bg-sky-50 hover:bg-sky-100 text-sky-700">
                                <Smartphone className="w-6 h-6" /> SMS
                            </a>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(shareUrl);
                                    alert('Link copiado!');
                                }}
                                className="share-button bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                                <Copy className="w-6 h-6" /> Copiar Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
