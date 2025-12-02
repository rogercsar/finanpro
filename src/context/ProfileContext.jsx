import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [activeProfile, setActiveProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfiles = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            if (data && data.length > 0) {
                setProfiles(data);
                const lastProfileId = localStorage.getItem('activeProfileId');
                const profileToActivate = data.find(p => p.id === lastProfileId) || data[0];
                setActiveProfile(profileToActivate);
            } else {
                // Caso de um novo usuário: cria um perfil "Pessoal" padrão.
                const { data: newProfileData, error: insertError } = await supabase
                    .from('profiles')
                    .insert({ user_id: user.id, name: 'Pessoal', profile_type: 'personal' })
                    .select()
                    .single();
                
                if (insertError) throw insertError;

                setProfiles([newProfileData]);
                setActiveProfile(newProfileData);
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const switchProfile = (profileId) => {
        const newActiveProfile = profiles.find(p => p.id === profileId);
        if (newActiveProfile && newActiveProfile.id !== activeProfile?.id) {
            setActiveProfile(newActiveProfile);
            localStorage.setItem('activeProfileId', profileId);
            // Recarrega a página para garantir que todos os componentes busquem os novos dados.
            window.location.reload(); 
        }
    };

    const value = { profiles, activeProfile, switchProfile, loading };

    return (
        <ProfileContext.Provider value={value}>
            {!loading ? children : <div className="w-screen h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><p>Carregando perfis...</p></div>}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within a ProfileProvider');
    return context;
};