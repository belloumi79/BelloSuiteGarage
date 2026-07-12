'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Layers,
  Tag,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Item } from '@/lib/types';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

const UNITS = ['pcs', 'hour', 'liter', 'kg', 'meter', 'box', 'set', 'pair'];

const UNIT_LABELS: Record<string, string> = {
  pcs: 'pièce(s)',
  hour: 'heure(s)',
  liter: 'litre(s)',
  kg: 'kg',
  meter: 'mètre(s)',
  box: 'boîte(s)',
  set: 'kit',
  pair: 'paire',
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [itemFilter, setItemFilter] = useState('all');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const { addToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  const [itemForm, setItemForm] = useState({
    type: 'part',
    category_id: '',
    supplier_id: '',
    reference: '',
    barcode: '',
    name: '',
    description: '',
    unit: 'pcs',
    purchase_price: 0,
    selling_price: 0,
    vat_rate: 19,
    stock_qty: 0,
    stock_min: 0,
    stock_location: ''
  });

  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const [itemsRes, catsRes, suppRes] = await Promise.all([
        fetch(`/api/items?page=${page}&pageSize=${pageSize}`),
        fetch('/api/item-categories'),
        fetch('/api/suppliers?pageSize=200'),
      ]);
      const itemsData = itemsRes.ok ? await itemsRes.json() : { data: [], total: 0 };
      const catsData = catsRes.ok ? await catsRes.json() : { data: [] };
      const suppData = suppRes.ok ? await suppRes.json() : { data: [] };
      setItems(itemsData.data ?? []);
      setTotal(itemsData.total ?? 0);
      setCategories(catsData.data ?? []);
      setSuppliers(suppData.data ?? []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetItemForm = () => {
    setItemForm({
      type: 'part',
      category_id: '',
      supplier_id: '',
      reference: '',
      barcode: '',
      name: '',
      description: '',
      unit: 'pcs',
      purchase_price: 0,
      selling_price: 0,
      vat_rate: 19,
      stock_qty: 0,
      stock_min: 0,
      stock_location: ''
    });
    setEditingItem(null);
  };

  const handleDeleteItem = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/items/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Article supprimé');
        loadData();
      }
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingItem;
      const payload = {
        ...itemForm,
        category_id: itemForm.category_id || undefined,
        supplier_id: itemForm.supplier_id || undefined,
        unit: itemForm.unit,
      };
      const url = isEdit ? `/api/items/${editingItem!.id}` : '/api/items';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsItemModalOpen(false);
        resetItemForm();
        loadData();
        addToast(isEdit ? 'Article modifié' : 'Article créé');
      } else {
        const err = await res.json();
        addToast(err?.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/item-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
        setItemForm(prev => ({ ...prev, category_id: cat.id }));
        setNewCategoryName('');
        setAddingCategory(false);
        addToast('Catégorie créée');
      }
    } catch {
      addToast('Erreur', 'error');
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      if (res.ok) {
        const supp = await res.json();
        setSuppliers(prev => [...prev, supp].sort((a, b) => a.name.localeCompare(b.name)));
        setItemForm(prev => ({ ...prev, supplier_id: supp.id }));
        setNewSupplierName('');
        setAddingSupplier(false);
        addToast('Fournisseur créé');
      }
    } catch {
      addToast('Erreur', 'error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Articles & Stock
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetItemForm(); setIsItemModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs text-white font-semibold flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Nouvel article
          </button>
        </div>
      </header>

      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-medium">Chargement des articles...</p>
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
                <option value="labor">Main d&apos;œuvre</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium bg-slate-900/50">
                  <th className="p-4">Désignation</th>
                  <th className="p-4">Référence</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">P. Achat HT</th>
                  <th className="p-4">P. Vente HT</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(i => {
                    const q = debouncedSearch.toLowerCase();
                    const matchesSearch = !q ||
                      i.name.toLowerCase().includes(q) ||
                      (i.reference && i.reference.toLowerCase().includes(q)) ||
                      (i.barcode && i.barcode.includes(q));
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
                        <td className="p-4 text-slate-500 text-xs">{item.category_id ? categories.find(c => c.id === item.category_id)?.name || '-' : '-'}</td>
                        <td className="p-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.type === 'part' ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'}`}>
                            {item.type === 'part' ? 'Pièce' : 'M.O'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono">{Number(item.purchase_price).toFixed(3)} DT</td>
                        <td className="p-4 text-slate-200 font-semibold font-mono">{Number(item.selling_price).toFixed(3)} DT</td>
                        <td className="p-4 font-semibold font-mono">
                          {item.type === 'part' ? (
                            <span className={isLow ? 'text-rose-400' : 'text-slate-200'}>
                              {Number(item.stock_qty).toFixed(0)} <span className="text-[10px] text-slate-500">{item.unit || 'pcs'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setItemForm({
                                type: item.type,
                                category_id: item.category_id || '',
                                supplier_id: item.supplier_id || '',
                                reference: item.reference || '',
                                barcode: item.barcode || '',
                                name: item.name,
                                description: item.description || '',
                                unit: item.unit || 'pcs',
                                purchase_price: Number(item.purchase_price),
                                selling_price: Number(item.selling_price),
                                vat_rate: Number(item.vat_rate),
                                stock_qty: Number(item.stock_qty),
                                stock_min: Number(item.stock_min),
                                stock_location: item.stock_location || ''
                              });
                              setIsItemModalOpen(true);
                            }}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: item.id, name: item.name })}
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">&larr; Précédent</button>
              <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition">Suivant &rarr;</button>
            </div>
          )}
        </div>
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">
                {editingItem ? 'Modifier l\'article' : (
                  itemForm.type === 'part' ? 'Ajouter une pièce' : 'Ajouter une prestation de main-d\'œuvre'
                )}
              </h3>
              <button onClick={() => { setIsItemModalOpen(false); resetItemForm(); }} className="text-slate-400 hover:text-slate-200 text-xl">&times;</button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

              <div className="grid grid-cols-4 gap-3">
                {['part', 'labor'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemForm(prev => ({ ...prev, type: t, unit: t === 'labor' ? 'hour' : 'pcs' }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition ${
                      itemForm.type === t
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {t === 'part' ? '🔧 Pièce' : '👨‍🔧 Main d\'œuvre'}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800/60 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Identification</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nom / libellé *</label>
                    <input
                      type="text"
                      required
                      placeholder={itemForm.type === 'part' ? 'e.g. Plaquettes avant Brembo' : "e.g. Diagnostic moteur complet"}
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Code-barres</label>
                      <input
                        type="text"
                        placeholder="e.g. 3276001234567"
                        value={itemForm.barcode}
                        onChange={(e) => setItemForm(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Description optionnelle..."
                      value={itemForm.description}
                      onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classification</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Catégorie
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={itemForm.category_id}
                        onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      >
                        <option value="">Sans catégorie</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {addingCategory ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nom"
                            className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                          />
                          <button type="button" onClick={handleAddCategory} className="px-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white">OK</button>
                          <button type="button" onClick={() => setAddingCategory(false)} className="px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300">X</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddingCategory(true)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 whitespace-nowrap" title="Ajouter une catégorie">+</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Unité
                    </label>
                    <select
                      value={itemForm.unit}
                      onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u} ({UNIT_LABELS[u]})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Fournisseur
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={itemForm.supplier_id}
                      onChange={(e) => setItemForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    >
                      <option value="">Sans fournisseur</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {addingSupplier ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          placeholder="Nom"
                          className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSupplier())}
                        />
                        <button type="button" onClick={handleAddSupplier} className="px-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white">OK</button>
                        <button type="button" onClick={() => setAddingSupplier(false)} className="px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300">X</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAddingSupplier(true)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 whitespace-nowrap" title="Ajouter un fournisseur">+</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tarification</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prix Achat HT (DT)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={itemForm.purchase_price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, purchase_price: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prix Vente HT (DT) *</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
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
                      step="0.1"
                      min="0"
                      max="100"
                      value={itemForm.vat_rate}
                      onChange={(e) => setItemForm(prev => ({ ...prev, vat_rate: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {itemForm.type === 'part' && (
                <div className="border-t border-slate-800/60 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gestion de Stock</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Stock Initial</label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.stock_qty}
                        onChange={(e) => setItemForm(prev => ({ ...prev, stock_qty: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Stock Minimum</label>
                      <input
                        type="number"
                        min="0"
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
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setIsItemModalOpen(false); resetItemForm(); }} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingItem ? 'Enregistrer' : "Créer l'article"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer l'article"
        message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete?.name} ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteItem}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
