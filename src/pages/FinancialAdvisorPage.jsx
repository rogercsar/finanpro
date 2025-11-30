import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { analyzeFinances } from '../lib/financialAnalyzer';
import { 
    TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target, 
    Activity, Zap, Brain, BarChart3, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function FinancialAdvisorPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        summary: true,
        recommendations: true,
        patterns: false,
        anomalies: false,
        forecast: false
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch transactions from last 6 months
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const [{ data: transData }, { data: goalsData }] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user?.id)
                    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
                    .order('date', { ascending: false }),
                supabase
                    .from('goals')
                    .select('*')
                    .eq('user_id', user?.id)
            ]);

            setTransactions(transData || []);
            setGoals(goalsData || []);

            // Analyze
            if (transData && transData.length > 0) {
                const analysisResult = analyzeFinances(transData, goalsData || []);
                setAnalysis(analysisResult);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
                    <p className="text-slate-600">Analisando seus dados financeiros...</p>
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-slate-600">Adicione transações para que eu possa analisar seus padrões financeiros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Brain className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Assistente Financeira</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Análise inteligente de seus padrões financeiros e recomendações personalizadas</p>
                </div>
            </div>

            {/* Health Score */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 mb-2">Sua Saúde Financeira</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold">{analysis.healthScore}</span>
                            <span className="text-xl">/100</span>
                        </div>
                    </div>
                    <Activity className="w-20 h-20 opacity-30" />
                </div>
                <div className="mt-4 w-full bg-blue-500 rounded-full h-2">
                    <div 
                        className="bg-white rounded-full h-2 transition-all duration-500"
                        style={{ width: `${analysis.healthScore}%` }}
                    />
                </div>
            </div>

            {/* Insights */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Insights
                </h2>
                <div className="space-y-3">
                    {analysis.insights.map((insight, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 text-sm">
                            {insight}
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <SectionCard 
                title="Resumo Financeiro"
                icon={<BarChart3 className="w-5 h-5" />}
                section="summary"
                expanded={expandedSections.summary}
                onToggle={toggleSection}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                        label="Renda Total"
                        value={`R$ ${analysis.summary.totalIncome.toFixed(2)}`}
                        trend="up"
                        color="green"
                    />
                    <StatCard 
                        label="Despesas"
                        value={`R$ ${analysis.summary.totalExpenses.toFixed(2)}`}
                        trend="down"
                        color="red"
                    />
                    <StatCard 
                        label="Saldo"
                        value={`R$ ${analysis.summary.balance.toFixed(2)}`}
                        trend={analysis.summary.balance >= 0 ? "up" : "down"}
                        color={analysis.summary.balance >= 0 ? "green" : "red"}
                    />
                    <StatCard 
                        label="Taxa Poupança"
                        value={`${analysis.summary.savingsRate}%`}
                        color="blue"
                    />
                </div>
            </SectionCard>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
                <SectionCard 
                    title="Recomendações"
                    icon={<Zap className="w-5 h-5" />}
                    section="recommendations"
                    expanded={expandedSections.recommendations}
                    onToggle={toggleSection}
                    badgeCount={analysis.recommendations.length}
                >
                    <div className="space-y-4">
                        {analysis.recommendations.map((rec, idx) => (
                            <RecommendationCard key={idx} recommendation={rec} />
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Anomalies */}
            {analysis.anomalies.length > 0 && (
                <SectionCard 
                    title="Gastos Anormais"
                    icon={<AlertCircle className="w-5 h-5" />}
                    section="anomalies"
                    expanded={expandedSections.anomalies}
                    onToggle={toggleSection}
                    badgeCount={analysis.anomalies.length}
                    badgeColor="red"
                >
                    <div className="space-y-3">
                        {analysis.anomalies.slice(0, 5).map((anomaly, idx) => (
                            <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-red-900">{anomaly.transaction}</p>
                                        <p className="text-sm text-red-700 mt-1">{anomaly.reason}</p>
                                        <p className="text-xs text-red-600 mt-2">{anomaly.date}</p>
                                    </div>
                                    <span className="text-lg font-bold text-red-600">
                                        R$ {anomaly.amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Category Patterns */}
            {Object.keys(analysis.patterns).length > 0 && (
                <SectionCard 
                    title="Padrões de Gastos"
                    icon={<TrendingDown className="w-5 h-5" />}
                    section="patterns"
                    expanded={expandedSections.patterns}
                    onToggle={toggleSection}
                >
                    <div className="space-y-4">
                        {Object.entries(analysis.patterns)
                            .sort(([,a], [,b]) => b.average - a.average)
                            .map(([category, pattern]) => (
                                <PatternCard key={category} category={category} pattern={pattern} />
                            ))}
                    </div>
                </SectionCard>
            )}

            {/* Forecast */}
            {analysis.forecastMonthly && (
                <SectionCard 
                    title="Previsão do Próximo Mês"
                    icon={<TrendingUp className="w-5 h-5" />}
                    section="forecast"
                    expanded={expandedSections.forecast}
                    onToggle={toggleSection}
                >
                    <div className="space-y-3"> 
                        {Object.entries(analysis.forecastMonthly)
                            .filter(([key]) => key !== 'total')
                            .sort(([,a], [,b]) => b - a)
                            .map(([category, amount]) => (
                                <div key={category} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{category}</span>
                                    <span className="text-slate-900 dark:text-slate-200 font-bold">R$ {amount.toFixed(2)}</span>
                                </div>
                            ))}
                        <div className="border-t pt-3 mt-3 flex justify-between items-center font-bold">
                            <span className="text-slate-900">Total Previsto</span>
                            <span className="text-lg text-blue-600">R$ {analysis.forecastMonthly.total.toFixed(2)}</span>
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* Trends */}
            {Object.keys(analysis.categoryAnalysis).length > 0 && (
                <SectionCard 
                    title="Tendências por Categoria"
                    icon={<BarChart3 className="w-5 h-5" />}
                    section="trends"
                    expanded={false}
                    onToggle={toggleSection}
                >
                    <div className="space-y-3">
                        {Object.entries(analysis.categoryAnalysis)
                            .map(([category, trend]) => (
                                <TrendCard key={category} category={category} trend={trend} />
                            ))}
                    </div>
                </SectionCard>
            )}

            {/* Action Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                    💡 Dica: Revise suas metas financeiras baseado nessas análises e recomendações para otimizar seus gastos!
                </p>
                <button onClick={fetchData} className="btn-primary bg-blue-600 hover:bg-blue-700">
                    Atualizar Análise
                </button>
            </div>
        </div>
    );
}

/**
 * Card de seção retrátil
 */
function SectionCard({ title, icon, section, expanded, onToggle, children, badgeCount, badgeColor = "blue" }) {
    return ( 
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <button
                onClick={() => onToggle(section)}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`text-${badgeColor}-600`}>{icon}</span>
                    <h2 className="font-bold text-slate-900 dark:text-slate-200">{title}</h2>
                    {badgeCount !== undefined && (
                        <span className={`bg-${badgeColor}-100 text-${badgeColor}-700 px-2 py-1 rounded text-xs font-semibold`}>
                            {badgeCount}
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                )}
            </button>
            {expanded && (
                <div className="p-6 border-t border-slate-100">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * Card de estatística
 */
function StatCard({ label, value, trend, color }) {
    const colorClass = {
        green: 'bg-green-50 text-green-700',
        red: 'bg-red-50 text-red-700',
        blue: 'bg-blue-50 text-blue-700'
    }[color];

    return (
        <div className={`p-4 rounded-lg ${colorClass}`}>
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {trend && (
                <div className="flex items-center gap-1 text-xs mt-2">
                    {trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                    ) : (
                        <TrendingDown className="w-3 h-3" />
                    )}
                    {trend === 'up' ? 'Positivo' : 'Negativo'}
                </div>
            )}
        </div>
    );
}

/**
 * Card de recomendação
 */
function RecommendationCard({ recommendation }) {
    const priorityColor = {
        alta: 'red',
        média: 'amber',
        baixa: 'blue'
    }[recommendation.priority];

    const priorityBg = {
        alta: 'bg-red-50 border-red-200',
        média: 'bg-amber-50 border-amber-200',
        baixa: 'bg-blue-50 border-blue-200'
    }[recommendation.priority];

    return (
        <div className={`p-4 rounded-lg border ${priorityBg}`}>
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-slate-900">{recommendation.title}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded bg-${priorityColor}-100 text-${priorityColor}-700`}>
                    {recommendation.priority}
                </span>
            </div>
            <p className="text-sm text-slate-700 mb-2">{recommendation.description}</p>
            <p className="text-sm font-medium text-slate-600 mb-2">💡 {recommendation.action}</p>
            <p className="text-xs text-slate-500">📊 Impacto: {recommendation.impact}</p>
        </div>
    );
}

/**
 * Card de padrão
 */
function PatternCard({ category, pattern }) {
    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{category}</h3>
                <span className="text-sm font-semibold text-slate-600">
                    Freq: {pattern.frequency}x
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                    <p className="text-slate-600 text-xs">Média</p>
                    <p className="font-bold text-slate-900">R$ {pattern.average.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-slate-600 text-xs">Máximo</p>
                    <p className="font-bold text-slate-900">R$ {pattern.max.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-slate-600 text-xs">Mínimo</p>
                    <p className="font-bold text-slate-900">R$ {pattern.min.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-slate-600 text-xs">Tendência</p>
                    <p className={`font-bold ${pattern.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {pattern.trend > 0 ? '📈' : '📉'}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Card de tendência
 */
function TrendCard({ category, trend }) {
    const isGrowing = trend.direction === 'crescente';
    
    return (
        <div className={`p-4 rounded-lg border ${isGrowing ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{category}</h3>
                    <p className={`text-sm font-semibold ${isGrowing ? 'text-red-700' : 'text-green-700'}`}>
                        {isGrowing ? '📈' : '📉'} {trend.change}% em relação ao mês anterior
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                        Anterior: R$ {trend.previous.toFixed(2)} → Atual: R$ {trend.current.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
}
