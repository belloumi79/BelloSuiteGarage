'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Garage } from '@/lib/types';

export default function SettingsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
      setForm({
        name: data.garage.name || '',
        legal_name: data.garage.legal_name || '',
        tax_id: data.garage.tax_id || '',
        phone: data.garage.phone || '',
        email: data.garage.email || '',
        address_line1: data.garage.address_line1 || '',
        city: data.garage.city || '',
        invoice_footer: data.garage.invoice_footer || '',
        vat_default: String(data.garage.vat_default || 19),
      });
    } catch {
      addToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/garage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          legal_name: form.legal_name || undefined,
          tax_id: form.tax_id || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address_line1: form.address_line1 || undefined,
          city: form.city || undefined,
          invoice_footer: form.invoice_footer || undefined,
          vat_default: form.vat_default ? Number(form.vat_default) : undefined,
        }),
      });
      if (res.ok) {
        addToast('Paramètres enregistrés');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    } finally {
      setSaving(false);
    }
  };

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
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Raison sociale</label>
                  <input
                    type="text"
                    value={form.legal_name}
                    onChange={e => setForm(p => ({ ...p, legal_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Matricule Fiscal</label>
                  <input
                    type="text"
                    value={form.tax_id}
                    onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail de contact</label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Adresse</label>
                  <input
                    type="text"
                    value={form.address_line1}
                    onChange={e => setForm(p => ({ ...p, address_line1: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">TVA par défaut (%)</label>
                  <input
                    type="number"
                    value={form.vat_default}
                    onChange={e => setForm(p => ({ ...p, vat_default: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Pied de facture</label>
                <textarea
                  rows={2}
                  value={form.invoice_footer}
                  onChange={e => setForm(p => ({ ...p, invoice_footer: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="Merci pour votre confiance."
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-slate-100 font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
