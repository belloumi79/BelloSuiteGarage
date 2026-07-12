'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Shield, Ban, CheckCircle, Key, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { AdminGarage } from '@/lib/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  trial: { label: 'Essai', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  active: { label: 'Actif', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  suspended: { label: 'Suspendu', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

export default function AdminPage() {
  const [garages, setGarages] = useState<AdminGarage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

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
        addToast(`Code d'activation : ${data.activation_code}`);
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
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
                <th className="pb-3 pr-4">Membres</th>
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
                    <td className="py-4 pr-4 text-slate-400">{g.owner_email || '—'}</td>
                    <td className="py-4 pr-4 text-slate-400">{g.members_count}</td>
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
                              title="Générer un code d'activation"
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
                      </div>
                    </td>
                  </tr>
                );
              })}
              {garages.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">Aucun garage trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
