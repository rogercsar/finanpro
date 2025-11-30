import { useState, useEffect } from 'react';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { useChatHistory } from '../hooks/useChatHistory';
import { 
    MessageCircle, X, Send, Lightbulb, ChevronRight, 
    Zap, TrendingUp, AlertCircle, Brain, Volume2, RotateCcw, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';
import AlertsPanel from './AlertsPanel';

export default function AIChatWidget() {
    const { analysis, contextualAdvice, isOpen, setIsOpen, loading, createTransaction, createGoal } = useAIAdvisor();
    const { user } = useAuth();
    const { unreadAlertCount, createAlert } = useAlerts();
    const { saveMessage, loadChatHistory } = useChatHistory(user?.id);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showAlerts, setShowAlerts] = useState(false);
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();

    // Load chat history on mount
    useEffect(() => {
        if (isOpen && messages.length === 0 && user?.id) {
            loadChatHistory(20).then(history => {
                if (history.length > 0) {
                    setMessages(history.map(h => ({
                        text: h.message_text,
                        sender: h.sender,
                        timestamp: new Date(h.timestamp)
                    })));
                } else {
                    addMessage({
                        text: '👋 Olá! Eu sou a FIFI — sua Assistente Financeira. Como posso ajudá-lo?',
                        sender: 'ai',
                        timestamp: new Date()
                    });
                }
            });
        }
    }, [isOpen, user?.id]);

    // Initialize chat with welcome message if empty
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            addMessage({
                text: '👋 Olá! Eu sou a FIFI — sua Assistente Financeira. Como posso ajudá-lo?',
                sender: 'ai',
                timestamp: new Date()
            });
        }
    }, [isOpen]);

    // Update chat when contextual advice changes
    useEffect(() => {
        if (isOpen && contextualAdvice && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            // Only add new contextual message if it's different
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

    const showToast = (type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;
        // Add user message
        addMessage({
            text: userText,
            sender: 'user',
            timestamp: new Date()
        });

        // Process the input: either continue a pending creation flow or start a new intent
        processUserInput(userText).then((maybeResponse) => {
            if (maybeResponse) {
                setTimeout(() => {
                    addMessage({ text: maybeResponse, sender: 'ai', timestamp: new Date() });
                }, 250);
            }
        });

        setInputValue('');
    };

    // Helpers: validation
    const parseAmount = (text) => {
        if (!text) return null;
        // remove currency symbols and spaces
        let cleaned = text.replace(/[R$\s]/g, '');
        // support formats like 1.500,00 or 1500,00 or 1500.00 or 1,500.00
        // remove thousand separators ('.' when followed by 3 digits) and normalize comma
        cleaned = cleaned.replace(/\.(?=\d{3}(?:[^\d]|$))/g, '');
        cleaned = cleaned.replace(/,/g, '.');
        const match = cleaned.match(/(\d+\.?\d*)/);
        if (!match) return null;
        const n = parseFloat(match[1]);
        return Number.isFinite(n) ? n : null;
    };

    const normalizeDate = (s) => {
        if (!s) return null;
        s = s.trim();
        // If already YYYY-MM-DD and valid
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [year, month, day] = s.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? s : null;
        }
        // Accept DD/MM/YYYY or D/M/YYYY
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
            const day = m[1].padStart(2, '0');
            const month = m[2].padStart(2, '0');
            return normalizeDate(`${m[3]}-${month}-${day}`); // Re-validate the constructed date string
        }
        // Try loose extraction YYYYMMDD
        const compact = s.match(/(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);
        if (compact) {
            const iso = `${compact[1]}-${compact[2]}-${compact[3]}`;
            // Re-validate to be safe
            return normalizeDate(iso);
        }
        return null;
    };

    const isValidDate = (s) => !!normalizeDate(s);

    const extractCategory = (text) => {
        if (!text) return '';
        const known = ['alimentação','moradia','transporte','lazer','saúde','saude','educação','educacao','salário','salario','freelance','investimentos','outros','contas','mercado','supermercado','restaurante'];
        const lower = text.toLowerCase();
        // try to find known category tokens
        for (const cat of known) {
            if (lower.includes(cat)) return capitalizeCategory(cat);
        }
        // fallback: heuristic after number
        const cleaned = text.replace(/[.,]/g, ' ');
        const parts = cleaned.split(/\s+/).filter(Boolean);
        for (let i = 0; i < parts.length; i++) {
            if (/^\d+[.,]?\d*$/.test(parts[i])) {
                const cat = parts.slice(i + 1).join(' ');
                return cat || '';
            }
        }
        return '';
    };

    const capitalizeCategory = (s) => {
        if (!s) return s;
        // restore accents for some simple words
        const map = { 'saude': 'Saúde', 'salario': 'Salário', 'educacao': 'Educação' };
        if (map[s]) return map[s];
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    // Main processor for inputs: handles starting and continuing creation flows
    const processUserInput = async (rawText) => {
        const text = rawText.trim();
        const normalized = text.replace(/^\s*[-–—]\s*/u, '').replace(/[.,;:!?()\[\]"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

        // If user typed 'cancelar' during flow
        if (pendingAction && (normalized === 'cancelar' || normalized === 'cancel')) {
            setPendingAction(null);
            return '🛑 Operação cancelada. Se quiser, diga "criar entrada", "criar saída" ou "criar meta".';
        }

        // If we are in the middle of collecting data
        if (pendingAction) {
            const { type, data, expectedField } = pendingAction;
            // interpret input as answer to expectedField
            let value = text;
            if (expectedField === 'amount' || expectedField === 'targetAmount') {
                const amt = parseAmount(text);
                if (!amt || amt <= 0) {
                    return '❌ Valor inválido. Informe um número maior que 0, por exemplo: 1500 ou 1500.50';
                }
                // store as string/number
                data[expectedField] = amt;
            } else if (expectedField === 'date' || expectedField === 'deadline') {
                if (!isValidDate(text)) {
                    return '❌ Data inválida. Use o formato AAAA-MM-DD (por exemplo: 2025-12-31).';
                }
                data[expectedField] = text;
            } else if (expectedField === 'category') {
                if (!text) return '❌ Categoria inválida. Informe a categoria (ex: Alimentação, Salário, Transporte).';
                data.category = text;
            } else if (expectedField === 'goalName') {
                if (!text) return '❌ Nome da meta inválido. Informe um nome curto para a meta.';
                data.goalName = text;
            } else if (expectedField === 'description') {
                data.description = text;
            }

            // Find next missing field
            const next = getNextFieldForType(type, data);
            if (next) {
                setPendingAction({ type, data, expectedField: next });
                return questionForField(next, type);
            }

            // All data collected -> call create
            setPendingAction(null);
            if (type === 'income' || type === 'expense') {
                const res = await createTransaction(type === 'income' ? 'income' : 'expense', data.amount, data.category || 'Outros', data.description || '', data.date || null);
                
                // Create success toast and alert
                if (res.success) {
                    showToast('success', 'Transação Criada', `${data.category}: R$ ${data.amount.toFixed(2)}`);
                    await createAlert(
                        'transaction_created',
                        `${type === 'income' ? '💰' : '💸'} ${type === 'income' ? 'Entrada' : 'Saída'} registrada`,
                        `R$ ${data.amount.toFixed(2)} em ${data.category}`,
                        'low',
                        data.category
                    );
                }
                return res.message || '✅ Transação criada.';
            } else if (type === 'goal') {
                const res = await createGoal(data.goalName, data.targetAmount, data.deadline, data.description || '');
                if (res.success) {
                    showToast('success', 'Meta Criada', `${data.goalName}: R$ ${data.targetAmount.toFixed(2)}`);
                    await createAlert(
                        'goal_created',
                        '🎯 Meta criada',
                        `${data.goalName} - R$ ${data.targetAmount.toFixed(2)}`,
                        'low'
                    );
                }
                return res.message || '✅ Meta criada.';
            }
        }

        // Not in a flow: detect creation intents (with optional inline params)
        if (normalized.includes('criar') && (normalized.includes('entrada') || normalized.includes('entradas'))) {
            // try to parse inline amount/category/date
            const amt = parseAmount(text);
            const category = extractCategory(text) || '';
            const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
            const date = dateMatch ? dateMatch[0] : '';
            const data = { amount: amt, category: category, date };
            const next = getNextFieldForType('income', data);
            if (!next) {
                const res = await createTransaction('income', data.amount, data.category || 'Outros', '', data.date || null);
                return res.message || '✅ Entrada criada.';
            }
            setPendingAction({ type: 'income', data, expectedField: next });
            return questionForField(next, 'income');
        }

        if (normalized.includes('criar') && (normalized.includes('saida') || normalized.includes('saída') || normalized.includes('gasto') || normalized.includes('gastos'))) {
            const amt = parseAmount(text);
            const category = extractCategory(text) || '';
            const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
            const date = dateMatch ? dateMatch[0] : '';
            const data = { amount: amt, category: category, date };
            const next = getNextFieldForType('expense', data);
            if (!next) {
                const res = await createTransaction('expense', data.amount, data.category || 'Outros', '', data.date || null);
                return res.message || '✅ Saída criada.';
            }
            setPendingAction({ type: 'expense', data, expectedField: next });
            return questionForField(next, 'expense');
        }

        if (normalized.includes('criar') && (normalized.includes('meta') || normalized.includes('objetivo'))) {
            // try parse: meta NAME AMOUNT DATE
            const amt = parseAmount(text);
            const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
            const date = dateMatch ? dateMatch[0] : '';
            // extract name: words between 'meta' and amount/date
            const nameMatch = text.match(/meta\s+([a-zA-ZÀ-ÿ0-9\s]+?)\s+(\d|\d{4}-\d{2}-\d{2})/i);
            const goalName = nameMatch ? nameMatch[1].trim() : '';
            const data = { goalName, targetAmount: amt, deadline: date };
            const next = getNextFieldForType('goal', data);
            if (!next) {
                const res = await createGoal(data.goalName, data.targetAmount, data.deadline || null, '');
                return res.message || '✅ Meta criada.';
            }
            setPendingAction({ type: 'goal', data, expectedField: next });
            return questionForField(next, 'goal');
        }

        // Fallback to existing responses
        return generateAIResponse(rawText);
    };

    const getNextFieldForType = (type, data) => {
        if (type === 'income' || type === 'expense') {
            if (!data.amount) return 'amount';
            if (!data.category) return 'category';
            if (!data.date) return 'date';
            return null;
        }
        if (type === 'goal') {
            if (!data.goalName) return 'goalName';
            if (!data.targetAmount) return 'targetAmount';
            if (!data.deadline) return 'deadline';
            return null;
        }
        return null;
    };

    const questionForField = (field, type) => {
        const map = {
            amount: 'Qual o valor? (ex: 1500 ou 1500.50)',
            category: 'Qual a categoria? (ex: Alimentação, Moradia, Salário)',
            date: 'Qual a data? Use AAAA-MM-DD (ex: 2025-12-31)',
            goalName: 'Qual o nome da meta?',
            targetAmount: 'Qual o valor alvo da meta? (ex: 3000)',
            deadline: 'Qual a data limite? Use AAAA-MM-DD (ex: 2026-06-30)'
        };
        return `❓ ${map[field]}`;
    };

    const generateAIResponse = (userInput) => {
        // Normalize input: remove leading hyphens, punctuation and extra spaces
        let normalized = userInput.replace(/^\s*[-–—]\s*/u, ''); // remove leading dash-like chars
        normalized = normalized.replace(/[.,;:!?()\[\]"']/g, '');
        normalized = normalized.replace(/\s+/g, ' ').trim().toLowerCase();

        const lower = normalized;

        // Detect explicit create commands first (covers '- criar entrada', 'criar entrada 500', etc.)
        if (lower.includes('criar') && (lower.includes('entrada') || lower.includes('entradas') || lower.includes('entrada'))) {
            return `💰 Entendi — você quer criar uma entrada. Diga por exemplo: "entrada 500 salário" ou clique em Entrada nas ações rápidas.`;
        }
        if (lower.includes('criar') && (lower.includes('saida') || lower.includes('saída') || lower.includes('saídas') || lower.includes('gasto') || lower.includes('gastos'))) {
            return `💸 Entendi — você quer criar uma saída. Diga por exemplo: "saída 100 alimentação" ou clique em Saída nas ações rápidas.`;
        }
        if (lower.includes('criar') && (lower.includes('meta') || lower.includes('objetivo') || lower.includes('metas') || lower.includes('objetivos'))) {
            return `🎯 Entendi — você quer criar uma meta. Diga por exemplo: "meta férias 5000 2025-12-31" ou clique em Meta nas ações rápidas.`;
        }

        // Analyze keywords
        if (lower.includes('gastar') || lower.includes('gasto') || lower.includes('expense')) {
            return `💸 Seus gastos totais são R$ ${analysis?.summary.totalExpenses.toFixed(2) || '0'}/mês. Gostaria de dicas para reduzir?`;
        }
        if (lower.includes('poupar') || lower.includes('economia') || lower.includes('save')) {
            return `💚 Você está poupando ${analysis?.summary.savingsRate || 0}% da sua renda. Seu target deveria ser 20%. Quer ver recomendações?`;
        }
        if (lower.includes('renda') || lower.includes('income') || lower.includes('ganho')) {
            return `📈 Sua renda total é R$ ${analysis?.summary.totalIncome.toFixed(2) || '0'}. Gostaria de explorar fontes de renda?`;
        }
        if (lower.includes('meta') || lower.includes('goal') || lower.includes('objetivo')) {
            return `🎯 As metas ajudam a manter o foco! Que tipo de meta gostaria de criar?`;
        }
        if (lower.includes('anômalo') || lower.includes('estranho') || lower.includes('anomal')) {
            return `🚨 Detectei ${analysis?.anomalies.length || 0} gastos anormais. Quer revisar? Vou te mostrar quais saíram do padrão!`;
        }
        if (lower.includes('recomendação') || lower.includes('dica') || lower.includes('sugestão')) {
            const rec = analysis?.recommendations[0];
            return `💡 Minha recomendação de prioridade máxima: ${rec?.title}\n\n${rec?.description}`;
        }
        if (lower.includes('saúde') || lower.includes('score') || lower.includes('health')) {
            return `💚 Seu score de saúde financeira é ${analysis?.healthScore || 0}/100. ${analysis?.healthScore >= 70 ? '✅ Excelente!' : '⚠️ Podemos melhorar!'}`;
        }
        if (lower.includes('próximo mês') || lower.includes('previsão') || lower.includes('forecast')) {
            return `🔮 Previsão para o próximo mês: R$ ${analysis?.forecastMonthly?.total.toFixed(2) || '0'} de gastos. Quer detalhes por categoria?`;
        }

        // Default response
        return `😊 Entendi! Você perguntou sobre "${userInput}". Eu sou a FIFI — Posso te ajudar com: gastos, economia, renda, metas, recomendações, saúde financeira ou previsões. O que te interessa?`;
    };

    const handleQuickAction = (action) => {
        if (action === 'advisor') {
            navigate('/advisor');
            setIsOpen(false);
        } else if (action === 'recommendations') {
            const message = `💡 Minhas principais recomendações:\n\n${analysis?.recommendations.slice(0, 2).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}`;
            addMessage({
                text: message,
                sender: 'ai',
                timestamp: new Date()
            });
            
            // Create alerts for top 2 recommendations
            analysis?.recommendations.slice(0, 2).forEach(async (rec) => {
                await createAlert(
                    'recommendation',
                    `💡 ${rec.priority === 'alta' ? '🔴' : rec.priority === 'média' ? '🟡' : '🟢'} Recomendação`,
                    rec.title,
                    rec.priority === 'alta' ? 'high' : rec.priority === 'média' ? 'medium' : 'low',
                    null,
                    { title: rec.title, description: rec.description, action: rec.action }
                );
            });
        } else if (action === 'anomalies') {
            const message = `🚨 Gastos anormais detectados:\n\n${analysis?.anomalies.slice(0, 3).map((a, i) => `${i + 1}. ${a.transaction} - R$ ${a.amount.toFixed(2)}`).join('\n')}`;
            addMessage({
                text: message,
                sender: 'ai',
                timestamp: new Date()
            });
            
            // Create alerts for anomalies
            analysis?.anomalies.slice(0, 3).forEach(async (anomaly) => {
                await createAlert(
                    'anomaly_alert',
                    '🚨 Gasto Anormal',
                    `${anomaly.category}: R$ ${anomaly.amount.toFixed(2)}`,
                    'high',
                    anomaly.category,
                    anomaly
                );
            });
        } else if (action === 'insights') {
            const message = `✨ Insights principais:\n\n${analysis?.insights.slice(0, 3).join('\n')}`;
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
            text: '👋 Olá! Eu sou a FIFI — sua Assistente Financeira. Como posso ajudá-lo?',
            sender: 'ai',
            timestamp: new Date()
        }]);
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
                                <h3 className="font-bold text-sm">FIFI</h3>
                                <p className="text-xs text-blue-100">{contextualAdvice?.page || 'Online'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAlerts(!showAlerts)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors relative"
                                title="Ver alertas"
                            >
                                <Bell className="w-4 h-4" />
                                {unreadAlertCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                        {unreadAlertCount}
                                    </span>
                                )}
                            </button>
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
                    {messages.length === 1 && (
                        <div className="p-4 space-y-2 bg-gradient-to-b from-blue-50 to-transparent">
                            <p className="text-xs text-slate-600 font-medium">Ações rápidas:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleQuickAction('recommendations')}
                                    className="p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <Lightbulb className="w-3 h-3" />
                                    Recomendações
                                </button>
                                <button
                                    onClick={() => handleQuickAction('anomalies')}
                                    className="p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    Anomalias
                                </button>
                                <button
                                    onClick={() => handleQuickAction('insights')}
                                    className="p-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <Zap className="w-3 h-3" />
                                    Insights
                                </button>
                                <button
                                    onClick={() => handleQuickAction('advisor')}
                                    className="p-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-1"
                                >
                                    <TrendingUp className="w-3 h-3" />
                                    Completo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Alerts Panel */}
                    {showAlerts && (
                        <div className="border-b border-slate-200 bg-slate-50">
                            <AlertsPanel />
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

                    {/* Input */}
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
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed bottom-6 left-6 z-50 space-y-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            type={toast.type}
                            title={toast.title}
                            message={toast.message}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
