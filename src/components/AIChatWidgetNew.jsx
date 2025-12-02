import { useState, useEffect, useRef } from 'react';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import { useAuth } from '../context/AuthContext';
import { useChatHistory } from '../hooks/useChatHistory';
import { supabase } from '../lib/supabase'; // Importar o Supabase
import { 
    X, Send, Brain, Volume2, RotateCcw, Plus, TrendingUp, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceInputButton from './VoiceInputButton';

export default function AIChatWidget() {
    const { user } = useAuth();
    const { analysis, contextualAdvice, isOpen, setIsOpen, loading, createTransaction, createGoal } = useAIAdvisor();
    const { saveMessage, loadChatHistory, deleteMessage } = useChatHistory(user?.id);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showForm, setShowForm] = useState(null); // 'income', 'expense', 'goal'
    const [formData, setFormData] = useState({ 
        amount: '', 
        category: '', 
        description: '', 
        date: new Date().toISOString().split('T')[0],
        targetAmount: '', 
        goalName: '', 
        deadline: '' 
    });
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);

    // Usamos uma ref para garantir que a função de resposta sempre tenha acesso à análise mais recente
    const analysisRef = useRef(analysis);
    useEffect(() => {
        analysisRef.current = analysis;
    }, [analysis]);

    // Componente para o efeito de "digitando"
    const TypingIndicator = () => (
        <div className="flex items-center gap-2 p-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );

    // Initialize chat with welcome message
    useEffect(() => { 
        if (isOpen && user?.id && messages.length === 0) {
            loadChatHistory().then(history => {
                if (history.length > 0) {
                    setMessages(history.map(h => ({
                        text: h.message_text,
                        id: h.id, // Assumindo que o histórico retorna um ID
                        sender: h.sender,
                        timestamp: new Date(h.timestamp)
                    })));
                } else {
                    addMessage({
                        text: '👋 Olá! Sou sua Assistente Financeira. Posso ajudá-lo a:\n💰 Registrar entradas\n💸 Registrar saídas\n🎯 Criar metas\n📊 Analisar suas finanças',
                        sender: 'ai',
                        id: 'welcome_message', // Fixed ID for welcome message
                        timestamp: new Date()
                    });
                }
            });
        }
    }, [isOpen]);

    // Efeito para rolar o chat para o final quando novas mensagens chegam
    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, { ...message, id: message.id || Date.now() }]);
        
        // Salva a mensagem do usuário sempre.
        if (user?.id && message.sender === 'user') {
            saveMessage(message.text, message.sender);
        }
    };

    const handleSendMessage = (e, quickActionText = null) => {
        if (e) e.preventDefault();
        
        const text = quickActionText || inputValue;
        if (!text.trim()) return;

        // Add user message
        addMessage({
            text: text,
            sender: 'user',
            timestamp: new Date()
        });

        // Adiciona a mensagem de "digitando"
        const thinkingMessage = { id: `temp_${Date.now()}`, text: <TypingIndicator />, sender: 'ai', timestamp: new Date() };
        setMessages(prev => [...prev, thinkingMessage]);

        // Lógica de resposta com espera pela análise
        const tryToAnswer = () => {
            const response = generateAIResponse(text, analysisRef.current);
            
            // Se a resposta for para abrir um formulário, não salva a mensagem da IA
            if (response.action === 'show_form') {
                 setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id)); // Remove "digitando"
            } else {
                const aiMessage = { id: thinkingMessage.id, text: response.text, sender: 'ai', timestamp: new Date() };
                setMessages(prev => prev.map(m => m.id === thinkingMessage.id ? aiMessage : m));
                if (typeof response.text === 'string') {
                    saveMessage(response.text, 'ai'); // Salva a resposta da IA no histórico
                }
            }
        };

        // Simula um pequeno delay para o "pensamento" da IA
        setTimeout(tryToAnswer, 500);

        setInputValue('');
    };

    const generateAIResponse = (userInput, currentAnalysis) => {
        const lower = userInput.toLowerCase();

        // ETAPA 1: Comandos de Ação (abrir formulário)
        if (lower.match(/registrar entrada|nova entrada|criar entrada/)) {
            setShowForm('income');
            return { text: 'Ok! Preencha os dados da nova entrada abaixo.', action: 'show_form' };
        }
        if (lower.match(/registrar saída|nova saída|criar saída|registrar gasto/)) {
            setShowForm('expense');
            return { text: 'Ok! Preencha os dados da nova saída abaixo.', action: 'show_form' };
        }
        if (lower.match(/nova meta|criar meta/)) {
            setShowForm('goal');
            return { text: 'Ok! Preencha os dados da nova meta abaixo.', action: 'show_form' };
        }
        if (lower.match(/nova assinatura|registrar assinatura/)) {
            return { text: 'Para adicionar uma nova assinatura, por favor, use o botão "Nova Assinatura" na página de Assinaturas.' };
        }

        // ETAPA 2: Consultas de Dados
        if (!currentAnalysis) {
            return { text: "Ainda estou carregando seus dados. Por favor, tente novamente em um instante." };
        }

        if (lower.match(/ver saldo/)) {
            const balance = (currentAnalysis.summary.totalIncome || 0) - (currentAnalysis.summary.totalExpenses || 0);
            return { text: `Seu saldo atual neste mês é de R$ ${balance.toFixed(2)}.` };
        }
        if (lower.match(/ver moedas/)) {
            return { text: "Para ver e configurar moedas, por favor, vá para a seção 'Moedas' no menu de configurações." };
        }
        if (lower.match(/ver relatórios/)) {
            const { totalIncome = 0, totalExpenses = 0 } = currentAnalysis.summary;
            return { text: `📊 Relatório rápido:\n- Entradas: R$ ${totalIncome.toFixed(2)}\n- Saídas: R$ ${totalExpenses.toFixed(2)}` };
        }
        if (lower.match(/ver conquistas/)) {
            if (!currentAnalysis.achievements || currentAnalysis.achievements.length === 0) return { text: "Você ainda não desbloqueou nenhuma conquista." };
            const list = currentAnalysis.achievements.map(a => `- 🏆 ${a.name}`).join('\n');
            return { text: `🏅 Suas conquistas:\n${list}` };
        }
        if (lower.match(/ver entradas/)) {
            const incomes = (currentAnalysis.transactions || []).filter(t => t.type === 'income').slice(0, 3);
            if (incomes.length === 0) return { text: "Não encontrei nenhuma entrada recente." };
            const list = incomes.map(t => `- ${t.description || t.category}: R$ ${t.amount.toFixed(2)}`).join('\n');
            return { text: `💰 Suas últimas entradas:\n${list}` };
        }
        if (lower.match(/ver saídas/)) {
            const expenses = (currentAnalysis.transactions || []).filter(t => t.type === 'expense').slice(0, 3);
            if (expenses.length === 0) return { text: "Não encontrei nenhuma saída recente." };
            const list = expenses.map(t => `- ${t.description || t.category}: R$ ${t.amount.toFixed(2)}`).join('\n');
            return { text: `💸 Suas últimas saídas:\n${list}` };
        }
        if (lower.match(/ver metas/)) {
            if (!currentAnalysis.goals || currentAnalysis.goals.length === 0) return { text: "Você ainda não tem metas cadastradas." };
            const list = currentAnalysis.goals.map(g => `- ${g.name}: ${((g.current_amount / g.target_amount) * 100).toFixed(0)}%`).join('\n');
            return { text: `🎯 O progresso de suas metas é:\n${list}` };
        }
        if (lower.match(/ver assinaturas/)) {
            if (!currentAnalysis.subscriptions || currentAnalysis.subscriptions.length === 0) return { text: "Você ainda não tem nenhuma assinatura registrada." };
            const list = currentAnalysis.subscriptions.map(s => `- ${s.name}: R$ ${s.amount.toFixed(2)}`).join('\n');
            return { text: `🔁 Suas assinaturas ativas:\n${list}` };
        }

        return { text: `Desculpe, não entendi. Você pode usar os botões de ação rápida ou digitar um comando.` };
    };

    const handleSubmitForm = async () => {
        try {
            let response;
            
            if (showForm === 'income') {
                response = await createTransaction(
                    'income',
                    formData.amount,
                    formData.category,
                    formData.description,
                    formData.date
                );
            } else if (showForm === 'expense') {
                response = await createTransaction(
                    'expense',
                    formData.amount,
                    formData.category,
                    formData.description,
                    formData.date
                );
            } else if (showForm === 'goal') {
                response = await createGoal(
                    formData.goalName,
                    formData.targetAmount,
                    formData.deadline,
                    formData.description
                );
            }

            addMessage({
                text: response.message,
                sender: 'ai',
                timestamp: new Date()
            });

            // Reset form
            setShowForm(null);
            setFormData({ 
                amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0],
                targetAmount: '', goalName: '', deadline: '' 
            });
        } catch (error) {
            addMessage({
                text: `❌ Erro: ${error.message}`,
                sender: 'ai',
                timestamp: new Date()
            });
        }
    };

    const speakMessage = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    const clearChat = () => {
        setMessages([{
            text: '👋 Olá! Sou sua Assistente Financeira. Posso ajudá-lo a:\n💰 Registrar entradas\n💸 Registrar saídas\n🎯 Criar metas\n📊 Analisar suas finanças',
            sender: 'ai',
            timestamp: new Date()
        }]);
        setShowForm(null);
    };

    const handleDeleteMessage = async (messageId) => {
        // Usa a função centralizada do hook para deletar
        await deleteMessage(messageId);
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <div className="relative">
                        <Brain className="w-6 h-6" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    </div>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[600px]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            <div>
                                <h3 className="font-bold text-sm">FIFI</h3>
                                <p className="text-xs text-blue-100">{contextualAdvice?.page || 'Online'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearChat}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                title="Limpar chat"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {!showForm && (
                        <div className="p-3 border-b border-slate-200 bg-slate-50/50">
                            <div className="mb-2">
                                <p className="text-xs font-semibold text-slate-500 mb-1">Registrar:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => handleSendMessage(null, 'Registrar entrada')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Entrada</button>
                                    <button onClick={() => handleSendMessage(null, 'Registrar saída')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Saída</button>
                                    <button onClick={() => handleSendMessage(null, 'Criar meta')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Meta</button>
                                    <button onClick={() => handleSendMessage(null, 'Registrar assinatura')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Assinatura</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Consultar:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => handleSendMessage(null, 'Ver saldo')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Saldo</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver moedas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Moedas</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver relatórios')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Relatórios</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver conquistas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Conquistas</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver entradas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Entradas</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver saídas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Saídas</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver metas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Metas</button>
                                    <button onClick={() => handleSendMessage(null, 'Ver assinaturas')} className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Assinaturas</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                        {messages.map((msg) => {
                            const messageDate = new Date(msg.timestamp || Date.now());
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
                                    <div className={`group flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.sender === 'user' && (
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity mb-2">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <div
                                            className={`max-w-xs px-3 py-2 rounded-2xl whitespace-pre-wrap text-sm relative ${
                                                msg.sender === 'user'
                                                    ? 'bg-blue-600 text-white rounded-br-lg'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-bl-lg'
                                            }`}
                                        >
                                            {typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>) : msg.text}
                                            <div className={`text-right text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                {messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {msg.sender === 'ai' && typeof msg.text === 'string' && (
                                                <button onClick={() => speakMessage(msg.text)} className="absolute -bottom-3 right-2 p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="Ouvir mensagem">
                                                    <Volume2 size={12} className="text-slate-500 dark:text-slate-300" />
                                                </button>
                                            )}
                                        </div>
                                        {msg.sender === 'ai' && (
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity mb-2">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 text-slate-900 px-4 py-2.5 rounded-lg">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form for creating transactions/goals */}
                    {showForm && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                            {(showForm === 'income' || showForm === 'expense') && (
                                <>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Valor (R$)"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                                    />
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                                    >
                                        <option value="">Selecione categoria</option>
                                        {showForm === 'income' ? (
                                            <>
                                                <option value="Salário">Salário</option>
                                                <option value="Freelance">Freelance</option>
                                                <option value="Investimentos">Investimentos</option>
                                                <option value="Outros">Outros</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Alimentação">Alimentação</option>
                                                <option value="Moradia">Moradia</option>
                                                <option value="Transporte">Transporte</option>
                                                <option value="Lazer">Lazer</option>
                                                <option value="Saúde">Saúde</option>
                                                <option value="Educação">Educação</option>
                                                <option value="Outros">Outros</option>
                                            </>
                                        )}
                                    </select>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Descrição (opcional)"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                                    />
                                </>
                            )}
                            {showForm === 'goal' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Nome da meta"
                                        value={formData.goalName}
                                        onChange={(e) => setFormData({...formData, goalName: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Valor alvo (R$)"
                                        value={formData.targetAmount}
                                        onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                                    />
                                    <input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Descrição (opcional)"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400"
                                    />
                                </>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowForm(null)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmitForm}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    {!showForm && (
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex items-center gap-2">
                            <input
                                type="text"
                                value={isRecording ? "Ouvindo..." : inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Pergunte algo..."
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400"
                                disabled={isRecording || loading}
                            />
                            <VoiceInputButton
                                onTranscript={(t) => setInputValue(t)}
                                onRecordingStateChange={setIsRecording}
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}