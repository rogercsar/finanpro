import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Trophy, Lock } from 'lucide-react';
import clsx from 'clsx';

export default function AchievementsPage() {
    const { user } = useAuth();
    const { activeProfile } = useProfile();
    const [allAchievements, setAllAchievements] = useState([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievementsData = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // 1. Busca todas as definições de conquistas
                const { data: definitions, error: defError } = await supabase
                    .from('achievement_definitions')
                    .select('*');
                if (defError) throw defError;
                setAllAchievements(definitions);

                // 2. Busca as conquistas desbloqueadas pelo usuário
                const { data: unlocked, error: unlockedError } = await supabase
                    .from('achievements')
                    .select('type')
                    .eq('user_id', user.id)
                    .eq('profile_id', activeProfile.id); // FILTRO DE PERFIL
                if (unlockedError) throw unlockedError;
                setUnlockedAchievements(new Set(unlocked.map(a => a.type)));

            } catch (error) {
                console.error('Error fetching achievements:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAchievementsData();
    }, [user, activeProfile]);

    if (loading) {
        return <div className="text-center p-8">Carregando conquistas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-500" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Minhas Conquistas</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Continue progredindo para desbloquear todas!</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allAchievements.map(ach => {
                    const isUnlocked = unlockedAchievements.has(ach.type);
                    return (
                        <div
                            key={ach.type}
                            className={clsx(
                                "p-4 rounded-2xl border text-center transition-all",
                                isUnlocked
                                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30"
                                    : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60"
                            )}
                        >
                            <div className="text-5xl mb-2">{isUnlocked ? ach.icon : <Lock className="mx-auto text-slate-400" />}</div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{ach.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{ach.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}