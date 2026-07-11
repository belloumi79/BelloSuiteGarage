'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Printer,
  CreditCard,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Document, Client, Vehicle, Item, DocumentLine } from '@/lib/types';

interface DashboardData {
  garage?: {
    name: string;
    legal_name: string | null;
    address_line1: string | null;
    city: string | null;
    tax_id: string | null;
    phone: string | null;
    invoice_footer: string | null;
  };
}

type DocumentLineForm = {
  item_id?: string | null;
  description: string;
  line_type: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
};

type DocumentForm = {
  type: string;
  client_id: string;
  vehicle_id: string;
  notes: string;
  lines: DocumentLineForm[];
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;
  const [docFilter, setDocFilter] = useState('all');

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; number: string } | null>(null);

  const { addToast } = useToast();

  const [docForm, setDocForm] = useState<DocumentForm>({
    type: 'quote',
    client_id: '',
    vehicle_id: '',
    notes: '',
    lines: []
  });

  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [addLineQty, setAddLineQty] = useState(1);
  const [addLineDiscount, setAddLineDiscount] = useState(0);

  const [paymentForm, setPaymentForm] = useState({
    document_id: '',
    amount: 0,
    method: 'cash',
    reference: '',
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const [docsRes, clientsRes, vehiclesRes, itemsRes, dashRes] = await Promise.all([
        fetch(`/api/documents?page=${page}&pageSize=${pageSize}`),
        fetch('/api/clients'),
        fetch('/api/vehicles'),
        fetch('/api/items'),
        fetch('/api/dashboard')
      ]);
      const docs = await docsRes.json();
      const cli = await clientsRes.json();
      const veh = await vehiclesRes.json();
      const itm = await itemsRes.json();
      const dash = await dashRes.json();

      const clientList = cli.data ?? cli;
      if (Array.isArray(docs)) {
        setDocuments(docs);
        setTotal(docs.length);
      } else {
        setDocuments(docs.data ?? []);
        setTotal(docs.total ?? 0);
      }
      setClients(clientList);
      setVehicles(veh.data ?? veh);
      setItems(itm.data ?? itm);
      setDashboardData(dash);

      if (clientList.length > 0) {
        setDocForm(prev => {
          if (prev.client_id) return prev;
          return { ...prev, client_id: clientList[0].id };
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Standard data-fetching pattern: loadData wraps an async API call with state updates.
   
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (docForm.client_id) {
      const clientVehicles = vehicles.filter(v => v.client_id === docForm.client_id);
      if (clientVehicles.length > 0) {
        const firstVehicleId = clientVehicles[0].id;
        if (docForm.vehicle_id !== firstVehicleId) {
          // Defer state update to avoid cascading renders during render phase
          queueMicrotask(() => {
            setDocForm(prev => ({ ...prev, vehicle_id: firstVehicleId }));
          });
        }
      }
    }
  }, [docForm.client_id, vehicles, docForm.vehicle_id]);

  const addLineItem = () => {
    const matchedItem = items.find(i => i.id === selectedItemToAdd);
    if (!matchedItem) return;

    const qty = Number(addLineQty);
    const disc = Number(addLineDiscount);
    const basePrice = Number(matchedItem.selling_price);
    const priceAfterDiscount = basePrice * (1 - disc / 100);
    const totalHT = qty * priceAfterDiscount;
    const totalVAT = totalHT * (Number(matchedItem.vat_rate) / 100);
    const totalTTC = totalHT + totalVAT;

    const newLine = {
      item_id: matchedItem.id,
      description: matchedItem.name,
      line_type: matchedItem.type,
      quantity: qty,
      unit: matchedItem.unit || 'pcs',
      unit_price: basePrice,
      discount_percent: disc,
      vat_rate: matchedItem.vat_rate,
      total_ht: totalHT,
      total_vat: totalVAT,
      total_ttc: totalTTC
    };

    setDocForm(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));

    setAddLineQty(1);
    setAddLineDiscount(0);
    setSelectedItemToAdd('');
  };

  const removeDocLine = (index: number) => {
    setDocForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const resetDocForm = () => {
    setDocForm({
      type: 'quote',
      client_id: clients[0]?.id || '',
      vehicle_id: '',
      notes: '',
      lines: []
    });
    setEditingDoc(null);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docForm.lines.length === 0) {
      alert('Veuillez ajouter au moins une ligne au document.');
      return;
    }
    try {
      const isEdit = !!editingDoc;
      const url = isEdit ? `/api/documents/${editingDoc.id}` : '/api/documents';
      const body = isEdit
        ? { notes: docForm.notes, lines: docForm.lines }
        : docForm;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        console.error('Server error:', err);
        addToast(err.error || JSON.stringify(err.details) || `Erreur ${res.status}`, 'error');
        return;
      }
      setIsDocModalOpen(false);
      resetDocForm();
      loadData();
      addToast(isEdit ? 'Document modifié' : 'Document créé');
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDocTransition = async (docId: string, nextType: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionTo: nextType })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        addToast(err.error || 'Erreur de conversion', 'error');
        return;
      }
      setSelectedDoc(null);
      loadData();
      addToast(`Document converti en ${nextType === 'repair_order' ? 'ordre de réparation' : 'facture'}`);
    } catch (err) {
      console.error(err);
      addToast('Erreur de conversion', 'error');
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/documents/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Document supprimé');
        setSelectedDoc(null);
        loadData();
      }
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        addToast(err.error || JSON.stringify(err.details) || `Erreur ${res.status}`, 'error');
        return;
      }
      setIsPaymentModalOpen(false);
      setPaymentForm({
        document_id: '',
        amount: 0,
        method: 'cash',
        reference: '',
        notes: ''
      });
      setSelectedDoc(null);
      loadData();
      addToast('Paiement enregistré');
    } catch (err) {
      console.error(err);
      addToast('Erreur lors du paiement', 'error');
    }
  };

  const exportSalesJournalCSV = () => {
    const paidDocs = documents.filter(d => Number(d.amount_paid) > 0);
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'N° Facture,Date,Client,Total TTC,Montant Payé,Statut\n';

    paidDocs.forEach(d => {
      const clientName = d.clients?.company_name || `${d.clients?.first_name || ''} ${d.clients?.last_name || ''}`.trim();
      csvContent += `${d.number},${d.issue_date.split('T')[0]},"${clientName}",${Number(d.total_ttc).toFixed(2)},${Number(d.amount_paid).toFixed(2)},${d.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = window.document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_ventes_bellogarage_${new Date().toISOString().split('T')[0]}.csv`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const docTotals = docForm.lines.reduce(
    (acc: { ht: number; vat: number; ttc: number }, line: DocumentLineForm) => {
      acc.ht += line.total_ht;
      acc.vat += line.total_vat;
      acc.ttc += line.total_ttc;
      return acc;
    },
    { ht: 0, vat: 0, ttc: 0 }
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {selectedDoc && (
        <div className="print-only hidden p-8 bg-white text-black min-h-screen">
          <div className="flex justify-between border-b border-gray-300 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold">{dashboardData?.garage?.name}</h1>
              <p className="text-sm text-gray-500">{dashboardData?.garage?.legal_name}</p>
              <p className="text-sm">{dashboardData?.garage?.address_line1}, {dashboardData?.garage?.city}</p>
              <p className="text-sm">Mat. Fisc : {dashboardData?.garage?.tax_id}</p>
              <p className="text-sm">Tél : {dashboardData?.garage?.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase text-gray-700">
                {selectedDoc.type === 'quote' ? 'Devis' : selectedDoc.type === 'repair_order' ? 'Ordre de Réparation' : 'Facture'}
              </h2>
              <p className="text-xl font-bold mt-1">{selectedDoc.number}</p>
              <p className="text-sm mt-3">Date : {selectedDoc.issue_date.split('T')[0]}</p>
              {selectedDoc.due_date && <p className="text-sm">Échéance : {selectedDoc.due_date.split('T')[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border border-gray-200 p-4 rounded">
              <h3 className="font-semibold text-gray-600 text-xs uppercase mb-2">Destinataire / Client</h3>
              <p className="font-bold">{selectedDoc.clients?.company_name || `${selectedDoc.clients?.first_name} ${selectedDoc.clients?.last_name}`}</p>
              <p>{selectedDoc.clients?.address_line1}</p>
              <p>{selectedDoc.clients?.postal_code} {selectedDoc.clients?.city}</p>
              <p>Tél : {selectedDoc.clients?.phone}</p>
              {selectedDoc.clients?.tax_id && <p>MF : {selectedDoc.clients?.tax_id}</p>}
            </div>
            <div className="border border-gray-200 p-4 rounded">
              <h3 className="font-semibold text-gray-600 text-xs uppercase mb-2">Véhicule</h3>
              {selectedDoc.vehicles ? (
                <>
                  <p className="font-bold">{selectedDoc.vehicles.make} {selectedDoc.vehicles.model}</p>
                  <p>Immat : {selectedDoc.vehicles.plate}</p>
                  <p>Énergie : {selectedDoc.vehicles.fuel} | Couleur : {selectedDoc.vehicles.color}</p>
                </>
              ) : (
                <p className="text-gray-500">Aucun véhicule lié</p>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-8 text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
                <th className="p-3 border border-gray-200">Réf</th>
                <th className="p-3 border border-gray-200">Description</th>
                <th className="p-3 border border-gray-200 text-right">Qté</th>
                <th className="p-3 border border-gray-200 text-right">P.U HT</th>
                {selectedDoc.document_lines?.some((l: DocumentLine) => Number(l.discount_percent) > 0) && (
                  <th className="p-3 border border-gray-200 text-right">Rem.</th>
                )}
                <th className="p-3 border border-gray-200 text-right">TVA</th>
                <th className="p-3 border border-gray-200 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {selectedDoc.document_lines?.map((line: DocumentLine) => (
                <tr key={line.id} className="border-b border-gray-200">
                  <td className="p-3 border border-gray-100 font-mono text-xs">{line.item_id ? items.find(i => i.id === line.item_id)?.reference : 'MO'}</td>
                  <td className="p-3 border border-gray-100">{line.description}</td>
                  <td className="p-3 border border-gray-100 text-right">{Number(line.quantity).toFixed(1)}</td>
                  <td className="p-3 border border-gray-100 text-right">{Number(line.unit_price).toFixed(2)}</td>
                  {selectedDoc.document_lines?.some((l: DocumentLine) => Number(l.discount_percent) > 0) && (
                    <td className="p-3 border border-gray-100 text-right">{Number(line.discount_percent) > 0 ? `${Number(line.discount_percent)}%` : '-'}</td>
                  )}
                  <td className="p-3 border border-gray-100 text-right">{Number(line.vat_rate)}%</td>
                  <td className="p-3 border border-gray-100 text-right">{Number(line.total_ht).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-12">
            <div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total HT :</span>
                <span>{Number(selectedDoc.subtotal_ht).toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total TVA :</span>
                <span>{Number(selectedDoc.total_vat).toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-2 text-blue-700">
                <span>Total TTC :</span>
                <span>{Number(selectedDoc.total_ttc).toFixed(2)} DT</span>
              </div>
              {Number(selectedDoc.amount_paid) > 0 && (
                <div className="flex justify-between font-semibold text-green-700">
                  <span>Montant réglé :</span>
                  <span>{Number(selectedDoc.amount_paid).toFixed(2)} DT</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
            <p>{dashboardData?.garage?.invoice_footer || 'Merci pour votre confiance. BelloGarage S.A.R.L. Tunis.'}</p>
          </div>
        </div>
      )}

      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Documents & Devis
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
            <p className="text-slate-400 text-xs font-medium">Chargement des documents...</p>
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
                placeholder="Rechercher par N° document, client, immatriculation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Tous les types</option>
                <option value="quote">Devis</option>
                <option value="repair_order">Ordres de Réparation</option>
                <option value="invoice">Factures</option>
              </select>
              <button
                onClick={() => {
                  if (clients.length === 0) {
                    alert('Créez au moins un client avant de générer un document.');
                    return;
                  }
                  setDocForm({
                    type: 'quote',
                    client_id: clients[0].id,
                    vehicle_id: vehicles.find(v => v.client_id === clients[0].id)?.id || '',
                    notes: '',
                    lines: []
                  });
                  setIsDocModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                Créer Document
              </button>
              <button
                onClick={exportSalesJournalCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                title="Exporter le journal des ventes en CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents
              .filter(d => {
                const searchLower = debouncedSearch.toLowerCase();
                const clientName = d.clients ? (d.clients.company_name || `${d.clients.first_name} ${d.clients.last_name}`).toLowerCase() : '';
                const plate = d.vehicles ? (d.vehicles.plate || '').toLowerCase() : '';
                const matchesSearch = d.number.toLowerCase().includes(searchLower) || clientName.includes(searchLower) || plate.includes(searchLower);
                const matchesType = docFilter === 'all' || d.type === docFilter;
                return matchesSearch && matchesType;
              })
              .map(doc => {
                const clientName = doc.clients?.company_name || `${doc.clients?.first_name || ''} ${doc.clients?.last_name || ''}`.trim();
                const typeLabel = doc.type === 'quote' ? 'Devis' : doc.type === 'repair_order' ? 'Ordre de Rép. (O.R.)' : 'Facture';

                return (
                  <div key={doc.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${doc.type === 'quote' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : doc.type === 'repair_order' ? 'bg-amber-600/10 text-amber-400 border-amber-500/20' : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'}`}>
                          {typeLabel}
                        </span>
                        <h4 className="text-base font-bold text-slate-200 mt-2 font-mono">{doc.number}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Date émission</span>
                        <span className="text-xs font-semibold text-slate-300 font-mono">{doc.issue_date.split('T')[0]}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Client :</span>
                        <p className="text-slate-200 font-semibold mt-0.5 truncate">{clientName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Véhicule :</span>
                        <p className="text-slate-200 font-semibold mt-0.5 truncate">
                          {doc.vehicles ? `${doc.vehicles.make} ${doc.vehicles.model} (${doc.vehicles.plate})` : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Total TTC</span>
                        <p className="text-lg font-display font-extrabold text-slate-50 font-mono">
                          {Number(doc.total_ttc).toFixed(2)} <span className="text-xs font-medium text-slate-400">DT</span>
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${doc.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : doc.status === 'sent' || doc.status === 'partial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {doc.status === 'draft' ? 'Brouillon' : doc.status === 'sent' ? 'Envoyé' : doc.status === 'partial' ? 'Partiel' : doc.status === 'paid' ? 'Payé' : doc.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 no-print">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setTimeout(() => window.print(), 200);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition flex items-center gap-1.5 text-xs"
                          title="Imprimer / Télécharger PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimer
                        </button>
                        {doc.type === 'invoice' && doc.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setPaymentForm(prev => ({ ...prev, document_id: doc.id, amount: Number(doc.total_ttc) - Number(doc.amount_paid) }));
                              setIsPaymentModalOpen(true);
                            }}
                            className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-lg text-emerald-400 transition flex items-center gap-1.5 text-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Encaisser
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {doc.type === 'quote' && doc.status === 'draft' && (
                          <button
                            onClick={() => handleDocTransition(doc.id, 'repair_order')}
                            className="p-1.5 bg-blue-600 text-slate-100 rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            Convertir en O.R.
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        {doc.type === 'repair_order' && (
                          <button
                            onClick={() => handleDocTransition(doc.id, 'invoice')}
                            className="p-1.5 bg-blue-600 text-slate-100 rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            Facturer
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingDoc(doc);
                            setDocForm({
                              type: doc.type,
                              client_id: doc.client_id,
                              vehicle_id: doc.vehicle_id || '',
                              notes: doc.notes || '',
                              lines: (doc.document_lines || []).map((l: DocumentLine) => ({
                                item_id: l.item_id || '',
                                description: l.description || '',
                                line_type: l.line_type || 'part',
                                quantity: Number(l.quantity),
                                unit: l.unit || 'pcs',
                                unit_price: Number(l.unit_price),
                                discount_percent: Number(l.discount_percent),
                                vat_rate: Number(l.vat_rate),
                                total_ht: Number(l.total_ht),
                                total_vat: Number(l.total_vat),
                                total_ttc: Number(l.total_ttc)
                              }))
                            });
                            setIsDocModalOpen(true);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: doc.id, number: doc.number })}
                          className="p-2 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 rounded-lg text-slate-400 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">&larr; Précédent</button>
              <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">Suivant &rarr;</button>
            </div>
          )}
        </div>
      </div>

      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">{editingDoc ? 'Modifier le document' : 'Générer un Devis, Ordre ou Facture'}</h3>
              <button onClick={() => { setIsDocModalOpen(false); resetDocForm(); }} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleDocSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type de Document</label>
                    <select
                      value={docForm.type}
                      onChange={(e) => setDocForm(prev => ({ ...prev, type: e.target.value }))}
                      disabled={!!editingDoc}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none disabled:opacity-50"
                    >
                      <option value="quote">Devis (Proposition)</option>
                      <option value="repair_order">Ordre de Réparation (O.R.)</option>
                      <option value="invoice">Facture Directe</option>
                    </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Client</label>
                    <select
                      value={docForm.client_id}
                      onChange={(e) => setDocForm(prev => ({ ...prev, client_id: e.target.value }))}
                      disabled={!!editingDoc}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none disabled:opacity-50"
                    >
                      {clients.map(c => {
                        const name = c.company_name || `${c.first_name} ${c.last_name}`;
                        return <option key={c.id} value={c.id}>{name}</option>;
                      })}
                    </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Véhicule lié</label>
                    <select
                      value={docForm.vehicle_id}
                      onChange={(e) => setDocForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                      disabled={!!editingDoc}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">-- Aucun véhicule --</option>
                      {vehicles
                        .filter(v => v.client_id === docForm.client_id)
                        .map(v => (
                          <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-300">{"Ajouter des lignes (Pièces & Main-d'œuvre)"}</h4>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block mb-1">Article</label>
                    <select
                      value={selectedItemToAdd}
                      onChange={(e) => setSelectedItemToAdd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">-- Sélectionner --</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.type === 'part' ? 'Pièce' : 'MO'}) - {Number(i.selling_price).toFixed(2)} DT</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={addLineQty}
                      onChange={(e) => setAddLineQty(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Remise (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addLineDiscount}
                      onChange={(e) => setAddLineDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={addLineItem}
                      disabled={!selectedItemToAdd}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-100 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
                    >
                      Ajouter la ligne
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-900/50">
                      <th className="p-3">Libellé / Description</th>
                      <th className="p-3 text-right">P.U HT</th>
                      <th className="p-3 text-right">Qté</th>
                      <th className="p-3 text-right">Remise</th>
                      <th className="p-3 text-right">Total HT</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docForm.lines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">Aucun article ajouté. Utilisez le sélecteur ci-dessus pour ajouter des lignes.</td>
                      </tr>
                    ) : (
                      docForm.lines.map((line: DocumentLineForm, idx: number) => (
                        <tr key={idx} className="border-b border-slate-800">
                          <td className="p-3 text-slate-200 font-medium">{line.description}</td>
                          <td className="p-3 text-right text-slate-300 font-mono">{Number(line.unit_price).toFixed(2)} DT</td>
                          <td className="p-3 text-right text-slate-300 font-mono">{line.quantity}</td>
                          <td className="p-3 text-right text-slate-400">{line.discount_percent}%</td>
                          <td className="p-3 text-right text-slate-100 font-semibold font-mono">{Number(line.total_ht).toFixed(2)} DT</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeDocLine(idx)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-start border-t border-slate-800 pt-6">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Notes internes / Observations</label>
                  <textarea
                    rows={2}
                    value={docForm.notes}
                    onChange={(e) => setDocForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 w-80 focus:outline-none"
                    placeholder="Commentaires visibles sur le document..."
                  />
                </div>
                <div className="w-64 space-y-2 text-xs border border-slate-800 p-4 rounded-xl bg-slate-950/60 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total HT :</span>
                    <span>{Number(docTotals.ht).toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>TVA (19%) :</span>
                    <span>{Number(docTotals.vat).toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-slate-100 font-bold border-t border-slate-800 pt-2 text-sm">
                    <span>Total TTC :</span>
                    <span className="text-blue-400">{Number(docTotals.ttc).toFixed(2)} DT</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => { setIsDocModalOpen(false); resetDocForm(); }} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingDoc ? 'Enregistrer' : 'Générer le document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">Enregistrer un règlement</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Montant Reçu (DT)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mode de Règlement</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte Bancaire</option>
                  <option value="check">Chèque</option>
                  <option value="transfer">Virement Bancaire</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Référence (N° Chèque, Transfert...)</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Remarques / Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer le document"
        message={`Êtes-vous sûr de vouloir supprimer le document ${confirmDelete?.number} ?`}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDeleteDoc}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
