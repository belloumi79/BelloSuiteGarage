'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Paramètres Garage
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
            <p className="text-slate-400 text-xs font-medium">Chargement...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 no-print">
        {dashboardData && (
          <div className="space-y-6">
            <div className="max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-200">Fiche Établissement (Garage)</h3>
                <p className="text-xs text-slate-500">Configurez les coordonnées par défaut de votre garage pour l'impression des factures.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom du Garage</label>
                  <input
                    type="text"
                    value={dashboardData.garage.name}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Matricule Fiscal</label>
                  <input
                    type="text"
                    value={dashboardData.garage.tax_id || ''}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={dashboardData.garage.phone || ''}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail de contact</label>
                  <input
                    type="text"
                    value={dashboardData.garage.email || ''}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400"
                  />
                </div>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-blue-400 mb-1">Note de Production</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ce garage a été automatiquement créé et initialisé dans votre base de données Supabase. Pour modifier directement les coordonnées du garage, vous pouvez éditer la table <code className="text-blue-300 font-mono">public.garages</code> dans l'éditeur SQL Supabase.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
