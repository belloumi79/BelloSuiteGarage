'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
} from 'lucide-react';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemFilter, setItemFilter] = useState('all');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data.data ?? data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetItemForm = () => {
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
    setEditingItem(null);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/api/items/${editingItem.id}` : '/api/items';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm)
      });
      if (res.ok) {
        setIsItemModalOpen(false);
        resetItemForm();
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
            Articles & Stock
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
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.type === 'part' ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'}`}>
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
                            onClick={() => {
                              setEditingItem(item);
                              setItemForm({
                                type: item.type,
                                reference: item.reference || '',
                                barcode: item.barcode || '',
                                name: item.name,
                                description: item.description || '',
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
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">{editingItem ? "Modifier l'article" : 'Ajouter un article / prestation'}</h3>
              <button onClick={() => { setIsItemModalOpen(false); resetItemForm(); }} className="text-slate-400 hover:text-slate-200">&times;</button>
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
                <button type="button" onClick={() => { setIsItemModalOpen(false); resetItemForm(); }} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingItem ? 'Enregistrer' : "Créer l'article"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
