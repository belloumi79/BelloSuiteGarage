'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [clientForm, setClientForm] = useState({
    type: 'individual',
    civility: 'M.',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    tax_id: '',
    payment_terms_days: 30,
    discount_percent: 0
  });

  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const res = await fetch(`/api/clients?page=${page}&pageSize=${pageSize}`);
      const result = res.ok ? await res.json() : { data: [], total: 0 };
      const clientList = Array.isArray(result) ? result : (result.data ?? []);
      setClients(clientList);
      setTotal(Array.isArray(result) ? result.length : (result.total ?? 0));
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Standard data-fetching pattern: loadData wraps an async API call with state updates.
   
  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / pageSize);

  const resetClientForm = () => {
    setClientForm({
      type: 'individual',
      civility: 'M.',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      tax_id: '',
      payment_terms_days: 30,
      discount_percent: 0
    });
    setEditingClient(null);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingClient;
      const url = isEdit ? `/api/clients/${editingClient.id}` : '/api/clients';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setIsClientModalOpen(false);
        resetClientForm();
        loadData();
        addToast(isEdit ? 'Client modifié' : 'Client créé');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteClient = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/clients/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Client supprimé');
        loadData();
      }
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Clients
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-medium">Chargement des clients...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 no-print">
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher un client (nom, tél, société...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200"
              />
            </div>
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau Client
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-900/50">
                  <th className="p-4">Client / Société</th>
                  <th className="p-4">Téléphone</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Adresse</th>
                  <th className="p-4">Remise</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients
                  .filter(c => {
                    const name = c.company_name || `${c.first_name} ${c.last_name}`;
                    return name.toLowerCase().includes(debouncedSearch.toLowerCase()) || (c.phone && c.phone.includes(debouncedSearch));
                  })
                  .map(client => {
                    const displayName = client.company_name
                      ? `${client.company_name} (Soc.)`
                      : `${client.civility} ${client.first_name} ${client.last_name}`;
                    return (
                      <tr key={client.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                        <td className="p-4 font-semibold text-slate-200">{displayName}</td>
                        <td className="p-4 text-slate-300 font-mono">{client.phone}</td>
                        <td className="p-4 text-slate-400">{client.email || '-'}</td>
                        <td className="p-4 text-slate-400">{client.address_line1}, {client.city}</td>
                        <td className="p-4 text-slate-400">{Number(client.discount_percent)}%</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {}}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                            title="Fiche Client"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setClientForm({
                                type: client.type,
                                civility: client.civility || '',
                                first_name: client.first_name || '',
                                last_name: client.last_name || '',
                                company_name: client.company_name || '',
                                email: client.email || '',
                                phone: client.phone || '',
                                address_line1: client.address_line1 || '',
                                city: client.city || '',
                                tax_id: client.tax_id || '',
                                payment_terms_days: client.payment_terms_days ?? 30,
                                discount_percent: client.discount_percent
                              });
                              setIsClientModalOpen(true);
                            }}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: client.id, name: displayName })}
                            className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                &larr; Précédent
              </button>
              <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              >
                Suivant &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {isClientModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">{editingClient ? 'Modifier le client' : 'Créer un nouveau client'}</h3>
              <button onClick={() => { setIsClientModalOpen(false); resetClientForm(); }} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type de Client</label>
                  <select
                    value={clientForm.type}
                    onChange={(e) => setClientForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="individual">Particulier</option>
                    <option value="company">Entreprise / Société</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Civilité</label>
                  <select
                    value={clientForm.civility}
                    onChange={(e) => setClientForm(prev => ({ ...prev, civility: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    disabled={clientForm.type === 'company'}
                  >
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                    <option value="Mlle">Mlle</option>
                  </select>
                </div>
              </div>

              {clientForm.type === 'company' ? (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom de l&apos;entreprise</label>
                  <input
                    type="text"
                    required
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={clientForm.first_name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nom de famille</label>
                    <input
                      type="text"
                      required
                      value={clientForm.last_name}
                      onChange={(e) => setClientForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    required
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Adresse</label>
                  <input
                    type="text"
                    value={clientForm.address_line1}
                    onChange={(e) => setClientForm(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ville</label>
                  <input
                    type="text"
                    value={clientForm.city}
                    onChange={(e) => setClientForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mat. Fiscal (M.F.)</label>
                  <input
                    type="text"
                    value={clientForm.tax_id}
                    onChange={(e) => setClientForm(prev => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Délai Paiement (jours)</label>
                  <input
                    type="number"
                    value={clientForm.payment_terms_days}
                    onChange={(e) => setClientForm(prev => ({ ...prev, payment_terms_days: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Remise (%)</label>
                  <input
                    type="number"
                    value={clientForm.discount_percent}
                    onChange={(e) => setClientForm(prev => ({ ...prev, discount_percent: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setIsClientModalOpen(false); resetClientForm(); }} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingClient ? 'Enregistrer' : 'Créer le client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer le client"
        message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete?.name} ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteClient}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
