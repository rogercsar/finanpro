import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Novo estado para forçar refresh

    // Fetch analysis dados
    useEffect(() => {
        if (user && activeProfile) { // 3. Garantir que o perfil ativo exista antes de buscar
            fetchAnalysis();
        }
    }, [user, activeProfile, refreshTrigger]); // Adicionar refreshTrigger como dependência

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
        // A lógica de conselhos contextuais foi completamente removida para evitar mensagens automáticas.
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

            const [{ data: transData }, { data: goalsData }, { data: subsData }] = await Promise.all([
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
                    .eq('profile_id', activeProfile.id),
                // 1. Busca as assinaturas junto com o resto dos dados
                supabase
                    .from('subscriptions')
                    .select('name, next_payment_date')
                    .eq('user_id', user?.id)
                    .eq('profile_id', activeProfile.id)
            ]);

            // Sempre chamar analyzeFinances e setAnalysis, mesmo que transData seja vazio.
            // Isso garante que 'analysis' nunca seja null se activeProfile existir.
            const result = analyzeFinances(transData || [], goalsData || []);

            setPreviousAnalysis(analysis); // Captura o estado anterior
            setAnalysis(result); // Atualiza com o novo resultado (pode ser vazio)
            checkAchievements(result, transData || [], goalsData || []); // Lógica de Gamificação
            
            // Verifica as assinaturas após a análise
            checkSubscriptionDueDates(subsData || []);
        } catch (error) {
            console.error('Error fetching analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    // 3. Nova função para verificar e criar alertas de assinaturas
    const checkSubscriptionDueDates = async (subscriptions) => {
        const today = new Date();
        const alertThresholdInDays = 3; // Alerta com 3 dias de antecedência
        const notifiedSubscriptions = new Set(JSON.parse(sessionStorage.getItem('notifiedSubscriptions') || '[]'));

        for (const sub of subscriptions) {
            if (!sub.next_payment_date || notifiedSubscriptions.has(sub.name)) {
                continue;
            }

            const paymentDate = new Date(sub.next_payment_date + 'T00:00:00');
            const diffTime = paymentDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= alertThresholdInDays) {
                await createAlert(
                    'subscription_due',
                    '🔔 Assinatura Próxima',
                    `Seu pagamento de ${sub.name} vence em ${diffDays === 0 ? 'hoje' : `${diffDays} dia(s)`}.`,
                    'medium'
                );
                notifiedSubscriptions.add(sub.name);
            }
        }
        sessionStorage.setItem('notifiedSubscriptions', JSON.stringify([...notifiedSubscriptions]));
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

    const refreshAnalysis = useCallback(() => {
        console.log("Forçando a atualização da análise...");
        setRefreshTrigger(prev => prev + 1);
    }, []);

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

            refreshAnalysis(); // Refresh analysis
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

            refreshAnalysis(); // Refresh analysis
            return { success: true, message: `✅ Meta "${name}" criada com target de R$ ${targetAmount}!` };
        } catch (error) {
            console.error('Error creating goal:', error);
            return { success: false, message: `❌ Erro ao criar meta: ${error.message}` };
        }
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
            achievements,
            refreshAnalysis,
            activeProfile // Expor o perfil ativo
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
