import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, X } from 'lucide-react';

export default function CreateProfileModal({ onClose, onSuccess }) {
    const { user } = useAuth();
    const [profileName, setProfileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!profileName.trim()) {
            alert('Por favor, insira um nome para o perfil.');
            return;
        }

        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    user_id: user.id,
                    name: profileName,
                    profile_type: 'company', // Define o tipo como 'company'
                })
                .select()
                .single();

            if (error) throw error;

            alert('Perfil de empresa criado com sucesso!');
            onSuccess(data.id); // Passa o ID do novo perfil para o sucesso

        } catch (error) {
            console.error('Error creating company profile:', error);
            alert('Erro ao criar perfil: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Briefcase className="w-5 h-5" /> Criar Perfil de Empresa
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa</label>
                        <input
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                            placeholder="Ex: Minha Startup LTDA"
                        />
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full btn-primary bg-blue-600 hover:bg-blue-700">{isSaving ? 'Criando...' : 'Criar Perfil'}</button>
                </form>
            </div>
        </div>
    );
}