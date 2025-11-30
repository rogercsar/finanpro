import { useState } from 'react';
import { Upload, X, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { parse } from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Configure o worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FileImporter({ onImportSuccess }) {
    const { user } = useAuth();
    const { createAlert } = useAlerts();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Preview
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [mapping, setMapping] = useState({
        date: '',
        description: '',
        amount: '',
    });

    const resetState = () => {
        setStep(1);
        setFile(null);
        setHeaders([]);
        setRows([]);
        setMapping({ date: '', description: '', amount: '' });
    };

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Lógica para CSV
        setFile(selectedFile);
        setLoading(true);

        parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setHeaders(results.meta.fields);
                setRows(results.data);
                setStep(2);
                setLoading(false);
            },
            error: (err) => {
                createAlert('csv_error', 'Erro ao ler CSV', err.message, 'error');
                setLoading(false);
            }
        });
    };

    const handlePdfFile = async (file) => {
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const typedarray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ');
                }
                parseNubankPdf(fullText);
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            createAlert('pdf_error', 'Erro ao ler PDF', error.message, 'error');
            setLoading(false);
        }
    };

    const parseNubankPdf = (text) => {
        // Regex para encontrar o ano da fatura (ex: VENCIMENTO 20 DEZ 2025)
        const yearMatch = text.match(/VENCIMENTO\s+\d{2}\s+[A-Z]{3}\s+(\d{4})/);
        const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

        // Regex para encontrar as transações
        const transactionRegex = /(\d{2}\s[A-Z]{3})\s+(.+?)\s+([\d.,]+)/g;
        const transactions = [];
        let match;

        const monthMap = { 'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12' };

        while ((match = transactionRegex.exec(text)) !== null) {
            const [_, dateStr, description, amountStr] = match;
            
            // Ignorar linhas que não são transações (ex: "Pagamento recebido")
            if (description.toLowerCase().includes('pagamento em')) continue;

            const [day, monthAbbr] = dateStr.split(' ');
            const month = monthMap[monthAbbr];

            transactions.push({
                date: `${year}-${month}-${day}`,
                description: description.trim(),
                amount: parseFloat(amountStr.replace(/\./g, '').replace(',', '.')),
                type: 'expense' // Fatura de cartão é sempre despesa
            });
        }

        if (transactions.length > 0) {
            setRows(transactions);
            setStep(3); // Pula direto para a pré-visualização
        } else {
            createAlert('pdf_parse_error', 'Nenhuma transação encontrada', 'Não foi possível extrair transações do PDF. Verifique se é um extrato do Nubank.', 'warning');
        }
        setLoading(false);
    };

    const getMappedTransactions = () => {
        return rows.map(row => {
            const rawAmount = row[mapping.amount] || '0';
            // Handle Brazilian currency format (e.g., "1.234,56")
            const amount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));

            // Handle different date formats (DD/MM/YYYY or YYYY-MM-DD)
            const rawDate = row[mapping.date];
            let date;
            if (rawDate?.includes('/')) {
                const [day, month, year] = rawDate.split('/');
                date = `${year}-${month}-${day}`;
            } else {
                date = rawDate;
            }

            return {
                date,
                description: row[mapping.description],
                amount: isNaN(amount) ? 0 : amount,
                type: amount > 0 ? 'income' : 'expense',
            };
        }).filter(t => t.amount !== 0);
    };

    const handleConfirmImport = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const transactionsToInsert = getMappedTransactions().map(t => ({
                user_id: user.id,
                date: t.date,
                description: t.description,
                amount: Math.abs(t.amount), // Amount should always be positive
                type: t.type,
                category: 'Importado', // Default category for imported items
            }));

            const { error } = await supabase
                .from('transactions')
                .insert(transactionsToInsert);

            if (error) throw error;

            createAlert('import_success', 'Importação Concluída', `${transactionsToInsert.length} transações foram importadas.`, 'success');
            resetState();
            if (onImportSuccess) onImportSuccess();
        } catch (error) {
            createAlert('import_error', 'Erro na Importação', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="flex gap-2">
                        <label className="flex-1 p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors flex flex-col items-center gap-2 text-center">
                            <Upload className="w-6 h-6 text-blue-600" />
                            <p className="text-sm font-medium text-slate-900">Importar CSV</p>
                            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" disabled={loading} />
                        </label>
                        <label className="flex-1 p-4 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors flex flex-col items-center gap-2 text-center">
                            <Upload className="w-6 h-6 text-purple-600" />
                            <p className="text-sm font-medium text-slate-900">Importar PDF (Nubank)</p>
                            <input type="file" accept=".pdf" onChange={(e) => handlePdfFile(e.target.files[0])} className="hidden" disabled={loading} />
                        </label>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-slate-900">Mapeie as colunas do seu arquivo:</p>
                        {['date', 'description', 'amount'].map(field => (
                            <div key={field}>
                                <label className="block text-xs font-semibold text-slate-600 mb-1 capitalize">
                                    {field === 'date' ? 'Data' : field === 'description' ? 'Descrição' : 'Valor'}
                                </label>
                                <select
                                    value={mapping[field]}
                                    onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                >
                                    <option value="">Selecione uma coluna...</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <button onClick={resetState} className="btn-ghost flex-1">Cancelar</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!mapping.date || !mapping.description || !mapping.amount}
                                className="btn-primary flex-1"
                            >
                                Pré-visualizar <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                );
            case 3:
                const previewTransactions = (mapping.date ? getMappedTransactions() : rows).slice(0, 5);
                return (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-slate-900">Pré-visualização da importação:</p>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                            {previewTransactions.map((t, i) => (
                                <div key={i} className="p-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-slate-800">{t.description}</span>
                                        <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <span className="text-slate-500">{t.date}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={resetState} className="btn-ghost flex-1">Cancelar</button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={loading}
                                className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {loading ? 'Importando...' : `Confirmar e Importar ${rows.length} transações`}
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-4">📥 Importar Extrato</h3>
            {loading && step === 1 && <p className="text-sm text-slate-600">Analisando arquivo...</p>}
            {renderStep()}
        </div>
    );
}
