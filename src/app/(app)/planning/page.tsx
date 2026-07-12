'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { Client, Vehicle } from '@/lib/types';

interface AgendaEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  description?: string | null;
  clients?: { company_name?: string | null; first_name?: string | null; last_name?: string | null } | null;
  vehicles?: { make?: string | null; model?: string | null; plate?: string | null } | null;
}

export default function PlanningPage() {
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const [agendaForm, setAgendaForm] = useState({
    title: '',
    starts_at: '',
    ends_at: '',
    client_id: '',
    vehicle_id: '',
    status: 'planned',
    color: '#3b82f6',
    description: ''
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const [agdRes, cliRes, vehRes] = await Promise.all([
        fetch('/api/agenda'),
        fetch('/api/clients'),
        fetch('/api/vehicles')
      ]);
      const agd = agdRes.ok ? await agdRes.json() : [];
      const cli = cliRes.ok ? await cliRes.json() : [];
      const veh = vehRes.ok ? await vehRes.json() : [];
      setAgenda(Array.isArray(agd) ? agd : (agd.data ?? []));
      setClients(Array.isArray(cli) ? cli : (cli.data ?? []));
      setVehicles(Array.isArray(veh) ? veh : (veh.data ?? []));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Standard data-fetching pattern: loadData wraps an async API call with state updates.
   
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...agendaForm,
        starts_at: new Date(agendaForm.starts_at).toISOString(),
        ends_at: new Date(agendaForm.ends_at).toISOString(),
      };
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsAgendaModalOpen(false);
        setAgendaForm({
          title: '',
          starts_at: '',
          ends_at: '',
          client_id: '',
          vehicle_id: '',
          status: 'planned',
          color: '#3b82f6',
          description: ''
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgendaDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce rendez-vous ?')) return;
    try {
      const res = await fetch(`/api/agenda/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Planning
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
            <p className="text-slate-400 text-xs font-medium">Chargement du planning...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 no-print">
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <h3 className="text-base font-bold text-slate-200">{"Agenda de l'atelier"}</h3>
            <button
              onClick={() => setIsAgendaModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau Rendez-vous
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
            <div className="space-y-4">
              {agenda.length === 0 ? (
                <p className="text-center text-slate-500 py-12 text-sm">{"Aucun rendez-vous planifié dans l'agenda"}</p>
              ) : (
                agenda.map(event => {
                  const clientName = event.clients
                    ? event.clients.company_name || `${event.clients.first_name || ''} ${event.clients.last_name || ''}`.trim()
                    : 'Aucun client lié';
                  const vehicleLabel = event.vehicles ? `${event.vehicles.make} ${event.vehicles.model} (${event.vehicles.plate})` : 'Aucun véhicule lié';

                  return (
                    <div key={event.id} className="p-4 bg-slate-950/60 border-l-4 border-l-blue-500 border border-slate-800 rounded-r-xl flex items-center justify-between hover:border-slate-700 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-slate-200">{event.title}</h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {event.status === 'planned' ? 'Planifié' : event.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{event.description || 'Pas de description'}</p>
                        <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
                          <span>Client: <strong className="text-slate-400">{clientName}</strong></span>
                          <span>Véhicule: <strong className="text-slate-400">{vehicleLabel}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-300 font-mono">
                            {new Date(event.starts_at).toLocaleDateString('fr-TN')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {new Date(event.starts_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(event.ends_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAgendaDelete(event.id)}
                          className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {isAgendaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">Planifier un rendez-vous</h3>
              <button onClick={() => setIsAgendaModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleAgendaSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{"Titre de l'intervention"}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vidange Golf 8"
                  value={agendaForm.title}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{"Début de l'intervention"}</label>
                  <input
                    type="datetime-local"
                    required
                    value={agendaForm.starts_at}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, starts_at: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{"Fin de l'intervention"}</label>
                  <input
                    type="datetime-local"
                    required
                    value={agendaForm.ends_at}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, ends_at: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Client concerné</label>
                  <select
                    value={agendaForm.client_id}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Aucun --</option>
                    {clients.map(c => {
                      const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
                      return <option key={c.id} value={c.id}>{name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Véhicule lié</label>
                  <select
                    value={agendaForm.vehicle_id}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Aucun --</option>
                    {vehicles
                      .filter(v => !agendaForm.client_id || v.client_id === agendaForm.client_id)
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description / Notes de panne</label>
                <textarea
                  rows={2}
                  value={agendaForm.description}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  placeholder="Symptômes décrits par le client..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsAgendaModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Planifier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
