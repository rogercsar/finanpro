import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, AlertTriangle, Upload } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Palavras-chave para identificar eventos de risco
const riskKeywords = [
    'jantar', 'almoço', 'restaurante', 'bar', 'happy hour', 'festa',
    'viagem', 'férias', 'passeio', 'show', 'cinema', 'teatro',
    'compras', 'shopping', 'mercado', 'feira', 'presente'
];

export default function CalendarRiskWidget() {
    const [riskEvents, setRiskEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setFileName(file.name);
        setLoading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            // A lógica de parsing de um arquivo .ics é complexa.
            // Para uma implementação real, usaríamos uma biblioteca como 'ical.js'.
            // Aqui, vamos simular a extração de eventos para demonstrar a funcionalidade.
            const simulatedEvents = parseIcsContent(content);

            const identifiedRisks = simulatedEvents.filter(event => {
                const title = event.summary?.toLowerCase() || '';
                return riskKeywords.some(keyword => title.includes(keyword));
            });

            setRiskEvents(identifiedRisks);
            setLoading(false);
        };

        reader.readAsText(file);
    };

    // Função de simulação para parsing do .ics
    const parseIcsContent = (content) => {
        // Em um cenário real, esta função usaria uma biblioteca para extrair os eventos.
        // Exemplo de simulação:
        const today = new Date();
        return [
            { id: '1', summary: 'Jantar com amigos', start: { date: today.toISOString().split('T')[0] } },
            { id: '2', summary: 'Viagem de fim de semana', start: { date: new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0] } },
        ];
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isToday(date)) return 'Hoje';
        if (isTomorrow(date)) return 'Amanhã';
        return format(date, "EEEE, dd/MM", { locale: ptBR });
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-purple-500" />
                Previsão de Gastos (Calendário)
            </h3>

            <div className="text-center py-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Exporte seu calendário (Google, Outlook, Apple) como um arquivo `.ics` e importe aqui para receber alertas sobre eventos que podem gerar gastos.
                </p>
                <label htmlFor="ics-upload" className="cursor-pointer btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2 mx-auto w-fit">
                    <Upload className="w-4 h-4" /> Importar Calendário (.ics)
                </label>
                <input id="ics-upload" type="file" accept=".ics" className="hidden" onChange={handleFileChange} />
                {fileName && <p className="text-xs text-slate-500 mt-2">Arquivo: {fileName}</p>}
            </div>

            {loading ? (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Analisando seu calendário...</p>
            ) : riskEvents.length === 0 ? (
                fileName && <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Nenhum evento com potencial de gastos encontrado no arquivo importado.</p>
            ) : (
                <div className="space-y-3">
                    {riskEvents.slice(0, 4).map(event => (
                        <div key={event.id} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-500/30 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{event.summary}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{formatDate(event.start.dateTime || event.start.date)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
