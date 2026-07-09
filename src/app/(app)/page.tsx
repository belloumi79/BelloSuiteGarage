'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  DollarSign,
  AlertTriangle,
  Package,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Appointment {
  id: string;
  title: string;
  starts_at: string;
  clients?: { company_name?: string | null; first_name?: string | null; last_name?: string | null };
  vehicles?: { plate?: string | null };
}

interface StockItem {
  id: string;
  name: string;
  reference: string | null;
  stock_qty: number;
  stock_min: number;
}

interface DashboardData {
  garage?: { name?: string; city?: string };
  monthlyRevenue?: number;
  totalUnpaid?: number;
  activeORCount?: number;
  lowStock?: StockItem[];
  recentSales?: { date: string; amount: number }[];
  todayAppointments?: Appointment[];
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const dashRes = await fetch('/api/dashboard');
      const dash = await dashRes.json();
      setDashboardData(dash);
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

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Tableau de bord
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 font-medium">Connecté à Supabase</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-200">{dashboardData?.garage?.name || 'Chargement...'}</p>
            <p className="text-[10px] text-slate-500">{dashboardData?.garage?.city || 'Tunis'}</p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-medium">Chargement des données de votre garage...</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 no-print">
        {dashboardData && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CA du Mois</span>
                  <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-slate-50">
                  {Number(dashboardData.monthlyRevenue || 0).toLocaleString('fr-TN')} <span className="text-xs font-medium text-slate-400">DT</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-2">Factures réglées ce mois</p>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50"></div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Factures Impayées</span>
                  <div className="p-2 bg-amber-600/10 text-amber-400 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-slate-50">
                  {Number(dashboardData.totalUnpaid || 0).toLocaleString('fr-TN')} <span className="text-xs font-medium text-slate-400">DT</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-2">Solde total à recevoir</p>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-50"></div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">O.R. Actifs</span>
                  <div className="p-2 bg-emerald-600/10 text-emerald-400 rounded-lg">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-slate-50">
                  {dashboardData.activeORCount || 0}
                </h3>
                <p className="text-[10px] text-slate-500 mt-2">Réparations en cours atelier</p>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50"></div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-red-500/30 transition">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Critique</span>
                  <div className="p-2 bg-red-600/10 text-red-400 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-slate-50">
                  {dashboardData.lowStock?.length || 0}
                </h3>
                <p className="text-[10px] text-slate-500 mt-2">Articles sous le stock minimum</p>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-500 opacity-50"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-200 mb-6">Évolution des encaissements</h3>
                <div className="h-72">
                  {dashboardData.recentSales && dashboardData.recentSales.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.recentSales}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} labelClassName="text-slate-400 text-xs" />
                        <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex justify-center items-center text-slate-500 text-sm">
                      Aucun paiement enregistré pour générer le graphique
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Rendez-vous du jour
                  </h4>
                  {(() => {
                    const appts = dashboardData.todayAppointments ?? [];
                    if (appts.length === 0) {
                      return <p className="text-xs text-slate-500 text-center py-6">Aucun rendez-vous planifié aujourd&apos;hui</p>;
                    }
                    return (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {appts.map((apt: Appointment) => {
                          const clientName = apt.clients?.company_name || `${apt.clients?.first_name} ${apt.clients?.last_name}`;
                          return (
                            <div key={apt.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition">
                              <div>
                                <h5 className="text-xs font-semibold text-slate-200">{apt.title}</h5>
                                <p className="text-[10px] text-slate-500">{clientName} | {apt.vehicles?.plate}</p>
                              </div>
                              <span className="text-[10px] bg-blue-600/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-mono">
                                {new Date(apt.starts_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-rose-400" />
                    Alertes Réapprovisionnement
                  </h4>
                  {(() => {
                    const items = dashboardData.lowStock ?? [];
                    if (items.length === 0) {
                      return <p className="text-xs text-slate-500 text-center py-6">Tout le stock est optimal</p>;
                    }
                    return (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {items.map((itm: StockItem) => (
                          <div key={itm.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-semibold text-slate-200">{itm.name}</h5>
                              <p className="text-[10px] text-slate-500">Réf : {itm.reference}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-rose-400">{Number(itm.stock_qty).toFixed(0)}</span>
                              <span className="text-[10px] text-slate-500 font-medium block">Min {Number(itm.stock_min).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
