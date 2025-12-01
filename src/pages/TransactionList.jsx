import React from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';

const currencySymbols = {
  BRL: 'R$',
  USD: 'U$',
  EUR: '€',
};

export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p>Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">Data</th>
              <th scope="col" className="px-6 py-3">Descrição</th>
              <th scope="col" className="px-6 py-3">Categoria</th>
              <th scope="col" className="px-6 py-3 text-right">Valor</th>
              <th scope="col" className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4">
                  {format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                  {t.description || '-'}
                </td>
                <td className="px-6 py-4">{t.category}</td>
                <td className={`px-6 py-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {/* CORREÇÃO: Exibe o símbolo da moeda correto */}
                  {currencySymbols[t.currency] || 'R$'} {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(t)}
                      className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}