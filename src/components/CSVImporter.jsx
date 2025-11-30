import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

export default function CSVImporter({ onImportSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [toasts, setToasts] = useState([]);

    const showToast = (type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const parts = lines[i].split(',');
            const row = {};
            header.forEach((h, idx) => {
                row[h] = parts[idx]?.trim() || '';
            });
            rows.push(row);
        }
        return rows;
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const rows = parseCSV(text);
            setPreview(rows.slice(0, 5)); // Show first 5 rows
            setShowPreview(true);
        } catch (error) {
            showToast('error', 'Erro', 'Não foi possível ler o arquivo CSV');
        }
    };

    const importTransactions = async () => {
        if (!user?.id || preview.length === 0) return;

        setLoading(true);
        try {
            const transactions = preview.map(row => ({
                user_id: user.id,
                date: row.data || row.date || new Date().toISOString().split('T')[0],
                type: (row.tipo || row.type || '').toLowerCase() === 'entrada' ? 'income' : 'expense',
                category: row.categoria || row.category || 'Outros',
                description: row.descricao || row.description || '',
                amount: parseFloat((row.valor || row.amount || '0').replace(',', '.'))
            })).filter(t => t.amount > 0);

            const { error } = await supabase
                .from('transactions')
                .insert(transactions);

            if (error) throw error;

            showToast('success', 'Importado!', `${transactions.length} transações importadas com sucesso`);
            setShowPreview(false);
            setPreview([]);
            if (onImportSuccess) onImportSuccess();
        } catch (error) {
            showToast('error', 'Erro', 'Falha ao importar transações: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-4">📥 Importar Transações (CSV)</h3>

            {!showPreview ? (
                <label className="p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-blue-600" />
                    <p className="text-sm font-medium text-slate-900">Selecione arquivo CSV</p>
                    <p className="text-xs text-slate-600">Formato: Data, Tipo, Categoria, Descrição, Valor</p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </label>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-900">
                        Pré-visualização ({preview.length} transações)
                    </p>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                        {preview.map((row, idx) => (
                            <div key={idx} className="p-2 border-b border-slate-100 text-xs">
                                <p className="text-slate-900">
                                    {row.tipo || row.type} | {row.categoria || row.category} | R$ {row.valor || row.amount}
                                </p>
                                <p className="text-slate-600">{row.descricao || row.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="flex-1 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={importTransactions}
                            disabled={loading}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                            {loading ? 'Importando...' : 'Confirmar Importação'}
                        </button>
                    </div>
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
        </div>
    );
}
