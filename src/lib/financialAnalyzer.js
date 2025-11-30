/**
 * Financial Analysis Engine
 * Algoritmo próprio de IA para análise financeira sem APIs externas
 */

export class FinancialAnalyzer {
    constructor(transactions, goals = []) {
        this.transactions = transactions || [];
        this.goals = goals || [];
        this.today = new Date();
    }

    /**
     * Análise completa das finanças
     */
    analyze() {
        return {
            summary: this.getSummary(),
            patterns: this.detectPatterns(),
            anomalies: this.detectAnomalies(),
            recommendations: this.generateRecommendations(),
            categoryAnalysis: this.analyzeCategoryTrends(),
            forecastMonthly: this.forecastNextMonth(),
            healthScore: this.calculateHealthScore(),
            insights: this.generateInsights()
        };
    }

    /**
     * Resumo financeiro básico
     */
    getSummary() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const balance = income - expenses;
        const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

        return {
            totalIncome: parseFloat(income.toFixed(2)),
            totalExpenses: parseFloat(expenses.toFixed(2)),
            balance: parseFloat(balance.toFixed(2)),
            savingsRate: parseFloat(savingsRate),
            transactionCount: this.transactions.length
        };
    }

    /**
     * Detecta padrões de gasto
     */
    detectPatterns() {
        const patterns = {};
        const categorySpending = {};

        // Agrupar por categoria
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                if (!categorySpending[t.category]) {
                    categorySpending[t.category] = [];
                }
                categorySpending[t.category].push(Number(t.amount));
            });

        // Calcular estatísticas por categoria
        for (const [category, amounts] of Object.entries(categorySpending)) {
            const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const max = Math.max(...amounts);
            const min = Math.min(...amounts);
            const std = this.calculateStandardDeviation(amounts);

            patterns[category] = {
                average: parseFloat(avg.toFixed(2)),
                max: parseFloat(max.toFixed(2)),
                min: parseFloat(min.toFixed(2)),
                standardDeviation: parseFloat(std.toFixed(2)),
                frequency: amounts.length,
                trend: this.calculateTrend(amounts)
            };
        }

        return patterns;
    }

    /**
     * Detecta anomalias e gastos anormais
     */
    detectAnomalies() {
        const anomalies = [];
        const categoryPatterns = this.detectPatterns();

        this.transactions
            .filter(t => t.type === 'expense')
            .slice(-30) // Últimas 30 transações
            .forEach(transaction => {
                const pattern = categoryPatterns[transaction.category];
                if (!pattern) return;

                const amount = Number(transaction.amount);
                const zScore = Math.abs((amount - pattern.average) / (pattern.standardDeviation || 1));

                // Se Z-score > 2, é anomalia
                if (zScore > 2) {
                    anomalies.push({
                        transaction: transaction.description || transaction.category,
                        category: transaction.category,
                        amount: amount,
                        date: transaction.date,
                        severity: zScore > 3 ? 'alta' : 'média',
                        reason: `Gasto de R$ ${amount.toFixed(2)} em ${transaction.category} está ${zScore.toFixed(1)}x acima do normal (média: R$ ${pattern.average.toFixed(2)})`
                    });
                }
            });

        return anomalies.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Analisa tendências por categoria
     */
    analyzeCategoryTrends() {
        const monthlyData = {};
        const categoryTrends = {};

        // Agrupar por mês e categoria
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const date = new Date(t.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {};
                }

                if (!monthlyData[monthKey][t.category]) {
                    monthlyData[monthKey][t.category] = 0;
                }

                monthlyData[monthKey][t.category] += Number(t.amount);
            });

        // Calcular tendências
        const categories = new Set(this.transactions.map(t => t.category));
        categories.forEach(category => {
            const values = Object.entries(monthlyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([_, data]) => data[category] || 0)
                .filter(v => v > 0);

            if (values.length > 1) {
                const trend = this.calculateTrend(values);
                categoryTrends[category] = {
                    trend: trend,
                    current: values[values.length - 1],
                    previous: values[values.length - 2],
                    change: ((values[values.length - 1] - values[values.length - 2]) / values[values.length - 2] * 100).toFixed(1),
                    direction: values[values.length - 1] > values[values.length - 2] ? 'crescente' : 'decrescente'
                };
            }
        });

        return categoryTrends;
    }

    /**
     * Prevê gastos do próximo mês
     */
    forecastNextMonth() {
        const patterns = this.detectPatterns();
        const forecast = {};
        let totalForecast = 0;

        for (const [category, pattern] of Object.entries(patterns)) {
            const predicted = pattern.average * (1 + (pattern.trend || 0) * 0.1);
            forecast[category] = parseFloat(predicted.toFixed(2));
            totalForecast += predicted;
        }

        forecast.total = parseFloat(totalForecast.toFixed(2));
        return forecast;
    }

    /**
     * Calcula score de saúde financeira (0-100)
     */
    calculateHealthScore() {
        let score = 50; // Base

        const summary = this.getSummary();
        
        // Taxa de poupança
        if (summary.savingsRate >= 20) score += 15;
        else if (summary.savingsRate >= 10) score += 10;
        else if (summary.savingsRate >= 0) score += 5;
        
        // Anomalias
        const anomalies = this.detectAnomalies();
        score -= Math.min(anomalies.length * 2, 10);

        // Meta de gastos
        const expensive = this.transactions
            .filter(t => t.type === 'expense')
            .filter(t => Number(t.amount) > 500)
            .length;
        score -= Math.min(expensive, 10);

        // Metas ativas
        const activeGoals = this.goals.filter(g => g.status === 'active').length;
        score += Math.min(activeGoals * 5, 15);

        // Meta completa
        const completedGoals = this.goals.filter(g => g.status === 'completed').length;
        score += Math.min(completedGoals * 10, 10);

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Gera recomendações inteligentes
     */
    generateRecommendations() {
        const recommendations = [];
        const summary = this.getSummary();
        const patterns = this.detectPatterns();
        const anomalies = this.detectAnomalies();
        const trends = this.analyzeCategoryTrends();

        // 1. Recomendação sobre economia
        if (summary.savingsRate < 10) {
            recommendations.push({
                priority: 'alta',
                type: 'economia',
                title: 'Aumente sua taxa de poupança',
                description: `Você está poupando apenas ${summary.savingsRate}% da sua renda. Especialistas recomendam mínimo 20%.`,
                action: 'Identifique categorias de gastos desnecessários e reduza em 10-15%',
                impact: 'Melhorar autonomia financeira'
            });
        }

        // 2. Recomendação sobre anomalias
        if (anomalies.length > 0) {
            const highestAnomaly = anomalies[0];
            recommendations.push({
                priority: 'média',
                type: 'alerta',
                title: 'Gasto anormal detectado',
                description: `Em ${highestAnomaly.date}: ${highestAnomaly.reason}`,
                action: 'Verifique se foi intencional ou se pode ser reduzido',
                impact: 'Economizar até R$ ' + (highestAnomaly.amount * 0.3).toFixed(2)
            });
        }

        // 3. Recomendação sobre categoria mais cara
        const mostExpensive = Object.entries(patterns)
            .sort(([,a], [,b]) => b.average - a.average)[0];
        
        if (mostExpensive && mostExpensive[1].average > 200) {
            recommendations.push({
                priority: 'média',
                type: 'otimizacao',
                title: `Otimize gastos em ${mostExpensive[0]}`,
                description: `Você gasta em média R$ ${mostExpensive[1].average.toFixed(2)}/mês em ${mostExpensive[0]}. Esta é sua maior despesa variável.`,
                action: `Reduza em 10-15% ou busque alternativas mais baratas`,
                impact: `Economia potencial: R$ ${(mostExpensive[1].average * 0.15).toFixed(2)}/mês`
            });
        }

        // 4. Recomendação sobre tendências
        for (const [category, trend] of Object.entries(trends)) {
            if (trend.direction === 'crescente' && parseFloat(trend.change) > 15) {
                recommendations.push({
                    priority: 'média',
                    type: 'alerta',
                    title: `Gastos em ${category} crescendo`,
                    description: `${category} aumentou ${trend.change}% no último mês. Está em tendência crescente.`,
                    action: 'Monitore e estabeleça um limite máximo para este gasto',
                    impact: 'Evitar despesas fora de controle'
                });
                break; // Apenas um alerta de tendência por vez
            }
        }

        // 5. Recomendação sobre metas
        if (this.goals.length === 0) {
            recommendations.push({
                priority: 'baixa',
                type: 'planejamento',
                title: 'Crie metas financeiras',
                description: 'Você não tem metas ativas. Metas ajudam a manter o foco e disciplina.',
                action: 'Crie pelo menos uma meta (férias, carro, fundo de emergência)',
                impact: 'Aumentar motivação e organização'
            });
        }

        return recommendations.sort((a, b) => {
            const priorityMap = { alta: 3, média: 2, baixa: 1 };
            return priorityMap[b.priority] - priorityMap[a.priority];
        });
    }

    /**
     * Gera insights textuais
     */
    generateInsights() {
        const insights = [];
        const summary = this.getSummary();
        const patterns = this.detectPatterns();

        // Insight 1: Resumo geral
        if (summary.balance > 0) {
            insights.push(
                `💰 Ótima notícia! Você acumulou R$ ${summary.balance.toFixed(2)} neste período. Continue neste ritmo!`
            );
        } else {
            insights.push(
                `⚠️ Seu saldo está negativo em R$ ${Math.abs(summary.balance).toFixed(2)}. Reduza despesas ou aumente renda.`
            );
        }

        // Insight 2: Maior gasto
        const biggestExpense = Object.entries(patterns)
            .sort(([,a], [,b]) => b.average - a.average)[0];
        
        if (biggestExpense) {
            insights.push(
                `🔝 Sua maior despesa é ${biggestExpense[0]} com média de R$ ${biggestExpense[1].average.toFixed(2)}/mês.`
            );
        }

        // Insight 3: Economia
        if (summary.savingsRate > 0) {
            insights.push(
                `✅ Você economiza ${summary.savingsRate}% da sua renda. Parabéns!`
            );
        }

        // Insight 4: Consistência
        const monthCount = new Set(
            this.transactions.map(t => new Date(t.date).toISOString().slice(0, 7))
        ).size;

        if (monthCount >= 3) {
            insights.push(
                `📊 Analisando ${monthCount} meses de dados para padrões mais precisos.`
            );
        }

        return insights;
    }

    /**
     * Calcula desvio padrão
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Calcula tendência (simples regressão linear)
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;

        const xMean = x.reduce((a, b) => a + b) / n;
        const yMean = y.reduce((a, b) => a + b) / n;

        const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
        const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

        return denominator === 0 ? 0 : numerator / denominator;
    }
}

/**
 * Função auxiliar para usar o analisador
 */
export function analyzeFinances(transactions, goals) {
    const analyzer = new FinancialAnalyzer(transactions, goals);
    return analyzer.analyze();
}
