import { useState, useEffect } from 'react';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import { useAuth } from '../context/AuthContext';
import { useChatHistory } from '../hooks/useChatHistory';
import { 
    MessageCircle, X, Send, Lightbulb, ChevronRight, 
    Zap, TrendingUp, AlertCircle, Brain, Volume2, RotateCcw, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIChatWidget() {
    const { user } = useAuth();
    const { analysis, contextualAdvice, isOpen, setIsOpen, loading, createTransaction, createGoal } = useAIAdvisor();
    const { saveMessage, loadChatHistory } = useChatHistory(user?.id);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
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

    // Initialize chat with welcome message
    useEffect(() => { 
        if (isOpen && user?.id && messages.length === 0) {
            loadChatHistory().then(history => {
                if (history.length > 0) {
                    setMessages(history.map(h => ({
                        text: h.message_text,
                        sender: h.sender,
                        timestamp: new Date(h.timestamp)
                    })));
                } else {
                    addMessage({
                        text: '👋 Olá! Sou sua Assistente Financeira. Posso ajudá-lo a:\n💰 Registrar entradas\n💸 Registrar saídas\n🎯 Criar metas\n📊 Analisar suas finanças',
                        sender: 'ai',
                        timestamp: new Date()
                    });
                }
            });
        }
    }, [isOpen]);

    // Update chat when contextual advice changes
    useEffect(() => {
        if (isOpen && contextualAdvice && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage.text.includes(contextualAdvice.page)) {
                addMessage({
                    text: `${contextualAdvice.icon} ${contextualAdvice.title}\n\n${contextualAdvice.message}`,
                    sender: 'ai',
                    contextual: true,
                    action: contextualAdvice.action,
                    timestamp: new Date()
                });
            }
        }
    }, [contextualAdvice]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
        if (user?.id) {
            saveMessage(message.text, message.sender);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        addMessage({
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        });

        // Generate AI response based on input
        const response = generateAIResponse(inputValue);
        setTimeout(() => {
            addMessage({
                text: response.text,
                sender: 'ai',
                timestamp: new Date(),
                action: response.action
            });
        }, 300);

        setInputValue('');
    };

    const generateAIResponse = (userInput) => {
        const lower = userInput.toLowerCase();

        // Check for creation commands
        if (lower.includes('criar') && lower.includes('entrada')) {
            setShowForm('income');
            return { text: '💰 Vou ajudá-lo a registrar uma entrada!' };
        }
        if (lower.includes('criar') && lower.includes('saída')) {
            setShowForm('expense');
            return { text: '💸 Vou ajudá-lo a registrar uma saída!' };
        }
        if (lower.includes('registrar') && lower.includes('gasto')) {
            setShowForm('expense');
            return { text: '💸 Vou ajudá-lo a registrar um gasto!' };
        }
        if (lower.includes('criar') && (lower.includes('meta') || lower.includes('objetivo'))) {
            setShowForm('goal');
            return { text: '🎯 Vou ajudá-lo a criar uma nova meta!' };
        }

        // Analyze keywords
        if (lower.includes('gastar') || lower.includes('gasto') || lower.includes('expense')) {
            return { text: `💸 Seus gastos totais são R$ ${analysis?.summary.totalExpenses.toFixed(2) || '0'}/mês. Gostaria de registrar um novo gasto?` };
        }
        if (lower.includes('poupar') || lower.includes('economia') || lower.includes('save')) {
            return { text: `💚 Você está poupando ${analysis?.summary.savingsRate || 0}% da sua renda. Seu target deveria ser 20%. Quer ver recomendações?` };
        }
        if (lower.includes('renda') || lower.includes('income') || lower.includes('ganho')) {
            return { text: `📈 Sua renda total é R$ ${analysis?.summary.totalIncome.toFixed(2) || '0'}. Gostaria de registrar uma nova entrada?` };
        }
        if (lower.includes('meta') || lower.includes('goal') || lower.includes('objetivo')) {
            return { text: `🎯 As metas ajudam a manter o foco! Gostaria de criar uma nova meta?` };
        }
        if (lower.includes('anômalo') || lower.includes('estranho') || lower.includes('anomal')) {
            return { text: `🚨 Detectei ${analysis?.anomalies.length || 0} gastos anormais. Quer revisar?` };
        }
        if (lower.includes('recomendação') || lower.includes('dica') || lower.includes('sugestão')) {
            const rec = analysis?.recommendations[0];
            return { text: `💡 Minha recomendação: ${rec?.title}\n\n${rec?.description}` };
        }
        if (lower.includes('saúde') || lower.includes('score') || lower.includes('health')) {
            return { text: `💚 Seu score de saúde financeira é ${analysis?.healthScore || 0}/100. ${analysis?.healthScore >= 70 ? '✅ Excelente!' : '⚠️ Podemos melhorar!'}` };
        }
        if (lower.includes('próximo mês') || lower.includes('previsão') || lower.includes('forecast')) {
            return { text: `🔮 Previsão para o próximo mês: R$ ${analysis?.forecastMonthly?.total.toFixed(2) || '0'} de gastos.` };
        }

        return { text: `😊 Entendi! Diga-me se quer:\n✅ Criar entrada\n✅ Criar saída\n✅ Criar meta\n✅ Ver análise\n\nOu faça outra pergunta!` };
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

    const handleQuickAction = (action) => {
        if (action === 'advisor') {
            navigate('/advisor');
            setIsOpen(false);
        } else if (action === 'income') {
            setShowForm('income');
            addMessage({
                text: '💰 Ótimo! Preencha os dados da entrada abaixo.',
                sender: 'ai',
                timestamp: new Date()
            });
        } else if (action === 'expense') {
            setShowForm('expense');
            addMessage({
                text: '💸 Vou ajudá-lo a registrar a saída!',
                sender: 'ai',
                timestamp: new Date()
            });
        } else if (action === 'goal') {
            setShowForm('goal');
            addMessage({
                text: '🎯 Vamos criar uma meta!',
                sender: 'ai',
                timestamp: new Date()
            });
        } else if (action === 'recommendations') {
            const message = `💡 Principais recomendações:\n\n${analysis?.recommendations.slice(0, 2).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}`;
            addMessage({
                text: message,
                sender: 'ai',
                timestamp: new Date()
            });
        }
    };

    const speakMessage = (text) => {
        if ('speechSynthesis' in window) {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            } else {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'pt-BR';
                utterance.onend = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utterance);
                setIsSpeaking(true);
            }
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

    if (!analysis) {
        return null;
    }

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
                                <h3 className="font-bold text-sm">Assistente IA</h3>
                                <p className="text-xs text-blue-100">{contextualAdvice?.page || 'Online'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => clearChat()}
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

                    {/* Quick Actions - Show when chat is empty */}
                    {messages.length === 1 && !showForm && (
                        <div className="p-4 space-y-2 bg-gradient-to-b from-blue-50 to-transparent">
                            <p className="text-xs text-slate-600 font-medium">Ações rápidas:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleQuickAction('income')}
                                    className="p-2 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Entrada
                                </button>
                                <button
                                    onClick={() => handleQuickAction('expense')}
                                    className="p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Saída
                                </button>
                                <button
                                    onClick={() => handleQuickAction('goal')}
                                    className="p-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Meta
                                </button>
                                <button
                                    onClick={() => handleQuickAction('advisor')}
                                    className="p-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <TrendingUp className="w-3 h-3" />
                                    Análise
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-xs px-4 py-2.5 rounded-lg whitespace-pre-wrap text-sm ${
                                        msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-slate-100 text-slate-900 rounded-bl-none'
                                    }`}
                                >
                                    {msg.text}
                                    {msg.sender === 'ai' && msg.text && (
                                        <button
                                            onClick={() => speakMessage(msg.text)}
                                            className="ml-2 text-xs opacity-70 hover:opacity-100"
                                            title="Ouvir mensagem"
                                        >
                                            <Volume2 className="w-3 h-3 inline" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
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
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Pergunte algo..."
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400"
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
