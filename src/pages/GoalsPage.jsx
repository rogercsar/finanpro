import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Link } from 'react-router-dom';
import { Target, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function GoalsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: 0,
    deadline: '',
    status: 'active'
  });

  const fetchGoals = async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('profile_id', activeProfile.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeProfile) fetchGoals();
    
    const subscription = supabase
      .channel('goals-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals'
      }, () => fetchGoals())
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, activeProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.target_amount || !form.deadline) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        user_id: user.id,
        profile_id: activeProfile.id,
        name: form.name,
        description: form.description,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
        deadline: form.deadline,
        status: form.status
      };

      if (editingGoal?.id) {
        const { error } = await supabase
          .from('goals')
          .update(dataToSave)
          .eq('id', editingGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([dataToSave]);
        if (error) throw error;
      }

      alert('Meta salva com sucesso');
      fetchGoals();
      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Erro ao salvar meta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Erro ao excluir meta');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      target_amount: '',
      current_amount: 0,
      deadline: '',
      status: 'active'
    });
    setEditingGoal(null);
    setIsFormOpen(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline,
      status: goal.status
    });
    setIsFormOpen(true);
  };

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center sm:text-left">Minhas Metas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center sm:text-left">Defina objetivos financeiros e acompanhe o progresso</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="w-full sm:w-auto btn-primary bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Meta
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-12">Carregando...</div>
        ) : goals.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-12">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhuma meta criada ainda. Comece a criar suas metas financeiras!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
            const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const isCompleted = goal.current_amount >= goal.target_amount;
            const isExpired = daysLeft < 0 && !isCompleted;

            return (
              <Link
                key={goal.id}
                to={`/goals/${goal.id}`}
                className={`block bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 ${
                  isCompleted 
                    ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20'
                    : isExpired
                    ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-200">{goal.name}</h3>
                    {goal.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{goal.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={(e) => { e.preventDefault(); handleEdit(goal); }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Editar Meta"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(goal.id); }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Excluir Meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Progresso</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isCompleted
                          ? 'bg-green-500'
                          : isExpired
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Amount Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Atual</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Alvo</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Restante</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      R$ {Math.max(0, goal.target_amount - goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {daysLeft < 0
                      ? isCompleted
                        ? '✓ Concluída'
                        : '⚠ Vencida'
                      : `${daysLeft} dias`}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {format(new Date(`${goal.deadline}T00:00:00`), 'dd/MM/yyyy')}
                  </span>
                </div>

                {isCompleted && (
                  <div className="mt-3 bg-green-100 text-green-700 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                    <Check className="w-4 h-4" />
                    Meta alcançada!
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Meta *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                  placeholder="Ex: Fundo de Emergência"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Alvo *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Atual</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prazo (Data Limite) *</label>
                <input
                  type="date"
                  required
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
