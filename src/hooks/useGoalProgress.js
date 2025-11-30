import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useGoalProgress(goalId) {
    useEffect(() => {
        if (!goalId) return;

        // Subscribe to changes in transactions for this goal
        const subscription = supabase
            .channel(`goal-${goalId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `goal_id=eq.${goalId}`
            }, async (payload) => {
                // Update goal progress when transactions change
                await updateGoalProgress(goalId);
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [goalId]);
}

export async function updateGoalProgress(goalId) {
    try {
        // Get all transactions for this goal
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('goal_id', goalId);

        if (transError) throw transError;

        // Calculate total from income transactions
        const totalFromIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        // Calculate total from expense transactions (deducted)
        const totalFromExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc - Number(t.amount), 0);

        const currentAmount = totalFromIncome + totalFromExpense;

        // Update goal with new current_amount
        const { error: updateError } = await supabase
            .from('goals')
            .update({ current_amount: Math.max(0, currentAmount) })
            .eq('id', goalId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error('Error updating goal progress:', error);
    }
}
