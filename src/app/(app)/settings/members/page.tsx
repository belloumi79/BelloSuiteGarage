'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, UserPlus, Trash2, Shield, UserCog } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Member {
  id: string;
  user_id: string;
  email: string | null;
  role: string;
  active: boolean;
  joined_at: string | null;
}

const roleLabels: Record<string, string> = {
  owner: 'Propriétaire',
  mechanic: 'Mécanicien',
  cashier: 'Caissier',
  viewer: 'Visiteur',
};

const roleColors: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  mechanic: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  cashier: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  viewer: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('mechanic');
  const [showInvite, setShowInvite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; email: string } | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const { addToast } = useToast();

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/garage/members');
      if (res.ok) {
        setMembers(await res.json());
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur de chargement', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setChangingRole(memberId);
      const res = await fetch(`/api/garage/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        addToast('Rôle mis à jour');
        loadMembers();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemove = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/garage/members/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Membre supprimé');
        loadMembers();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/garage/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        addToast('Membre ajouté');
        setInviteEmail('');
        setShowInvite(false);
        loadMembers();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Membres du Garage
          </h2>
          <button
            onClick={loadMembers}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          Inviter
        </button>
      </header>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-medium">Chargement des membres...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 no-print">
        <div className="max-w-2xl space-y-3">
          {members.length === 0 && !loading && (
            <p className="text-slate-500 text-sm">Aucun membre trouvé.</p>
          )}
          {members.map(member => (
            <div
              key={member.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition space-y-3 ${
                member.active ? 'border-slate-800/80' : 'border-red-800/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(member.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{member.email || 'Email inconnu'}</p>
                    <p className="text-[10px] text-slate-500">
                      {member.joined_at
                        ? `Membre depuis le ${new Date(member.joined_at).toLocaleDateString('fr-FR')}`
                        : 'Invitation en attente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {member.role === 'owner' ? (
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${roleColors.owner}`}>
                      <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
                      {roleLabels.owner}
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.id, e.target.value)}
                      disabled={changingRole === member.id}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border bg-slate-950 cursor-pointer focus:outline-none ${roleColors[member.role] || roleColors.viewer}`}
                    >
                      <option value="mechanic">{roleLabels.mechanic}</option>
                      <option value="cashier">{roleLabels.cashier}</option>
                      <option value="viewer">{roleLabels.viewer}</option>
                    </select>
                  )}

                  {member.role !== 'owner' && (
                    <button
                      onClick={() => setConfirmDelete({ id: member.id, email: member.email || 'cet utilisateur' })}
                      className="p-1.5 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition"
                      title="Retirer du garage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Inviter un membre
              </h3>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="email@exemple.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rôle</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="mechanic">Mécanicien</option>
                  <option value="cashier">Caissier</option>
                  <option value="viewer">Visiteur (lecture seule)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Inviter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Retirer le membre"
        message={`Êtes-vous sûr de vouloir retirer ${confirmDelete?.email} du garage ?`}
        confirmLabel="Retirer"
        onConfirm={handleRemove}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
