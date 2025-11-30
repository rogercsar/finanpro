import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSharedAccount } from '../hooks/useSharedAccount';
import { User, Camera, Lock, Share2, Check, X, UserPlus } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { sharedAccounts, invitations, sendInvitation, acceptInvitation, rejectInvitation, removeSharedUser } = useSharedAccount();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', avatar_url: '' });
  const [preview, setPreview] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      email: user.email || '',
      avatar_url: user.user_metadata?.avatar_url || ''
    });
    setPreview(user.user_metadata?.avatar_url || null);
  }, [user]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setForm(f => ({ ...f, avatar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update user metadata and email if changed
      const updates = { data: { full_name: form.full_name, phone: form.phone, avatar_url: form.avatar_url } };
      // supabase.auth.updateUser accepts an object with data/email/password
      const { error } = await supabase.auth.updateUser({ ...updates, email: form.email });
      if (error) throw error;
      alert('Perfil atualizado com sucesso');
      // Refresh page or rely on auth subscription
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar o perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert('Digite a nova senha');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Senha atualizada com sucesso');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar senha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      alert('Digite um email para convidar');
      return;
    }
    setLoading(true);
    try {
      await sendInvitation(inviteEmail);
      alert('Convite enviado com sucesso!');
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar convite: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Meu Perfil</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden mx-auto md:mx-0 flex-shrink-0">
            {preview ? (
              <img src={preview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400"><User className="w-10 h-10" /></div>
            )}
          </div>

          <div className="flex-1 w-full">
            <label className="block text-sm text-slate-600 mb-2">Foto de perfil</label>
            <div className="flex items-center gap-3">
              <label className="btn-ghost flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Selecionar foto
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
              <button className="btn-ghost" onClick={() => { setPreview(null); setForm(f => ({ ...f, avatar_url: '' })); }}>Remover</button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                placeholder="Nome completo"
                value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
              <input
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              <input
                className="px-3 py-2 border border-slate-200 rounded-lg md:col-span-2 text-slate-900"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={handleSave} className="btn-primary">{loading ? 'Salvando...' : 'Salvar alterações'}</button>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Alterar senha</h4>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input type="password" placeholder="Nova senha" className="px-3 py-2 border border-slate-200 rounded-lg flex-1 text-slate-900" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button onClick={handleChangePassword} className="btn-primary"><Lock className="w-4 h-4 mr-2" /> Alterar</button>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Compartilhar Conta
              </h4>
              <p className="text-xs text-slate-600 mb-3">Convide outro usuário para acessar e gerenciar esta conta junto com você.</p>
              
              {!showInviteForm ? (
                <button onClick={() => setShowInviteForm(true)} className="btn-ghost flex items-center gap-2 mb-4">
                  <UserPlus className="w-4 h-4" /> Convidar Usuário
                </button>
              ) : (
                <form onSubmit={handleSendInvite} className="mb-4 p-3 bg-slate-50 rounded-lg animate-in fade-in duration-300">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Email do usuário"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                    />
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Enviando...' : 'Enviar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}
                      className="btn-ghost"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )}

              {/* Pending Invitations */}
              {sharedAccounts.filter(a => a.status === 'pending' && a.owner_id === user?.id).length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">Convites Pendentes</h5>
                  <div className="space-y-2">
                    {sharedAccounts
                      .filter(a => a.status === 'pending' && a.owner_id === user?.id)
                      .map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-100 rounded-lg">
                          <span className="text-sm text-slate-700">{invite.invite_email}</span>
                          <button
                            onClick={() => removeSharedUser(invite.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Accepted Shared Users */}
              {sharedAccounts.filter(a => a.status === 'accepted').length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">Usuários com Acesso</h5>
                  <div className="space-y-2">
                    {sharedAccounts
                      .filter(a => a.status === 'accepted')
                      .map(shared => (
                        <div key={shared.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{shared.invite_email || 'Usuário'}</p>
                            <p className="text-xs text-slate-500">Acesso desde {new Date(shared.accepted_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                          {shared.owner_id === user?.id && (
                            <button
                              onClick={() => removeSharedUser(shared.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Incoming Invitations */}
              {invitations.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">Convites Recebidos</h5>
                  <div className="space-y-2">
                    {invitations.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">Você foi convidado para compartilhar uma conta</p>
                          <p className="text-xs text-slate-600">Convite de outro usuário</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptInvitation(invite.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            <Check className="w-3 h-3" /> Aceitar
                          </button>
                          <button
                            onClick={() => rejectInvitation(invite.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            <X className="w-3 h-3" /> Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
