/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';


import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Users,
  Car,
  Package,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Plus,
  Search,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Layers,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Tag
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'vehicles' | 'stock' | 'documents' | 'planning' | 'settings'>('dashboard');

  // Database Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');

  // Modals & Action States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  // Selected details for view/edit
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Form inputs
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

  const [itemForm, setItemForm] = useState({
    type: 'part',
    reference: '',
    barcode: '',
    name: '',
    description: '',
    purchase_price: 0,
    selling_price: 0,
    vat_rate: 19,
    stock_qty: 0,
    stock_min: 0,
    stock_location: ''
  });

  // Invoice / Document Creator Form State
  const [docForm, setDocForm] = useState<DocumentForm>({
    type: 'quote',
    client_id: '',
    vehicle_id: '',
    notes: '',
    lines: []
  });

  // Line item picker inside document creator
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [addLineQty, setAddLineQty] = useState(1);
  const [addLineDiscount, setAddLineDiscount] = useState(0);

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    document_id: '',
    amount: 0,
    method: 'cash',
    reference: '',
    notes: ''
  });

  // Agenda Form
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

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, clientsRes, vehiclesRes, itemsRes, docsRes, agendaRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clients'),
        fetch('/api/vehicles'),
        fetch('/api/items'),
        fetch('/api/documents'),
        fetch('/api/agenda')
      ]);

      const dash = await dashRes.json();
      const cli = await clientsRes.json();
      const veh = await vehiclesRes.json();
      const itm = await itemsRes.json();
      const docs = await docsRes.json();
      const agd = await agendaRes.json();

      setDashboardData(dash);
      setClients(cli);
      setVehicles(veh);
      setItems(itm);
      setDocuments(docs);
      setAgenda(agd);

      if (cli.length > 0) {
        setVehicleForm(prev => ({ ...prev, client_id: cli[0].id }));
        setDocForm(prev => ({ ...prev, client_id: cli[0].id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler
    loadData();
  }, []);

  // Recalculate linked vehicles when client changes in document builder
  useEffect(() => {
    if (docForm.client_id) {
      const clientVehicles = vehicles.filter(v => v.client_id === docForm.client_id);
      if (clientVehicles.length > 0) {
        // eslint-disable-next-line react-compiler/react-compiler
        setDocForm(prev => ({ ...prev, vehicle_id: clientVehicles[0].id }));
      } else {
        // eslint-disable-next-line react-compiler/react-compiler
        setDocForm(prev => ({ ...prev, vehicle_id: '' }));
      }
    }
  }, [docForm.client_id, vehicles]);

  // Handle Client Creation
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setIsClientModalOpen(false);
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
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Vehicle Creation
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      });
      if (res.ok) {
        setIsVehicleModalOpen(false);
        setVehicleForm(prev => ({
          ...prev,
          plate: '',
          make: '',
          model: '',
          version: '',
          color: '',
          mileage: 0,
          notes: ''
        }));
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Item Creation
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm)
      });
      if (res.ok) {
        setIsItemModalOpen(false);
        setItemForm({
          type: 'part',
          reference: '',
          barcode: '',
          name: '',
          description: '',
          purchase_price: 0,
          selling_price: 0,
          vat_rate: 19,
          stock_qty: 0,
          stock_min: 0,
          stock_location: ''
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Item to Document Line List
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

  // Document creation submit
  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docForm.lines.length === 0) {
      alert('Veuillez ajouter au moins une ligne au document.');
      return;
    }
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm)
      });
      if (res.ok) {
        setIsDocModalOpen(false);
        setDocForm({
          type: 'quote',
          client_id: clients[0]?.id || '',
          vehicle_id: '',
          notes: '',
          lines: []
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Transition Workflow
  const handleDocTransition = async (docId: string, nextType: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionTo: nextType })
      });
      if (res.ok) {
        setSelectedDoc(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Document Delete
  const handleDocDelete = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedDoc(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Payment register submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      if (res.ok) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Agenda Event creation submit
  const handleAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agendaForm)
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

  // Delete Agenda Event
  const handleAgendaDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce rendez-vous ?')) return;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV function for billing journal
  const exportSalesJournalCSV = () => {
    const paidDocs = documents.filter(d => Number(d.amount_paid) > 0);
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'N° Facture,Date,Client,Total TTC,Montant Payé,Statut\n';

    paidDocs.forEach(d => {
      const clientName = d.clients.company_name || `${d.clients.first_name} ${d.clients.last_name}`;
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

  // Get total stats for document creation
  const docTotals = docForm.lines.reduce(
    (acc: any, line: any) => {
      acc.ht += line.total_ht;
      acc.vat += line.total_vat;
      acc.ttc += line.total_ttc;
      return acc;
    },
    { ht: 0, vat: 0, ttc: 0 }
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between no-print z-10">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <Wrench className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">BelloGarage</span>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Tunis Edition</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Tableau de bord
            </button>
            <button
              onClick={() => { setActiveTab('clients'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Users className="w-4 h-4" />
              Clients
            </button>
            <button
              onClick={() => { setActiveTab('vehicles'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'vehicles'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Car className="w-4 h-4" />
              Véhicules
            </button>
            <button
              onClick={() => { setActiveTab('stock'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'stock'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Package className="w-4 h-4" />
              Articles & Stock
            </button>
            <button
              onClick={() => { setActiveTab('documents'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'documents'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" />
              Documents & Devis
            </button>
            <button
              onClick={() => { setActiveTab('planning'); setSelectedDoc(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'planning'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Planning
            </button>
          </nav>
        </div>

        {/* Company Settings Trigger */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={() => { setActiveTab('settings'); setSelectedDoc(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Settings className="w-4 h-4" />
            Paramètres Garage
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950 relative">
        {/* Print Layout Overlay */}
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
                <p className="font-bold">{selectedDoc.clients.company_name || `${selectedDoc.clients.first_name} ${selectedDoc.clients.last_name}`}</p>
                <p>{selectedDoc.clients.address_line1}</p>
                <p>{selectedDoc.clients.postal_code} {selectedDoc.clients.city}</p>
                <p>Tél : {selectedDoc.clients.phone}</p>
                {selectedDoc.clients.tax_id && <p>MF : {selectedDoc.clients.tax_id}</p>}
              </div>
              <div className="border border-gray-200 p-4 rounded">
                <h3 className="font-semibold text-gray-600 text-xs uppercase mb-2">Véhicule</h3>
                {selectedDoc.vehicles ? (
                  <>
                    <p className="font-bold">{selectedDoc.vehicles.make} {selectedDoc.vehicles.model}</p>
                    <p>Immat : {selectedDoc.vehicles.plate}</p>
                    {selectedDoc.mileage_in && <p>Km Entrée : {selectedDoc.mileage_in} Km</p>}
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
                  {selectedDoc.document_lines.some((l: any) => Number(l.discount_percent) > 0) && (
                    <th className="p-3 border border-gray-200 text-right">Rem.</th>
                  )}
                  <th className="p-3 border border-gray-200 text-right">TVA</th>
                  <th className="p-3 border border-gray-200 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {selectedDoc.document_lines.map((line: any) => (
                  <tr key={line.id} className="border-b border-gray-200">
                    <td className="p-3 border border-gray-100 font-mono text-xs">{line.itemId ? items.find(i => i.id === line.itemId)?.reference : 'MO'}</td>
                    <td className="p-3 border border-gray-100">{line.description}</td>
                    <td className="p-3 border border-gray-100 text-right">{Number(line.quantity).toFixed(1)}</td>
                    <td className="p-3 border border-gray-100 text-right">{Number(line.unit_price).toFixed(2)}</td>
                    {selectedDoc.document_lines.some((l: any) => Number(l.discount_percent) > 0) && (
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

        {/* Regular Header */}
        <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              {activeTab === 'dashboard' ? 'Tableau de bord' : activeTab}
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

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-medium">Chargement des données de votre garage...</p>
            </div>
          </div>
        )}

        {/* Main Tab Content */}
        <div className="p-6 space-y-6 no-print">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Stats Cards Grid */}
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

              {/* Chart & Stock Alert Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
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

                {/* Stock alerts and today's schedule list */}
                <div className="space-y-6">
                  {/* Today appointments */}
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Rendez-vous du jour
                    </h4>
                    {dashboardData.todayAppointments?.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {dashboardData.todayAppointments.map((apt: any) => {
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
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">Aucun rendez-vous planifié aujourd'hui</p>
                    )}
                  </div>

                  {/* Low Stock details */}
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4 text-rose-400" />
                      Alertes Réapprovisionnement
                    </h4>
                    {dashboardData.lowStock?.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {dashboardData.lowStock.map((itm: any) => (
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
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">Tout le stock est optimal</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                {/* Search */}
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
                {/* Add button */}
                <button
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Client
                </button>
              </div>

              {/* Clients Table */}
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
                        return name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery));
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
                                onClick={() => {
                                  setSelectedClient(client);
                                  // Open details view or edit modal
                                }}
                                className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                                title="Fiche Client"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Supprimer ce client ?')) {
                                    await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
                                    loadData();
                                  }
                                }}
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
            </div>
          )}

          {/* TAB: VEHICLES */}
          {activeTab === 'vehicles' && (
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

              {/* Vehicles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {vehicles
                  .filter(v => {
                    const searchLower = searchQuery.toLowerCase();
                    return (
                      v.plate.toLowerCase().includes(searchLower) ||
                      v.make.toLowerCase().includes(searchLower) ||
                      v.model.toLowerCase().includes(searchLower)
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
                            onClick={async () => {
                              if (confirm('Supprimer ce véhicule ?')) {
                                const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: 'DELETE' });
                                if (res.ok) loadData();
                                else {
                                  const err = await res.json();
                                  alert(err.error);
                                }
                              }
                            }}
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
          )}

          {/* TAB: STOCK / ARTICLES */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher par désignation, référence ou code-barres..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="part">Pièces de rechange</option>
                    <option value="labor">Main d'œuvre</option>
                  </select>
                  <button
                    onClick={() => setIsItemModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvel Article
                  </button>
                </div>
              </div>

              {/* Items List Table */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-900/50">
                      <th className="p-4">Désignation</th>
                      <th className="p-4">Référence</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">P. Achat HT</th>
                      <th className="p-4">P. Vente HT</th>
                      <th className="p-4">Stock Actuel</th>
                      <th className="p-4">Stock Min.</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter(i => {
                        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (i.reference && i.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (i.barcode && i.barcode.includes(searchQuery));
                        const matchesType = itemFilter === 'all' || i.type === itemFilter;
                        return matchesSearch && matchesType;
                      })
                      .map(item => {
                        const isLow = item.type === 'part' && Number(item.stock_qty) <= Number(item.stock_min);
                        return (
                          <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                            <td className="p-4 font-semibold text-slate-200">
                              <div className="flex items-center gap-2">
                                {item.name}
                                {isLow && (
                                  <span className="bg-rose-500/10 text-rose-400 text-[9px] px-1.5 py-0.5 rounded border border-rose-500/20 uppercase font-bold">Stock Bas</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 font-mono text-xs">{item.reference || '-'}</td>
                            <td className="p-4">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                item.type === 'part'
                                  ? 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                                  : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {item.type === 'part' ? 'Pièce' : 'M.O'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 font-mono">{Number(item.purchase_price).toFixed(2)} DT</td>
                            <td className="p-4 text-slate-200 font-semibold font-mono">{Number(item.selling_price).toFixed(2)} DT</td>
                            <td className="p-4 font-semibold font-mono">
                              {item.type === 'part' ? (
                                <span className={isLow ? 'text-rose-400' : 'text-slate-200'}>
                                  {Number(item.stock_qty).toFixed(0)} {item.unit}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="p-4 text-slate-400 font-mono">{item.type === 'part' ? Number(item.stock_min).toFixed(0) : '-'}</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              <button
                                onClick={async () => {
                                  if (confirm('Supprimer cet article ?')) {
                                    await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
                                    loadData();
                                  }
                                }}
                                className="p-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 transition"
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
            </div>
          )}

          {/* TAB: DOCUMENTS (Devis, OR, Facture) */}
          {activeTab === 'documents' && (
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

              {/* Documents grid list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents
                  .filter(d => {
                    const searchLower = searchQuery.toLowerCase();
                    const clientName = d.clients ? (d.clients.company_name || `${d.clients.first_name} ${d.clients.last_name}`).toLowerCase() : '';
                    const plate = d.vehicles ? d.vehicles.plate.toLowerCase() : '';
                    const matchesSearch = d.number.toLowerCase().includes(searchLower) || clientName.includes(searchLower) || plate.includes(searchLower);
                    const matchesType = docFilter === 'all' || d.type === docFilter;
                    return matchesSearch && matchesType;
                  })
                  .map(doc => {
                    const clientName = doc.clients.company_name || `${doc.clients.first_name} ${doc.clients.last_name}`;
                    const typeLabel = doc.type === 'quote' ? 'Devis' : doc.type === 'repair_order' ? 'Ordre de Rép. (O.R.)' : 'Facture';

                    return (
                      <div key={doc.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                              doc.type === 'quote'
                                ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'
                                : doc.type === 'repair_order'
                                ? 'bg-amber-600/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                            }`}>
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
                          <span className={`text-xs px-2.5 py-1 rounded-full border ${
                            doc.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : doc.status === 'sent' || doc.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {doc.status === 'draft' ? 'Brouillon' : doc.status === 'sent' ? 'Envoyé' : doc.status === 'partial' ? 'Partiel' : doc.status === 'paid' ? 'Payé' : doc.status}
                          </span>
                        </div>

                        {/* Document Actions & Transitions */}
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
                              onClick={() => handleDocDelete(doc.id)}
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
            </div>
          )}

          {/* TAB: PLANNING */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-base font-bold text-slate-200">Agenda de l'atelier</h3>
                <button
                  onClick={() => setIsAgendaModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Rendez-vous
                </button>
              </div>

              {/* Simple Agenda View */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
                <div className="space-y-4">
                  {agenda.length === 0 ? (
                    <p className="text-center text-slate-500 py-12 text-sm">Aucun rendez-vous planifié dans l'agenda</p>
                  ) : (
                    agenda.map(event => {
                      const clientName = event.clients
                        ? event.clients.company_name || `${event.clients.first_name} ${event.clients.last_name}`
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
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && dashboardData && (
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

        {/* Modal: Client Form */}
        {isClientModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Créer un nouveau client</h3>
                <button onClick={() => setIsClientModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
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
                    <label className="text-xs text-slate-400 block mb-1">Nom de l'entreprise</label>
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
                  <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Créer le client</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Vehicle Form */}
        {isVehicleModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Enregistrer un véhicule</h3>
                <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
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
                  <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Créer le véhicule</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Item Form */}
        {isItemModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Ajouter un article / prestation</h3>
                <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
              </div>
              <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Type d'article</label>
                    <select
                      value={itemForm.type}
                      onChange={(e) => setItemForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    >
                      <option value="part">Pièce de rechange</option>
                      <option value="labor">Main d'œuvre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Référence</label>
                    <input
                      type="text"
                      placeholder="e.g. PLA-AV-G8"
                      value={itemForm.reference}
                      onChange={(e) => setItemForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nom de l'article / libellé</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plaquettes avant Brembo"
                    value={itemForm.name}
                    onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prix Achat HT (DT)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={itemForm.purchase_price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, purchase_price: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prix Vente HT (DT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={itemForm.selling_price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, selling_price: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">TVA (%)</label>
                    <input
                      type="number"
                      value={itemForm.vat_rate}
                      onChange={(e) => setItemForm(prev => ({ ...prev, vat_rate: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {itemForm.type === 'part' && (
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-800/60 pt-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Stock Initial</label>
                      <input
                        type="number"
                        value={itemForm.stock_qty}
                        onChange={(e) => setItemForm(prev => ({ ...prev, stock_qty: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Stock Minimum</label>
                      <input
                        type="number"
                        value={itemForm.stock_min}
                        onChange={(e) => setItemForm(prev => ({ ...prev, stock_min: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Emplacement</label>
                      <input
                        type="text"
                        placeholder="e.g. Rayon A"
                        value={itemForm.stock_location}
                        onChange={(e) => setItemForm(prev => ({ ...prev, stock_location: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Créer l'article</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Document/Workflow Form (Devis -> OR -> Facture Creator) */}
        {isDocModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Générer un Devis, Ordre ou Facture</h3>
                <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
              </div>
              <form onSubmit={handleDocSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Type de Document</label>
                    <select
                      value={docForm.type}
                      onChange={(e) => setDocForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
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

                {/* Add Line Section */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300">Ajouter des lignes (Pièces & Main-d'œuvre)</h4>
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

                {/* Lines List Table */}
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
                        docForm.lines.map((line: any, idx: number) => (
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

                {/* Doc Summary and submit */}
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
                  <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">Générer le document</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Payment Form */}
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

        {/* Modal: Agenda/Appointment Form */}
        {isAgendaModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Planifier un rendez-vous</h3>
                <button onClick={() => setIsAgendaModalOpen(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
              </div>
              <form onSubmit={handleAgendaSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Titre de l'intervention</label>
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
                    <label className="text-xs text-slate-400 block mb-1">Début de l'intervention</label>
                    <input
                      type="datetime-local"
                      required
                      value={agendaForm.starts_at}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, starts_at: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Fin de l'intervention</label>
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
                        const name = c.company_name || `${c.first_name} ${c.last_name}`;
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
      </main>
    </div>
  );
}
