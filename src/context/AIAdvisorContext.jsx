import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAlerts } from './AlertsContext';
import { useAuth } from './AuthContext';
import { analyzeFinances } from '../lib/financialAnalyzer';
import { useProfile } from './ProfileContext'; // 1. Importar o useProfile
import { useLocation } from 'react-router-dom';
import {
    generateTransactionAlert,
    generateGoalAlert,
    generateRecommendationAlert,
    generateAnomalyAlert,
    generateHealthScoreAlert,
    generateCategoryTrendAlert
} from '../lib/notificationHelpers';

const AIAdvisorContext = createContext();

export function AIAdvisorProvider({ children }) {
    const { createAlert } = useAlerts();
    const { user } = useAuth();
    const { activeProfile } = useProfile(); // 2. Obter o perfil ativo
    const location = useLocation();
    const [analysis, setAnalysis] = useState(null);
    const [previousAnalysis, setPreviousAnalysis] = useState(null);
    const [contextualAdvice, setContextualAdvice] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastRecommendationAlertTime, setLastRecommendationAlertTime] = useState(0);
    const [achievements, setAchievements] = useState([]);

    // Fetch analysis dados
    useEffect(() => {
        if (user && activeProfile) { // 3. Garantir que o perfil ativo exista antes de buscar
            fetchAnalysis();
        }
    }, [user, activeProfile]); // 4. Adicionar activeProfile como dependência

    // Fetch achievements
    useEffect(() => {
        const fetchAchievements = async () => {
            if (!user) return;
            const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id);
            setAchievements(data || []);
        };
        fetchAchievements();
    }, [user]);


    // Update contextual advice based on current page
    useEffect(() => {
        if (analysis) {
            updateContextualAdvice(location.pathname);
        }
    }, [location, analysis]);

    // Generate alerts based on analysis changes
    useEffect(() => {
        if (!createAlert || !analysis || !previousAnalysis) return;

        const generateAlerts = async () => {
            // Check for health score changes and generate alerts
            if (previousAnalysis.healthScore !== analysis.healthScore) {
                const healthAlert = generateHealthScoreAlert(analysis.healthScore, previousAnalysis.healthScore);
                await createAlert(
                    healthAlert.type,
                    healthAlert.title,
                    healthAlert.message,
                    healthAlert.severity
                );
            }

            // Alert for new anomalies
            if (analysis.anomalies?.length > 0 && !previousAnalysis.anomalies?.length) {
                analysis.anomalies.slice(0, 2).forEach(async (anomaly) => {
                    const anomalyAlert = generateAnomalyAlert(anomaly);
                    await createAlert(
                        anomalyAlert.type,
                        anomalyAlert.title,
                        anomalyAlert.message,
                        anomalyAlert.severity,
                        anomalyAlert.category,
                        anomalyAlert.data
                    );
                });
            }
        };

        generateAlerts();
    }, [analysis, previousAnalysis, createAlert]);

    const fetchAnalysis = async () => {
        if (!activeProfile) return; // Guarda de segurança
        setLoading(true);
        try {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const [{ data: transData }, { data: goalsData }] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user?.id)
                    .eq('profile_id', activeProfile.id)
                    .gte('date', sixMonthsAgo.toISOString().split('T')[0]),
                supabase
                    .from('goals')
                    .select('*')
                    .eq('user_id', user?.id)
                    .eq('profile_id', activeProfile.id)
            ]);

            if (transData && transData.length > 0) {
                const result = analyzeFinances(transData, goalsData || []);

                setPreviousAnalysis(analysis);
                setAnalysis(result);
                checkAchievements(result, transData, goalsData); // <-- Lógica de Gamificação
            }
        } catch (error) {
            console.error('Error fetching analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkAchievements = async (currentAnalysis, transactions, goals) => {
        if (!user) return;

        const [
            { data: currentAchievementsData },
            { data: allDefinitionsData },
            { data: budgetsData },
        ] = await Promise.all([
            supabase.from('achievements').select('type').eq('user_id', user.id).eq('profile_id', activeProfile.id), // CORREÇÃO
            supabase.from('achievement_definitions').select('*'),
            supabase.from('budget_limits').select('id').eq('user_id', user.id).eq('profile_id', activeProfile.id), // CORREÇÃO
        ]);

        const existingAchievements = new Set((currentAchievementsData || []).map(a => a.type));
        const allDefinitions = allDefinitionsData || [];
        const budgets = budgetsData || [];

        const newAchievements = [];

        // 1. Primeira Transação
        if (transactions.length > 0 && !existingAchievements.has('FIRST_TRANSACTION')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'FIRST_TRANSACTION'));
        }

        // 2. Primeira Meta
        if (goals.length > 0 && !existingAchievements.has('FIRST_GOAL')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'FIRST_GOAL'));
        }

        // 3. Taxa de Poupança
        if (currentAnalysis.summary.savingsRate >= 10 && !existingAchievements.has('SAVER_LV1')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'SAVER_LV1'));
        }
        if (currentAnalysis.summary.savingsRate >= 20 && !existingAchievements.has('SAVER_LV2')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'SAVER_LV2'));
        }

        // 4. Meta Concluída
        const hasCompletedGoal = goals.some(g => g.current_amount >= g.target_amount);
        if (hasCompletedGoal && !existingAchievements.has('GOAL_COMPLETED')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'GOAL_COMPLETED'));
        }

        // 5. Novas Conquistas
        if (transactions.length >= 10 && !existingAchievements.has('TRANSACTION_LV1')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'TRANSACTION_LV1'));
        }
        if (transactions.length >= 50 && !existingAchievements.has('TRANSACTION_LV2')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'TRANSACTION_LV2'));
        }
        if (budgets.length > 0 && !existingAchievements.has('FIRST_BUDGET')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'FIRST_BUDGET'));
        }
        if (currentAnalysis.healthScore >= 85 && !existingAchievements.has('HEALTHY_FINANCES')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'HEALTHY_FINANCES'));
        }

        // 6. Conquistas de Moeda
        const hasForeignTransaction = transactions.some(t => t.currency !== 'BRL');
        if (hasForeignTransaction && !existingAchievements.has('FIRST_FOREIGN_TRANSACTION')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'FIRST_FOREIGN_TRANSACTION'));
        }

        const usedCurrencies = new Set(transactions.map(t => t.currency));
        if (usedCurrencies.has('BRL') && usedCurrencies.has('USD') && usedCurrencies.has('EUR') && !existingAchievements.has('MULTI_CURRENCY_MASTER')) {
            newAchievements.push(allDefinitions.find(a => a.type === 'MULTI_CURRENCY_MASTER'));
        }




        if (newAchievements.length > 0) {
            const achievementsToInsert = newAchievements.map(ach => ({
                user_id: user.id,
                profile_id: activeProfile.id, // CORREÇÃO
                type: ach.type,
                name: ach.name,
                description: ach.description,
                icon: ach.icon,
            }));

            const { data, error } = await supabase.from('achievements').insert(achievementsToInsert).select();

            if (!error && data) {
                setAchievements(prev => [...prev, ...data]);
                // Disparar alerta/toast para cada nova conquista
                data.forEach(ach => {
                    createAlert('achievement_unlocked', `${ach.icon} Conquista Desbloqueada!`, ach.name, 'success', null, ach);
                });
            }
        }
    };

    // Create transaction through AI
    const createTransaction = async (type, amount, category, description = '', date = null) => {
        let transactionDate = date;
        if (transactionDate) {
            // Ensure date string is treated as UTC to prevent timezone shift
            const [year, month, day] = transactionDate.split('-').map(Number);
            transactionDate = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
        } else {
            // If no date is provided, use today's date, but adjust for local timezone before converting to string
            transactionDate = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        }
        try {
            const { error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user?.id,
                    profile_id: activeProfile.id,
                    type, // 'income' or 'expense'
                    amount: parseFloat(amount),
                    category,
                    description,
                    date: transactionDate
                }]);

            if (error) throw error;
            
            // Generate transaction alert
            if (createAlert) {
                const txnAlert = generateTransactionAlert(type, amount, category, description);
                await createAlert(
                    txnAlert.type,
                    txnAlert.title,
                    txnAlert.message,
                    txnAlert.severity,
                    txnAlert.category,
                    txnAlert.data
                );
            }

            await fetchAnalysis(); // Refresh analysis
            return { success: true, message: `✅ ${type === 'income' ? 'Entrada' : 'Saída'} de R$ ${amount} criada!` };
        } catch (error) {
            console.error('Error creating transaction:', error);
            return { success: false, message: `❌ Erro ao criar transação: ${error.message}` };
        }
    };

    // Create goal through AI
    const createGoal = async (name, targetAmount, deadline, description = '') => {
        try {
            const { error } = await supabase
                .from('goals')
                .insert([{
                    user_id: user?.id,
                    profile_id: activeProfile.id,
                    name,
                    description,
                    target_amount: parseFloat(targetAmount),
                    current_amount: 0,
                    deadline,
                    status: 'active'
                }]);

            if (error) throw error;

            // Generate goal alert
            if (createAlert) {
                const goalAlert = generateGoalAlert(name, targetAmount, deadline);
                await createAlert(
                    goalAlert.type,
                    goalAlert.title,
                    goalAlert.message,
                    goalAlert.severity,
                    null,
                    goalAlert.data
                );
            }

            await fetchAnalysis(); // Refresh analysis
            return { success: true, message: `✅ Meta "${name}" criada com target de R$ ${targetAmount}!` };
        } catch (error) {
            console.error('Error creating goal:', error);
            return { success: false, message: `❌ Erro ao criar meta: ${error.message}` };
        }
    };

    const updateContextualAdvice = (pathname) => {
        if (!analysis) return;

        let advice = null;

        switch (pathname) {
            case '/':
                advice = {
                    page: 'Dashboard',
                    title: 'Visão Geral Financeira',
                    message: `Seu score de saúde financeira está em ${analysis.healthScore}/100. ${analysis.insights[0] || 'Continue monitorando seus gastos!'}`,
                    action: analysis.recommendations[0] || null,
                    icon: '📊'
                };
                break;

            case '/income':
                const incomeRecommendation = analysis.recommendations.find(r => r.type === 'economia');
                advice = {
                    page: 'Entradas',
                    title: 'Dica para Entradas',
                    message: `Sua renda total é R$ ${analysis.summary.totalIncome.toFixed(2)}. ${analysis.insights.filter(i => i.includes('Parabéns'))[0] || 'Aumente suas fontes de renda!'}`,
                    action: incomeRecommendation,
                    icon: '💰'
                };
                break;

            case '/expenses':
                const expenseRecommendation = analysis.recommendations.find(r => r.type === 'otimizacao');
                const expensive = Object.entries(analysis.patterns)
                    .sort(([, a], [, b]) => b.average - a.average)[0];
                advice = {
                    page: 'Saídas',
                    title: 'Otimize Seus Gastos',
                    message: `Você gasta R$ ${analysis.summary.totalExpenses.toFixed(2)}/mês. Sua maior despesa é ${expensive ? expensive[0] : 'variável'} com média de R$ ${expensive ? expensive[1].average.toFixed(2) : '0'}.`,
                    action: expenseRecommendation,
                    icon: '💸'
                };
                break;

            case '/reports':
                advice = {
                    page: 'Relatórios',
                    title: 'Análise Mensal',
                    message: `Taxa de poupança: ${analysis.summary.savingsRate}%. ${analysis.summary.savingsRate >= 20 ? '✅ Excelente!' : '⚠️ Procure aumentar para 20%.'}`,
                    icon: '📈'
                };
                break;

            case '/goals':
                advice = {
                    page: 'Metas',
                    title: 'Acompanhe Suas Metas',
                    message: 'Defina metas realistas e use a IA para acompanhar seu progresso. Cada meta concluída aumenta sua saúde financeira!',
                    icon: '🎯'
                };
                break;

            case '/profile':
                advice = {
                    page: 'Perfil',
                    title: 'Seu Perfil',
                    message: 'Configure seu perfil e acompanhe suas metas compartilhadas. Quanto mais dados, mais precisas serão as recomendações!',
                    icon: '👤'
                };
                break;

            case '/advisor':
                advice = {
                    page: 'Assistente IA',
                    title: 'Análise Completa',
                    message: 'Explore a análise completa de seus padrões, anomalias detectadas e previsões para o próximo mês.',
                    icon: '🧠'
                };
                break;

            default:
                advice = {
                    page: 'FinanIA',
                    title: 'Bem-vindo!',
                    message: 'Navegue pela plataforma e eu estarei aqui com dicas personalizadas para cada seção.',
                    icon: '👋'
                };
        }

        setContextualAdvice(advice);
    };

    return (
        <AIAdvisorContext.Provider value={{
            analysis,
            contextualAdvice,
            isOpen,
            setIsOpen,
            loading,
            fetchAnalysis,
            createTransaction,
            createGoal,
            achievements
        }}>
            {children}
        </AIAdvisorContext.Provider>
    );
}

export function useAIAdvisor() {
    const context = useContext(AIAdvisorContext);
    if (!context) {
        throw new Error('useAIAdvisor deve ser usado dentro de AIAdvisorProvider');
    }
    return context;
}
