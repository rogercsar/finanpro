import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../components/CurrencyContext';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';
import TransactionList from '../components/TransactionList'; // Reutilizando o componente

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export default function ReportsPage() {
    const { user } = useAuth();
    const { baseCurrency, exchangeRates } = useCurrency();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados dos filtros
    const [filters, setFilters] = useState({
        month: currentMonth,
        year: currentYear,
        currency: 'all',
        category: 'all',
    });

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error);
            } else {
                setTransactions(data);
            }
            setLoading(false);
        };

        if (user) fetchTransactions();
    }, [user]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const date = new Date(`${t.date}T00:00:00`);
            const monthMatch = date.getMonth() + 1 === Number(filters.month);
            const yearMatch = date.getFullYear() === Number(filters.year);
            const currencyMatch = filters.currency === 'all' || t.currency === filters.currency;
            const categoryMatch = filters.category === 'all' || t.category === filters.category;
            return monthMatch && yearMatch && currencyMatch && categoryMatch;
        });
    }, [transactions, filters]);

    const reportData = useMemo(() => {
        const getRate = (currency) => currency === baseCurrency ? 1 : (exchangeRates[currency] || 1);

        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (Number(t.amount) * getRate(t.currency)), 0);

        const expense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (Number(t.amount) * getRate(t.currency)), 0);

        const categoryData = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const convertedAmount = Number(t.amount) * getRate(t.currency);
                acc[t.category] = (acc[t.category] || 0) + convertedAmount;
                return acc;
            }, {});

        return {
            totalIncome: income,
            totalExpense: expense,
            balance: income - expense,
            categoryChartData: Object.entries(categoryData).map(([name, value]) => ({ name, value })),
        };
    }, [filteredTransactions, baseCurrency, exchangeRates]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const uniqueCategories = useMemo(() => [...new Set(transactions.map(t => t.category))], [transactions]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Relatórios Detalhados</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Filtre e analise suas transações.</p>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200">
                        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>)}
                    </select>
                    <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200">
                        {Array.from({ length: 5 }, (_, i) => <option key={i} value={currentYear - i}>{currentYear - i}</option>)}
                    </select>
                    <select name="currency" value={filters.currency} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200">
                        <option value="all">Todas as Moedas</option>
                        <option value="BRL">Real (BRL)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                    </select>
                    <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200">
                        <option value="all">Todas as Categorias</option>
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="summary-card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30">
                    <p>Total de Entradas</p>
                    <h3 className="font-bold text-2xl text-green-700 dark:text-green-400">{reportData.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: baseCurrency })}</h3>
                </div>
                <div className="summary-card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30">
                    <p>Total de Saídas</p>
                    <h3 className="font-bold text-2xl text-red-700 dark:text-red-400">{reportData.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: baseCurrency })}</h3>
                </div>
                <div className="summary-card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30">
                    <p>Saldo do Período</p>
                    <h3 className={`font-bold text-2xl ${reportData.balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>{reportData.balance.toLocaleString('pt-BR', { style: 'currency', currency: baseCurrency })}</h3>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Despesas por Categoria</h3>
                    {reportData.categoryChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={reportData.categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} labelLine={false}>
                                    {reportData.categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: baseCurrency })} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-[300px] flex items-center justify-center text-slate-400">Sem despesas no período.</div>}
                </div>

                <div className="lg:col-span-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Transações do Período</h4>
                    {loading ? <p>Carregando...</p> : <TransactionList transactions={filteredTransactions} onEdit={() => {}} onDelete={() => {}} />}
                </div>
            </div>
        </div>
    );
}
