import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, Search, Upload, FileText } from 'lucide-react';
import TransactionForm from './TransactionForm';
import FileImporter from './FileImporter';

const TRANSACTIONS_PER_PAGE = 15;

export default function TransactionList({ type }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showImporter, setShowImporter] = useState(false);

    const fetchTransactions = async (isNewSearch = false) => {
        if (loading && !isNewSearch) return;
        setLoading(true);

        const currentPage = isNewSearch ? 0 : page;
        const from = currentPage * TRANSACTIONS_PER_PAGE;
        const to = from + TRANSACTIONS_PER_PAGE - 1;

        try {
            let query = supabase
                .from('transactions')
                .select('*', { count: 'exact' })
                .eq('type', type)
                .order('date', { ascending: false });

            if (searchQuery) {
                query = query.ilike('description', `%${searchQuery}%`);
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            if (isNewSearch) {
                setTransactions(data || []);
            } else {
                setTransactions(prev => [...prev, ...(data || [])]);
            }

            setHasMore((data?.length || 0) >= TRANSACTIONS_PER_PAGE);
            setPage(currentPage + 1);

        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(0);
        setTransactions([]);
        setHasMore(true);
        fetchTransactions(true);
    }, [type, searchQuery]);

    useEffect(() => {
        // Realtime subscription

        // Subscribe to realtime changes
        const channel = supabase
            .channel('transactions_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                setPage(0);
                setTransactions([]);
                setHasMore(true);
                fetchTransactions(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [type]);
    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            fetchTransactions();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Erro ao excluir');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4"> 
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center sm:text-left">
                    {type === 'income' ? 'Entradas' : 'Saídas'}
                </h2>
                <button
                    onClick={() => {
                        setEditingTransaction(null);
                        setIsFormOpen(true);
                    }}
                    className={`w-full md:w-auto btn-primary ${type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova {type === 'income' ? 'Entrada' : 'Saída'}
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar por descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-900 dark:text-slate-200"
                />
            </div>

            {/* CSV Importer Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setShowImporter(!showImporter)}
                    className="w-full p-3 flex justify-between items-center text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                    <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Importar Extrato (CSV/PDF)
                    </span>
                    <span>{showImporter ? 'Fechar' : 'Abrir'}</span>
                </button>
                {showImporter && ( 
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <FileImporter onImportSuccess={fetchTransactions} />
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="w-full text-left text-sm ">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Data</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Descrição</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Categoria</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Valor</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium"><Link to={`/transactions/${t.id}`} className="group-hover:underline">{t.description || '-'}</Link></td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2"> 
                                            <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((t) => (
                        <Link to={`/transactions/${t.id}`} key={t.id} className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description || t.category}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}</p>
                                </div>
                                <p className={`font-bold text-lg ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                    {t.category}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.preventDefault(); setEditingTransaction(t); setIsFormOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.preventDefault(); handleDelete(t.id); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Loading and Empty States */}
                {loading && transactions.length === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div>
                )}
                {!loading && transactions.length === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        {searchQuery ? `Nenhum resultado para "${searchQuery}"` : 'Nenhuma transação encontrada.'}
                    </div>
                )}

                {/* Load More Button */}
                {hasMore && !loading && transactions.length > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => fetchTransactions()}
                            className="w-full btn-ghost"
                        >
                            Carregar Mais
                        </button>
                    </div>
                )}
                {loading && transactions.length > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
                        Carregando...
                    </div>
                )}
            </div>

            {isFormOpen && (
                <TransactionForm
                    type={type}
                    initialData={editingTransaction}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setPage(0);
                        setTransactions([]);
                        setHasMore(true);
                        fetchTransactions(true);
                    }} />
            )}
        </div>
    );
}
