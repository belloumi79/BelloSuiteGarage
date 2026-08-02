'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Shield, Ban, CheckCircle, Key, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { AdminGarage } from '@/lib/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  trial: { label: 'Essai', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  active: { label: 'Actif', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  suspended: { label: 'Suspendu', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

const planLabels: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function AdminPage() {
  const [garages, setGarages] = useState<AdminGarage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGarage, setEditingGarage] = useState<AdminGarage | null>(null);
  const [viewingGarage, setViewingGarage] = useState<AdminGarage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    legal_name: '',
    tax_id: '',
    phone: '',
    city: '',
    address_line1: '',
    subscription_plan: 'starter',
    trial_days: 30,
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    phone: '',
    city: '',
    address_line1: '',
    subscription_plan: 'starter',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/garages');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Non autorisé');
      }
      setGarages(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuspend = async (garageId: string) => {
    try {
      const res = await fetch(`/api/admin/garages/${garageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_status: 'suspended' }),
      });
      if (res.ok) {
        addToast('Garage suspendu');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleActivate = async (garageId: string) => {
    try {
      const res = await fetch(`/api/admin/garages/${garageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_status: 'active' }),
      });
      if (res.ok) {
        addToast('Garage activé');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleGenerateCode = async (garageId: string) => {
    try {
      const res = await fetch(`/api/admin/garages/${garageId}/generate-code`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        addToast(`Code d&apos;activation : ${data.activation_code}`);
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleCreateGarage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/garages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        addToast('Garage créé avec succès');
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          legal_name: '',
          tax_id: '',
          phone: '',
          city: '',
          address_line1: '',
          subscription_plan: 'starter',
          trial_days: 30,
        });
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleEditGarage = (garage: AdminGarage) => {
    setEditingGarage(garage);
    setEditForm({
      name: garage.name,
      legal_name: garage.legal_name || '',
      tax_id: garage.tax_id || '',
      phone: garage.phone || '',
      city: garage.city || '',
      address_line1: garage.address_line1 || '',
      subscription_plan: garage.subscription_plan || 'starter',
    });
  };

  const handleUpdateGarage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGarage) return;
    try {
      const res = await fetch(`/api/admin/garages/${editingGarage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        addToast('Garage mis à jour');
        setEditingGarage(null);
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleDeleteGarage = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/admin/garages/${confirmDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Garage supprimé');
        setConfirmDelete(null);
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
  };

  const handleViewGarage = (garage: AdminGarage) => {
    setViewingGarage(garage);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-200 mb-2">Accès restreint</h2>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            Administration Plateforme
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Nouveau Garage
        </button>
      </header>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-medium">Chargement...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4 no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <th className="pb-3 pr-4">Garage</th>
                <th className="pb-3 pr-4">Propriétaire</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Membres</th>
                <th className="pb-3 pr-4">Clients</th>
                <th className="pb-3 pr-4">Véhicules</th>
                <th className="pb-3 pr-4">Documents</th>
                <th className="pb-3 pr-4">Statut</th>
                <th className="pb-3 pr-4">Fin d&apos;essai</th>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {garages.map(g => {
                const st = statusConfig[g.subscription_status || 'trial'] || statusConfig.trial;
                const trialEnd = g.trial_end_date ? new Date(g.trial_end_date) : null;
                const isExpired = trialEnd && trialEnd < new Date() && g.subscription_status === 'trial';
                return (
                  <tr key={g.id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition">
                    <td className="py-4 pr-4">
                      <p className="text-slate-200 font-medium">{g.name}</p>
                      <p className="text-[10px] text-slate-500">{g.email}{g.city ? ` · ${g.city}` : ''}</p>
                    </td>
                    <td className="py-4 pr-4 text-slate-400">
                      {g.owner_name ? (
                        <span>{g.owner_name} ({g.owner_email})</span>
                      ) : (
                        <span>{g.owner_email || '—'}</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300">
                        {planLabels[g.subscription_plan || 'starter'] || g.subscription_plan}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-400">{g.members_count}</td>
                    <td className="py-4 pr-4 text-slate-400">{g.clients_count}</td>
                    <td className="py-4 pr-4 text-slate-400">{g.vehicles_count}</td>
                    <td className="py-4 pr-4 text-slate-400">{g.documents_count}</td>
                    <td className="py-4 pr-4">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${isExpired ? 'text-red-400 bg-red-400/10 border-red-400/20' : st.color}`}>
                        {isExpired ? 'Expiré' : st.label}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-400 text-[11px] font-mono">
                      {trialEnd ? trialEnd.toLocaleDateString('fr-FR') : '—'}
                      {isExpired && <span className="text-red-400 ml-1">(expiré)</span>}
                    </td>
                    <td className="py-4 pr-4">
                      {g.activation_code ? (
                        <span className="text-[11px] font-mono font-bold text-amber-400">{g.activation_code}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleViewGarage(g)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                          title="Voir détails"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditGarage(g)}
                          className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg text-blue-400 transition"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {g.subscription_status === 'suspended' ? (
                          <>
                            <button
                              onClick={() => handleActivate(g.id)}
                              className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-lg text-emerald-400 transition"
                              title="Activer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleGenerateCode(g.id)}
                              className="p-1.5 bg-amber-600/10 hover:bg-amber-600/20 rounded-lg text-amber-400 transition"
                              title="Générer un code d&apos;activation"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSuspend(g.id)}
                            className="p-1.5 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition"
                            title="Suspendre"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete({ id: g.id, name: g.name })}
                          className="p-1.5 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {garages.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 text-sm">Aucun garage trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Créer un nouveau Garage
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleCreateGarage} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom du Garage *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Garage Central Tunis"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    placeholder="contact@garage.tn"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Raison sociale</label>
                  <input
                    type="text"
                    value={createForm.legal_name}
                    onChange={e => setCreateForm(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                    placeholder="Garage Central SARL"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Matricule Fiscal</label>
                  <input
                    type="text"
                    value={createForm.tax_id}
                    onChange={e => setCreateForm(prev => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                    placeholder="1234567X"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={e => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ville</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={e => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                    placeholder="Tunis"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Adresse</label>
                  <input
                    type="text"
                    value={createForm.address_line1}
                    onChange={e => setCreateForm(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                    placeholder="123 Avenue Habib Bourguiba"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Plan d&apos;abonnement</label>
                  <select
                    value={createForm.subscription_plan}
                    onChange={e => setCreateForm(prev => ({ ...prev, subscription_plan: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Durée essai (jours)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={createForm.trial_days}
                    onChange={e => setCreateForm(prev => ({ ...prev, trial_days: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold">Créer le Garage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingGarage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                Modifier le Garage
              </h3>
              <button onClick={() => setEditingGarage(null)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleUpdateGarage} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom du Garage *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Email (non modifiable)</label>
                  <input
                    type="email"
                    disabled
                    value={editingGarage.email || ''}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Raison sociale</label>
                  <input
                    type="text"
                    value={editForm.legal_name}
                    onChange={e => setEditForm(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Matricule Fiscal</label>
                  <input
                    type="text"
                    value={editForm.tax_id}
                    onChange={e => setEditForm(prev => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ville</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Adresse</label>
                  <input
                    type="text"
                    value={editForm.address_line1}
                    onChange={e => setEditForm(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Plan d&apos;abonnement</label>
                  <select
                    value={editForm.subscription_plan}
                    onChange={e => setEditForm(prev => ({ ...prev, subscription_plan: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setEditingGarage(null)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingGarage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                Détails du Garage
              </h3>
              <button onClick={() => setViewingGarage(null)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Nom</p>
                  <p className="text-slate-200 font-medium">{viewingGarage.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Email</p>
                  <p className="text-slate-200 font-mono text-xs">{viewingGarage.email}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Raison sociale</p>
                  <p className="text-slate-200">{viewingGarage.legal_name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Matricule Fiscal</p>
                  <p className="text-slate-200">{viewingGarage.tax_id || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Téléphone</p>
                  <p className="text-slate-200">{viewingGarage.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Ville</p>
                  <p className="text-slate-200">{viewingGarage.city || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Adresse</p>
                  <p className="text-slate-200">{viewingGarage.address_line1 || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Plan</p>
                  <p className="text-slate-200">{planLabels[viewingGarage.subscription_plan || 'starter'] || viewingGarage.subscription_plan}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Statut</p>
                  <p className="text-slate-200">{statusConfig[viewingGarage.subscription_status || 'trial']?.label || viewingGarage.subscription_status}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Propriétaire</p>
                  <p className="text-slate-200">{viewingGarage.owner_name || viewingGarage.owner_email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Code activation</p>
                  <p className="text-slate-200 font-mono">{viewingGarage.activation_code || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Fin d&apos;essai</p>
                  <p className="text-slate-200">{viewingGarage.trial_end_date ? new Date(viewingGarage.trial_end_date).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Suspendu le</p>
                  <p className="text-slate-200">{viewingGarage.suspended_at ? new Date(viewingGarage.suspended_at).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Créé le</p>
                  <p className="text-slate-200">{new Date(viewingGarage.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Mis à jour le</p>
                  <p className="text-slate-200">{new Date(viewingGarage.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-sm font-bold text-slate-300 mb-3">Statistiques</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                    <p className="text-2xl font-bold text-blue-400">{viewingGarage.members_count}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Membres</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                    <p className="text-2xl font-bold text-emerald-400">{viewingGarage.clients_count}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Clients</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                    <p className="text-2xl font-bold text-amber-400">{viewingGarage.vehicles_count}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Véhicules</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                    <p className="text-2xl font-bold text-indigo-400">{viewingGarage.documents_count}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Documents</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setViewingGarage(null)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Fermer</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer le garage"
        message={`Êtes-vous sûr de vouloir supprimer définitivement le garage "${confirmDelete?.name}" ? Cette action est irréversible et supprimera toutes les données associées (clients, véhicules, documents, stock, etc.).`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDeleteGarage}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}