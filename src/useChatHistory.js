import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useChatHistory(userId) {
    const saveMessage = useCallback(async (messageText, sender) => {
        if (!userId || !messageText) return;

        try {
            await supabase
                .from('chat_history')
                .insert({
                    user_id: userId,
                    message_text: messageText,
                    sender: sender,
                });
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    }, [userId]);

    const loadChatHistory = useCallback(async (limit = 50) => {
        if (!userId) return [];

        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return (data || []).reverse();
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }, [userId]);

    return { saveMessage, loadChatHistory };
}