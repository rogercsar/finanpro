import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { useNavigate } from 'react-router-dom';
import { analyzeFinances } from '../lib/financialAnalyzer';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Brain, ChevronRight } from 'lucide-react';
import BudgetManager from '../components/BudgetManager';
import CSVImporter from '../components/CSVImporter';

export default function Dashboard() {
    const { user } = useAuth();
    const { budgets } = useAlerts();
    const navigate = useNavigate();
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user?.id);

            if (error) throw error;

            // Calculate totals
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            const expense = transactions
                .filter(t => t.type === 'expense')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            setSummary({
                income,
                expense,
                balance: income - expense
            });

            // Prepare Chart Data (Last 6 months)
            const months = {};
            transactions.forEach(t => {
                const date = new Date(t.date);
                const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
                if (!months[key]) months[key] = { name: key, income: 0, expense: 0 };
                if (t.type === 'income') months[key].income += Number(t.amount);
                else months[key].expense += Number(t.amount);
            });
            setMonthlyData(Object.values(months).slice(-6));

            // Category Data
            const categories = {};
            transactions.filter(t => t.type === 'expense').forEach(t => {
                if (!categories[t.category]) categories[t.category] = 0;
                categories[t.category] += Number(t.amount);
            });
            setCategoryData(Object.entries(categories).map(([name, value]) => ({ name, value })));

            // Analyze with AI
            const { data: goalsData } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', user?.id);
            
            if (transactions.length > 0) {
                const analysisResult = analyzeFinances(transactions, goalsData || []);
                setAnalysis(analysisResult);
            }

        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="space-y-8 bg-blue-50 dark:bg-transparent p-6 rounded-xl">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Visão geral das suas finanças</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 dark:bg-green-900/30 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-green-100 text-green-600 rounded-xl shadow-sm">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Entradas</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 dark:bg-red-900/30 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-red-100 text-red-600 rounded-xl shadow-sm">
                            <TrendingDown className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Saídas</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-32 blur-3xl"></div>
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-100 font-medium uppercase tracking-wider">Saldo Atual</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                R$ {summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                        Fluxo de Caixa (Mensal)
                    </h3>
                    {monthlyData && monthlyData.length > 0 ? ( <div className="h-80"> 
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} barGap={8}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.2)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '0.5rem' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                />
                                <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>) : (<div className="h-80 flex items-center justify-center text-slate-400 dark:text-slate-500">Sem dados para exibir</div>)}
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                        Despesas por Categoria
                    </h3>
                    {categoryData && categoryData.length > 0 ? (<div className="h-80"> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '0.5rem' }} itemStyle={{ color: '#cbd5e1' }} labelStyle={{ color: '#f1f5f9' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center mt-4 max-h-20 overflow-y-auto">
                            {categoryData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>) : (<div className="h-80 flex items-center justify-center text-slate-400 dark:text-slate-500">Sem dados para exibir</div>)}
                </div>
            </div>

            {/* AI Advisor Widget */}
            {analysis && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8" />
                            <div>
                                <h3 className="font-bold text-lg">Assistente Financeira</h3>
                                <p className="text-blue-100 text-sm">Saúde Financeira: {analysis.healthScore}/100</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/advisor')}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                        >
                            Ver Mais <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        {analysis.insights.slice(0, 2).map((insight, idx) => (
                            <p key={idx} className="text-blue-50 text-sm">{insight}</p>
                        ))}
                    </div>

                    {analysis.recommendations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-blue-100 text-xs mb-2">Recomendações prioritárias:</p>
                            <p className="text-sm bg-white/10 p-2 rounded">💡 {analysis.recommendations[0].title}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Budget Manager and CSV Importer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BudgetManager budgets={budgets} />
                {/* O CSVImporter foi movido para a página de transações para uma melhor experiência do usuário */}
            </div>
        </div>
    );
}
