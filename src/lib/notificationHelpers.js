// Helper functions for generating smart notifications

export const generateTransactionAlert = (type, amount, category, description) => {
    const isIncome = type === 'income';
    const icons = {
        'Salário': '💰',
        'Freelance': '💻',
        'Investimentos': '📈',
        'Alimentação': '🍔',
        'Moradia': '🏠',
        'Transporte': '🚗',
        'Lazer': '🎮',
        'Saúde': '⚕️',
        'Educação': '📚',
        'Contas': '💳'
    };

    const icon = icons[category] || (isIncome ? '💰' : '💸');

    return {
        type: isIncome ? 'income_created' : 'expense_created',
        title: isIncome ? `${icon} Entrada Registrada` : `${icon} Saída Registrada`,
        message: `${category}: R$ ${parseFloat(amount).toFixed(2)}${description ? ' - ' + description : ''}`,
        severity: 'low',
        category: category,
        data: { type, amount, category, description }
    };
};

export const generateGoalAlert = (goalName, targetAmount, deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    return {
        type: 'goal_created',
        title: '🎯 Nova Meta Criada',
        message: `${goalName}: R$ ${parseFloat(targetAmount).toFixed(2)} até ${deadline}${daysUntil > 0 ? ` (${daysUntil} dias)` : ' (VENCIDA)'}`,
        severity: daysUntil < 30 ? 'medium' : 'low',
        data: { goalName, targetAmount, deadline, daysUntil }
    };
};

export const generateRecommendationAlert = (recommendation) => {
    const priorityIcons = {
        alta: '🔴',
        média: '🟡',
        baixa: '🟢'
    };

    const icon = priorityIcons[recommendation.priority] || '💡';

    return {
        type: 'recommendation_generated',
        title: `${icon} Recomendação da FIFI`,
        message: recommendation.title,
        severity: recommendation.priority === 'alta' ? 'high' : recommendation.priority === 'média' ? 'medium' : 'low',
        data: {
            title: recommendation.title,
            description: recommendation.description,
            action: recommendation.action,
            impact: recommendation.impact
        }
    };
};

export const generateAnomalyAlert = (anomaly) => {
    return {
        type: 'anomaly_detected',
        title: '🚨 Gasto Anormal Detectado',
        message: `${anomaly.category}: R$ ${anomaly.amount.toFixed(2)} (Z-score: ${(anomaly.zScore || 2.5).toFixed(1)}x)`,
        severity: 'high',
        category: anomaly.category,
        data: anomaly
    };
};

export const generateGoalProgressAlert = (goalName, currentAmount, targetAmount, progressPercent) => {
    let title, message, severity;

    if (progressPercent >= 100) {
        title = '🎉 Meta Concluída!';
        message = `${goalName}: 100% - R$ ${currentAmount.toFixed(2)} de R$ ${targetAmount.toFixed(2)}`;
        severity = 'low';
    } else if (progressPercent >= 75) {
        title = '💪 Quase lá!';
        message = `${goalName}: ${progressPercent.toFixed(0)}% - Faltam R$ ${(targetAmount - currentAmount).toFixed(2)}`;
        severity = 'low';
    } else if (progressPercent >= 50) {
        title = '📈 Meio do caminho';
        message = `${goalName}: ${progressPercent.toFixed(0)}% - Continue assim!`;
        severity = 'low';
    } else {
        title = '🚀 Meta em Progresso';
        message = `${goalName}: ${progressPercent.toFixed(0)}% - R$ ${currentAmount.toFixed(2)} de R$ ${targetAmount.toFixed(2)}`;
        severity = 'low';
    }

    return {
        type: 'goal_progress',
        title,
        message,
        severity,
        data: { goalName, currentAmount, targetAmount, progressPercent }
    };
};

export const generateSavingsAlert = (savingsRate, targetRate = 20) => {
    if (savingsRate >= targetRate) {
        return {
            type: 'savings_milestone',
            title: '✅ Poupança no Alvo!',
            message: `Você economiza ${savingsRate.toFixed(1)}% (meta: ${targetRate}%) - Excelente!`,
            severity: 'low',
            data: { savingsRate, targetRate }
        };
    } else if (savingsRate >= targetRate * 0.7) {
        return {
            type: 'savings_warning',
            title: '⚠️ Poupança Abaixo do Alvo',
            message: `Você economiza ${savingsRate.toFixed(1)}% (meta: ${targetRate}%). Reduza gastos!`,
            severity: 'medium',
            data: { savingsRate, targetRate }
        };
    } else {
        return {
            type: 'savings_critical',
            title: '🔴 Poupança Crítica',
            message: `Você economiza apenas ${savingsRate.toFixed(1)}% (meta: ${targetRate}%). Ação necessária!`,
            severity: 'high',
            data: { savingsRate, targetRate }
        };
    }
};

export const generateCategoryTrendAlert = (category, trend) => {
    const trendIcon = trend.direction === 'crescente' ? '📈' : '📉';
    const changePercent = parseFloat(trend.change || 0);

    let severity = 'low';
    let title = `${trendIcon} Tendência em ${category}`;
    let message = '';

    if (trend.direction === 'crescente' && changePercent > 20) {
        severity = 'high';
        title = `📈 Alerta: Gastos em ${category} Crescendo`;
        message = `${category} aumentou ${changePercent.toFixed(1)}% - Monitore essa categoria!`;
    } else if (trend.direction === 'crescente') {
        severity = 'medium';
        message = `${category} aumentou ${changePercent.toFixed(1)}%`;
    } else {
        message = `${category} diminuiu ${Math.abs(changePercent).toFixed(1)}%`;
    }

    return {
        type: 'category_trend',
        title,
        message,
        severity,
        category: category,
        data: trend
    };
};

export const generateHealthScoreAlert = (healthScore, previousScore) => {
    const scoreChange = healthScore - (previousScore || healthScore);
    let title, message, severity;

    if (healthScore >= 80) {
        title = '🏆 Saúde Financeira Excelente!';
        message = `Score: ${healthScore}/100${scoreChange > 0 ? ` (+${scoreChange})` : ''}`;
        severity = 'low';
    } else if (healthScore >= 60) {
        title = '👍 Saúde Financeira Boa';
        message = `Score: ${healthScore}/100${scoreChange > 0 ? ` (+${scoreChange})` : ` (${scoreChange})`}`;
        severity = 'low';
    } else if (healthScore >= 40) {
        title = '⚠️ Saúde Financeira Preocupante';
        message = `Score: ${healthScore}/100 - Procure melhorar`;
        severity = 'medium';
    } else {
        title = '🔴 Saúde Financeira Crítica';
        message = `Score: ${healthScore}/100 - Ação urgente necessária`;
        severity = 'high';
    }

    return {
        type: 'health_score_update',
        title,
        message,
        severity,
        data: { healthScore, previousScore, scoreChange }
    };
};
