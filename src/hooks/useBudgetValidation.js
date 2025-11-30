import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useBudgetValidation = (userId, transaction, budgets, createAlert) => {
    useEffect(() => {
        if (!transaction || !budgets || budgets.length === 0) return;

        const validateBudget = async () => {
            // Find matching budget for this transaction's category
            const budget = budgets.find(b => b.category === transaction.category);
            if (!budget) return;

            // Get this month's expenses for this category
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

            const { data: monthTransactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'expense')
                .eq('category', transaction.category)
                .gte('date', monthStart)
                .lte('date', new Date().toISOString().split('T')[0]);

            const totalSpent = monthTransactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

            // If exceeded, create alert
            if (totalSpent > budget.monthly_limit) {
                const exceeded = totalSpent - budget.monthly_limit;
                await createAlert(
                    'budget_exceeded',
                    '⚠️ Limite de orçamento ultrapassado',
                    `${transaction.category}: R$ ${exceeded.toFixed(2)} acima do limite`,
                    'high',
                    transaction.category,
                    { category: transaction.category, spent: totalSpent, limit: budget.monthly_limit }
                );
            }
        };

        validateBudget();
    }, [transaction, budgets, userId, createAlert]);
};
