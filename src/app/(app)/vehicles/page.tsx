'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Vehicle, Client } from '@/lib/types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; plate: string } | null>(null);

  const [vehicleForm, setVehicleForm] = useState({
    client_id: '',
    plate: '',
    make: '',
    model: '',
    version: '',
    fuel: 'Essence',
    color: '',
    year: new Date().getFullYear(),
    mileage: 0,
    notes: ''
  });

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehRes, cliRes] = await Promise.all([
        fetch(`/api/vehicles?page=${page}&pageSize=${pageSize}`),
        fetch('/api/clients')
      ]);
      const veh = await vehRes.json();
      const cli = await cliRes.json();
      const clientList = cli.data ?? cli;
      if (Array.isArray(veh)) {
        setVehicles(veh);
        setTotal(veh.length);
      } else {
        setVehicles(veh.data ?? []);
        setTotal(veh.total ?? 0);
      }
      setClients(clientList);
      if (clientList.length > 0) {
        setVehicleForm(prev => ({ ...prev, client_id: clientList[0].id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const resetVehicleForm = () => {
    setVehicleForm({
      client_id: clients[0]?.id || '',
      plate: '',
      make: '',
      model: '',
      version: '',
      fuel: 'Essence',
      color: '',
      year: new Date().getFullYear(),
      mileage: 0,
      notes: ''
    });
    setEditingVehicle(null);
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingVehicle;
      const url = isEdit ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      });
      if (res.ok) {
        setIsVehicleModalOpen(false);
        resetVehicleForm();
        loadData();
        addToast(isEdit ? 'Véhicule modifié' : 'Véhicule créé');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteVehicle = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/vehicles/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Véhicule supprimé');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Véhicules
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
            <p className="text-slate-400 text-xs font-medium">Chargement des véhicules...</p>
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
                placeholder="Rechercher par immatriculation, marque, modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200"
              />
            </div>
            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau Véhicule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vehicles
              .filter(v => {
                const searchLower = debouncedSearch.toLowerCase();
                return (
                  (v.plate || '').toLowerCase().includes(searchLower) ||
                  (v.make || '').toLowerCase().includes(searchLower) ||
                  (v.model || '').toLowerCase().includes(searchLower)
                );
              })
              .map(vehicle => {
                const clientName = vehicle.clients
                  ? vehicle.clients.company_name || `${vehicle.clients.first_name} ${vehicle.clients.last_name}`
                  : 'Propriétaire inconnu';

                return (
                  <div key={vehicle.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Immatriculation</span>
                        <h4 className="text-lg font-mono font-extrabold text-blue-400">{vehicle.plate}</h4>
                      </div>
                      <div className="bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold uppercase">
                        {vehicle.fuel}
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Marque / Modèle :</span>
                        <span className="text-slate-200 font-bold">{vehicle.make} {vehicle.model}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Kilométrage :</span>
                        <span className="text-slate-200 font-mono">{Number(vehicle.mileage || 0).toLocaleString('fr-TN')} Km</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Propriétaire :</span>
                        <span className="text-blue-400 font-medium truncate max-w-[150px]">{clientName}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setVehicleForm({
                            client_id: vehicle.client_id,
                            plate: vehicle.plate || '',
                            make: vehicle.make || '',
                            model: vehicle.model || '',
                            version: vehicle.version || '',
                            fuel: vehicle.fuel || 'Essence',
                            color: vehicle.color || '',
                            year: vehicle.year ?? new Date().getFullYear(),
                            mileage: vehicle.mileage ?? 0,
                            notes: vehicle.notes || ''
                          });
                          setIsVehicleModalOpen(true);
                        }}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 transition text-xs flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: vehicle.id, plate: vehicle.plate || '' })}
                        className="p-1.5 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition text-xs flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">&larr; Précédent</button>
              <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">Suivant &rarr;</button>
            </div>
          )}
        </div>

      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">{editingVehicle ? 'Modifier le véhicule' : 'Enregistrer un véhicule'}</h3>
              <button onClick={() => { setIsVehicleModalOpen(false); resetVehicleForm(); }} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Propriétaire (Client)</label>
                <select
                  value={vehicleForm.client_id}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, client_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  {clients.map(c => {
                    const name = c.company_name || `${c.first_name} ${c.last_name}`;
                    return <option key={c.id} value={c.id}>{name}</option>;
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Immatriculation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123 TUN 4567"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, plate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Marque</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Volkswagen"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Modèle</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Golf"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Version / Motorisation</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.4 TSI"
                    value={vehicleForm.version}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Énergie</label>
                  <select
                    value={vehicleForm.fuel}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, fuel: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="Essence">Essence</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electrique">Electrique</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Couleur</label>
                  <input
                    type="text"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kilométrage</label>
                  <input
                    type="number"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setIsVehicleModalOpen(false); resetVehicleForm(); }} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingVehicle ? 'Enregistrer' : 'Créer le véhicule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer le véhicule"
        message={`Êtes-vous sûr de vouloir supprimer le véhicule ${confirmDelete?.plate} ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteVehicle}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
