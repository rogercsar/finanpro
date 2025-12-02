import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Volume2, Square, Trash2 } from 'lucide-react';
import VoiceInputButton from './VoiceInputButton';
import Markdown from 'react-markdown';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import { useAuth } from '../context/AuthContext';
import { useChatHistory } from '../hooks/useChatHistory';

export default function AdvisorPage() {
    const { user } = useAuth();
    const { analysis, activeProfile } = useAIAdvisor(); // 1. Obter o perfil ativo do contexto
    const { saveMessage, loadChatHistory } = useChatHistory(user ? user.id : null);

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const chatEndRef = useRef(null);
    const analysisRef = useRef(analysis);

    useEffect(() => {
        analysisRef.current = analysis;
    }, [analysis]);

    // Componente para o efeito de "digitando"
    const TypingIndicator = () => (
        <div className="flex items-center gap-2 p-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Carrega o histórico ao iniciar
    useEffect(() => { // 2. O useEffect agora depende do activeProfile
        if (!user?.id || !analysis) return; // Espera o usuário e a análise estarem prontos

        setMessages([]); // Limpa as mensagens existentes antes de carregar o histórico

        if (user?.id) {
            loadChatHistory().then(history => {
                if (history.length > 0) {
                    setMessages(history.map(h => ({
                        id: h.id,
                        text: h.message_text,
                        sender: h.sender,
                        timestamp: new Date(h.timestamp)
                    })));
                } else {
                    setMessages([{ id: 1, text: "Olá! Eu sou a FinanIA, sua especialista em finanças. Como posso te ajudar a organizar suas finanças hoje?", sender: 'ai', timestamp: new Date() }]);
                }
            });
        } else { // Se não houver usuário ou análise, mas o componente for renderizado, mostra a mensagem de boas-vindas.

            setMessages([{ id: 1, text: "Olá! Eu sou a FinanIA, sua especialista em finanças. Como posso te ajudar a organizar suas finanças hoje?", sender: 'ai', timestamp: new Date() }]);
        }
    }, [user?.id, activeProfile?.id]); // CORREÇÃO: Depender do ID do perfil, que é um valor primitivo.

    const handleTranscript = (transcript) => {
        setInputValue(transcript);
        // Apenas preenche o input, não envia mais automaticamente.
        // handleSubmit(null, transcript);
    };

    const handleSubmit = async (e, text = inputValue) => {
        if (e) e.preventDefault();
        if (!text.trim()) return;

        const userMessage = { id: Date.now(), text, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        saveMessage(text, 'user');
        setInputValue('');
        
        // Adiciona a mensagem de "digitando"
        const thinkingMessage = { id: `temp_${Date.now()}`, text: <TypingIndicator />, sender: 'ai', timestamp: new Date() };
        setMessages(prev => [...prev, thinkingMessage]);

        // Lógica de resposta com espera pela análise
        const tryToAnswer = (attempts = 0) => {
            const maxAttempts = 5;
            const delay = 1500;

            if (analysisRef.current) {
                const response = generateAIResponse(text, analysisRef.current);
                const aiMessage = { id: thinkingMessage.id, text: response.text, sender: 'ai', timestamp: new Date() };
                setMessages(prev => prev.map(m => m.id === thinkingMessage.id ? aiMessage : m));
                speakMessage(aiMessage);
                saveMessage(response.text, 'ai');
                return;
            }

            if (attempts >= maxAttempts) {
                const failureResponse = { text: "Desculpe, não consegui carregar os dados no momento. Por favor, tente perguntar novamente." };
                const aiMessage = { id: thinkingMessage.id, text: failureResponse.text, sender: 'ai', timestamp: new Date() };
                setMessages(prev => prev.map(m => m.id === thinkingMessage.id ? aiMessage : m));
                speakMessage(aiMessage);
                saveMessage(failureResponse.text, 'ai');
                return;
            }

            setTimeout(() => tryToAnswer(attempts + 1), delay);
        };

        tryToAnswer();
    };

    const handleDeleteMessage = async (messageId) => {
        // Somente tenta deletar do DB se o ID for uma string (UUID)
        if (typeof messageId === 'string' && messageId.includes('-')) {
            await supabase.from('chat_history').delete().eq('id', messageId);
        }
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const speakMessage = (message) => {
        const synth = window.speechSynthesis;
        if (!synth) {
            alert("Seu navegador não suporta a síntese de voz.");
            return;
        }

        // Se clicou na mensagem que já está falando, para a fala.
        if (speakingMessageId === message.id) {
            synth.cancel();
            setSpeakingMessageId(null);
            return;
        }

        // Para qualquer fala anterior antes de iniciar uma nova.
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = 'pt-BR';
        utterance.onend = () => setSpeakingMessageId(null);
        setSpeakingMessageId(message.id);
        synth.speak(utterance);
    };

    // Função de inteligência, consistente com o AIChatWidgetNew
    const generateAIResponse = (userInput, currentAnalysis) => {
        const lower = userInput.toLowerCase().trim();

        if (!currentAnalysis) {
            return { text: "Ainda estou carregando seus dados. Por favor, tente novamente em um instante." };
        }

        // Comandos de criação
        if (lower.includes('criar') && lower.includes('entrada') || lower.startsWith('registrar entrada')) {
            return { text: 'Para registrar uma entrada, por favor, use o botão "Nova Entrada" na página de Entradas.' };
        }
        if ((lower.includes('criar') && lower.includes('saída')) || lower.includes('registrar gasto') || lower.startsWith('registrar saída')) {
            return { text: 'Para registrar uma saída, por favor, use o botão "Nova Saída" na página de Saídas.' };
        }

        // Perguntas sobre dados
        if (lower.includes('entrada') || lower.includes('entradas')) {
            const relevantTransactions = (currentAnalysis.transactions || []).filter(t => t.type === 'income').slice(0, 5);
            if (relevantTransactions.length === 0) return { text: "Não encontrei nenhuma entrada recente." };
            const list = relevantTransactions.map(t => `- ${t.description || t.category}: R$ ${t.amount.toFixed(2)}`).join('\n');
            return { text: `💰 Suas últimas entradas foram:\n${list}` };
        }

        if (lower.includes('saída') || lower.includes('saídas') || lower.includes('gasto')) {
            const relevantTransactions = (currentAnalysis.transactions || []).filter(t => t.type === 'expense').slice(0, 5);
            if (relevantTransactions.length === 0) return { text: "Não encontrei nenhuma saída recente." };
            const list = relevantTransactions.map(t => `- ${t.description || t.category}: R$ ${t.amount.toFixed(2)}`).join('\n');
            return { text: `💸 Suas últimas saídas foram:\n${list}` };
        }

        if (lower.includes('meta') || lower.includes('metas')) {
            if (!currentAnalysis.goals || currentAnalysis.goals.length === 0) return { text: "Você ainda não tem metas cadastradas." };
            const list = currentAnalysis.goals.map(g => `- ${g.name}: ${((g.current_amount / g.target_amount) * 100).toFixed(0)}%`).join('\n');
            return { text: `🎯 O progresso de suas metas é:\n${list}` };
        }

        if (lower.includes('saldo')) {
            const balance = (currentAnalysis.summary.totalIncome || 0) - (currentAnalysis.summary.totalExpenses || 0);
            return { text: `Seu saldo atual neste mês é de R$ ${balance.toFixed(2)}.` };
        }

        if (lower.includes('recomendação') || lower.includes('dica')) {
            const topRec = currentAnalysis.recommendations?.[0];
            if (topRec) return { text: `💡 Minha principal recomendação para você é: **${topRec.title}**. ${topRec.description}` };
            return { text: "No momento, não tenho novas recomendações para você." };
        }

        if (lower.includes('relatório')) {
            const totalIncome = currentAnalysis.summary.totalIncome || 0;
            const totalExpenses = currentAnalysis.summary.totalExpenses || 0;
            const balance = totalIncome - totalExpenses;
            return { text: `📊 Seu relatório rápido do mês:\nEntradas: R$ ${totalIncome.toFixed(2)}\nSaídas: R$ ${totalExpenses.toFixed(2)}\nSaldo: R$ ${balance.toFixed(2)}` };
        }

        if (lower.includes('assinatura')) {
            if (!currentAnalysis.subscriptions || currentAnalysis.subscriptions.length === 0) return { text: "Você ainda não tem nenhuma assinatura registrada." };
            const list = currentAnalysis.subscriptions.map(s => `- ${s.name}: R$ ${s.amount.toFixed(2)}/${s.billing_cycle === 'monthly' ? 'mês' : 'ano'}`).join('\n');
            return { text: `🔁 Suas assinaturas ativas são:\n${list}` };
        }

        if (lower.includes('conquista')) {
            if (!currentAnalysis.achievements || currentAnalysis.achievements.length === 0) return { text: "Você ainda não desbloqueou nenhuma conquista." };
            const list = currentAnalysis.achievements.map(a => `- 🏆 ${a.name}`).join('\n');
            return { text: `🏅 Suas conquistas desbloqueadas são:\n${list}` };
        }

        return { text: `Desculpe, não entendi. Você pode perguntar sobre:\n- Entradas\n- Saídas\n- Metas\n- Saldo\n- Recomendações` };
    };

    const formatDateSeparator = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // Variável para controlar a exibição do separador de data
    let lastDisplayedDate = null;


    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-h-[800px] bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Assistente IA</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sua especialista em finanças pessoais.</p>
            </div>

            {/* Área do Chat */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => {
                    const messageDate = new Date(msg.timestamp || Date.now()); // Garante que há um timestamp
                    const showDateSeparator = !lastDisplayedDate || messageDate.toDateString() !== lastDisplayedDate.toDateString();
                    if (showDateSeparator) {
                        lastDisplayedDate = messageDate;
                    }

                    return (
                        <div key={msg.id}>
                            {showDateSeparator && (
                                <div className="text-center text-xs text-slate-400 my-4">
                                    {formatDateSeparator(messageDate)}
                                </div>
                            )}
                            <div className={`group flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'user' && (
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity mb-2">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                                        <Bot size={18} />
                                    </div>
                                )}
                                <div className={`max-w-md p-3 rounded-2xl relative ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-lg'}`}>
                                    {typeof msg.text === 'string' 
                                        ? <Markdown className="prose prose-sm dark:prose-invert max-w-none">{msg.text}</Markdown>
                                        : msg.text
                                    }
                                    <div className="text-right text-xs mt-1 opacity-70">
                                        {messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {msg.sender === 'ai' && (
                                        <button onClick={() => speakMessage(msg)} className="absolute -bottom-3 right-2 p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title={speakingMessageId === msg.id ? "Parar áudio" : "Ouvir mensagem"}>
                                            {speakingMessageId === msg.id ? <Square size={12} className="text-red-500" /> : <Volume2 size={12} className="text-slate-500 dark:text-slate-300" />}
                                        </button>
                                    )}
                                </div>
                                {msg.sender === 'ai' && (
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity mb-2">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Área de Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSubmit} className="flex items-center gap-2 p-1 border bg-slate-50 dark:bg-slate-800/50 rounded-xl border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                        type="text"
                        value={isRecording ? "Ouvindo..." : inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Pergunte ou comande a FinanIA..."
                        className="w-full bg-transparent focus:outline-none px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        disabled={isRecording}
                    />
                    <VoiceInputButton
                        onTranscript={handleTranscript}
                        onRecordingStateChange={setIsRecording}
                    />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors">
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}