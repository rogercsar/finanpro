import { supabase } from '../lib/supabase';

export const useChatHistory = (userId) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const saveMessage = async (messageText, sender) => {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .insert([{
                    user_id: userId,
                    message_text: messageText,
                    sender,
                    session_id: sessionId
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving message:', error);
            return null;
        }
    };

    const loadChatHistory = async (limit = 50) => {
        if (!userId) return [];
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: true })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    };

    const clearChatHistory = async () => {
        if (!userId) return;
        try {
            const { error } = await supabase
                .from('chat_history')
                .delete()
                .eq('user_id', userId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    };

    return {
        sessionId,
        saveMessage,
        loadChatHistory,
        clearChatHistory
    };
};
