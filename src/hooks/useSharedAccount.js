import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSharedAccount() {
  const { user } = useAuth();
  const [sharedAccounts, setSharedAccounts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSharedAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get accounts where user is owner
      const { data: owned } = await supabase
        .from('shared_accounts')
        .select('*')
        .eq('owner_id', user.id);

      // Get accounts where user is invited
      const { data: invited } = await supabase
        .from('shared_accounts')
        .select('*')
        .eq('invited_user_id', user.id);

      setSharedAccounts([...(owned || []), ...(invited || [])]);
      setInvitations(invited?.filter(inv => inv.status === 'pending') || []);
    } catch (error) {
      console.error('Error fetching shared accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedAccounts();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('shared_accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_accounts' }, () => {
        fetchSharedAccounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendInvitation = async (email) => {
    try {
      const { error } = await supabase
        .from('shared_accounts')
        .insert([
          {
            owner_id: user.id,
            invite_email: email,
            status: 'pending'
          }
        ]);
      if (error) throw error;
      fetchSharedAccounts();
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  };

  const acceptInvitation = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('shared_accounts')
        .update({
          invited_user_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', inviteId);
      if (error) throw error;
      fetchSharedAccounts();
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  };

  const rejectInvitation = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('shared_accounts')
        .update({
          status: 'rejected'
        })
        .eq('id', inviteId);
      if (error) throw error;
      fetchSharedAccounts();
      return true;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  };

  const removeSharedUser = async (sharedAccountId) => {
    try {
      const { error } = await supabase
        .from('shared_accounts')
        .delete()
        .eq('id', sharedAccountId);
      if (error) throw error;
      fetchSharedAccounts();
      return true;
    } catch (error) {
      console.error('Error removing shared user:', error);
      throw error;
    }
  };

  return {
    sharedAccounts,
    invitations,
    loading,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    removeSharedUser,
    refetch: fetchSharedAccounts
  };
}
