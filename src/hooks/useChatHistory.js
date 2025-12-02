import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext'; // 1. Importar o contexto de perfil

export const useChatHistory = (userId) => {
    const { activeProfile } = useProfile(); // 2. Obter o perfil ativo
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const saveMessage = async (messageText, sender) => {
        if (!userId || !activeProfile?.id) return null; // 3. Garantir que o perfil exista
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .insert([{
                    user_id: userId,
                    profile_id: activeProfile.id, // 4. Salvar com o ID do perfil ativo
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
        if (!userId || !activeProfile?.id) return []; // 5. Garantir que o perfil exista
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('user_id', userId)
                .eq('profile_id', activeProfile.id) // 6. FILTRAR pelo ID do perfil ativo
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
        if (!userId || !activeProfile?.id) return; // 7. Garantir que o perfil exista
        try {
            const { error } = await supabase
                .from('chat_history')
                .delete()
                .eq('user_id', userId)
                .eq('profile_id', activeProfile.id); // 8. Limpar apenas as mensagens do perfil ativo
            
            if (error) throw error;
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!userId || !activeProfile?.id || typeof messageId !== 'string') return;
        try {
            const { error } = await supabase
                .from('chat_history')
                .delete()
                .eq('id', messageId)
                .eq('user_id', userId)
                .eq('profile_id', activeProfile.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    return {
        sessionId,
        saveMessage,
        loadChatHistory,
        clearChatHistory,
        deleteMessage, // Expor a nova função
    };
};
