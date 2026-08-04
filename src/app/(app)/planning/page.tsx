'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MoreHorizontal,
  X,
  Edit,
  MapPin,
  Car,
  User,
  AlertTriangle,
  UserPlus,
  CarFront,
  Bell,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import VoiceInputButton from '@/components/ui/VoiceInputButton';
import type { Client, Vehicle } from '@/lib/types';

interface AgendaEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  color?: string;
  clients?: { 
    id?: string;
    company_name?: string | null; 
    first_name?: string | null; 
    last_name?: string | null 
  } | null;
  vehicles?: { 
    id?: string;
    make?: string | null; 
    model?: string | null; 
    plate?: string | null 
  } | null;
  reminders?: {
    id: string;
    reminder_time: string;
    channel: string;
    status: string;
    message?: string | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

type ViewMode = 'day' | 'week' | 'month';

const HOUR_HEIGHT = 60;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const VISIBLE_HOURS = DAY_END_HOUR - DAY_START_HOUR;

// ========== SUB-COMPONENTS ==========

// Client Form Modal Content
function ClientFormModalContent({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
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
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        addToast('Client créé avec succès');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur lors de la création', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[70vh]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Type de Client</label>
          <select
            value={clientForm.type}
            onChange={(e) => setClientForm(prev => ({ ...prev, type: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          >
            <option value="individual">Particulier</option>
            <option value="company">Entreprise / Société</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Civilité</label>
          <select
            value={clientForm.civility}
            onChange={(e) => setClientForm(prev => ({ ...prev, civility: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
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
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Nom de l&apos;entreprise</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={clientForm.company_name}
              onChange={(e) => setClientForm(prev => ({ ...prev, company_name: e.target.value }))}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, company_name: txt }))} title="Dictée nom entreprise" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Prénom</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={clientForm.first_name}
                onChange={(e) => setClientForm(prev => ({ ...prev, first_name: e.target.value }))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
              <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, first_name: txt }))} title="Dictée prénom" />
            </div>
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Nom de famille</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={clientForm.last_name}
                onChange={(e) => setClientForm(prev => ({ ...prev, last_name: e.target.value }))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              />
              <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, last_name: txt }))} title="Dictée nom" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Téléphone</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={clientForm.phone}
              onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, phone: txt }))} title="Dictée téléphone" />
          </div>
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">E-mail</label>
          <input
            type="email"
            value={clientForm.email}
            onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Adresse</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientForm.address_line1}
              onChange={(e) => setClientForm(prev => ({ ...prev, address_line1: e.target.value }))}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, address_line1: txt }))} title="Dictée adresse" />
          </div>
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Ville</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientForm.city}
              onChange={(e) => setClientForm(prev => ({ ...prev, city: e.target.value }))}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
            <VoiceInputButton onTranscript={(txt) => setClientForm(prev => ({ ...prev, city: txt }))} title="Dictée ville" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Mat. Fiscal (M.F.)</label>
          <input
            type="text"
            value={clientForm.tax_id}
            onChange={(e) => setClientForm(prev => ({ ...prev, tax_id: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Délai Paiement (jours)</label>
          <input
            type="number"
            value={clientForm.payment_terms_days}
            onChange={(e) => setClientForm(prev => ({ ...prev, payment_terms_days: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Remise (%)</label>
          <input
            type="number"
            value={clientForm.discount_percent}
            onChange={(e) => setClientForm(prev => ({ ...prev, discount_percent: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
        <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{loading ? 'Création...' : 'Créer le client'}</button>
      </div>
    </form>
  );
}

// Vehicle Form Modal Content
function VehicleFormModalContent({ 
  onClose, 
  onSuccess, 
  clientId,
  clients
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
  clientId?: string;
  clients: { id: string; company_name?: string | null; first_name?: string | null; last_name?: string | null }[];
}) {
  const [vehicleForm, setVehicleForm] = useState({
    client_id: clientId || '',
    plate: '',
    vin: '',
    make: '',
    model: '',
    version: '',
    fuel: 'Essence',
    color: '',
    year: new Date().getFullYear(),
    mileage: 0,
    notes: '',
    last_service_date: '',
    last_service_mileage: 0,
    service_interval_km: 10000,
    service_interval_months: 12,
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.client_id) {
      addToast('Veuillez sélectionner un client', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      });
      if (res.ok) {
        addToast('Véhicule créé avec succès');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur lors de la création', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[70vh]">
      <div>
        <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Client *</label>
        <select
          value={vehicleForm.client_id}
          onChange={(e) => setVehicleForm(prev => ({ ...prev, client_id: e.target.value }))}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
        >
          <option value="">-- Sélectionner un client --</option>
          {clients.map(c => {
            const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
            return <option key={c.id} value={c.id}>{name}</option>;
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Immatriculation</label>
          <input
            type="text"
            value={vehicleForm.plate}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, plate: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            placeholder="ex: 123 TUN 4567"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">VIN</label>
          <input
            type="text"
            value={vehicleForm.vin}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, vin: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            placeholder="17 caractères"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Marque</label>
          <input
            type="text"
            value={vehicleForm.make}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Modèle</label>
          <input
            type="text"
            value={vehicleForm.model}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Version</label>
          <input
            type="text"
            value={vehicleForm.version}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, version: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Énergie</label>
          <select
            value={vehicleForm.fuel}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, fuel: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          >
            <option value="Essence">Essence</option>
            <option value="Diesel">Diesel</option>
            <option value="Hybride">Hybride</option>
            <option value="Électrique">Électrique</option>
            <option value="GPL">GPL</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Couleur</label>
          <input
            type="text"
            value={vehicleForm.color}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Année</label>
          <input
            type="number"
            value={vehicleForm.year}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, year: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            min="1900"
            max={new Date().getFullYear() + 1}
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Kilométrage</label>
          <input
            type="number"
            value={vehicleForm.mileage}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Dernière révision (date)</label>
          <input
            type="date"
            value={vehicleForm.last_service_date}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, last_service_date: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Dernière révision (km)</label>
          <input
            type="number"
            value={vehicleForm.last_service_mileage}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, last_service_mileage: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Intervalle vidange (km)</label>
          <input
            type="number"
            value={vehicleForm.service_interval_km}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, service_interval_km: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            min="1000"
          />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Intervalle vidange (mois)</label>
          <input
            type="number"
            value={vehicleForm.service_interval_months}
            onChange={(e) => setVehicleForm(prev => ({ ...prev, service_interval_months: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            min="1"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Notes</label>
        <textarea
          rows={2}
          value={vehicleForm.notes}
          onChange={(e) => setVehicleForm(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none resize-none"
          placeholder="Notes additionnelles..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
        <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{loading ? 'Création...' : 'Créer le véhicule'}</button>
      </div>
    </form>
  );
}


function ReminderFormModalContent({ 
  reminders, 
  onClose, 
  onSave, 
  eventStart 
}: { 
  reminders: { 
    id?: string; 
    reminder_time: string; 
    channel: 'in_app' | 'sms' | 'whatsapp' | 'email'; 
    status: 'pending' | 'sent' | 'failed' | 'dismissed'; 
    message?: string; 
  }[]; 
  onClose: () => void; 
  onSave: (updatedReminders: typeof reminders) => void; 
  eventStart: string; 
}) {
  const [reminderForm, setReminderForm] = useState<{
    reminder_time: string;
    channel: 'in_app' | 'sms' | 'whatsapp' | 'email';
    message: string;
  }>({
    reminder_time: '',
    channel: 'in_app',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Initialize with event start time minus 30 minutes as default
  useEffect(() => {
    if (eventStart && !reminderForm.reminder_time) {
      const eventDate = new Date(eventStart);
      eventDate.setMinutes(eventDate.getMinutes() - 30);
      setReminderForm(prev => ({ ...prev, reminder_time: eventDate.toISOString().slice(0, 16) }));
    }
  }, [eventStart]);

  const handleAddReminder = () => {
    if (!reminderForm.reminder_time) {
      addToast('Veuillez sélectionner une date/heure', 'error');
      return;
    }
    
    const newReminder = {
      id: crypto.randomUUID(),
      reminder_time: new Date(reminderForm.reminder_time).toISOString(),
      channel: reminderForm.channel,
      status: 'pending' as const,
      message: reminderForm.message || undefined,
    };
    
    const updated = [...reminders, newReminder];
    onSave(updated);
    
    // Reset form
    setReminderForm({
      reminder_time: '',
      channel: 'in_app',
      message: '',
    });
    
    addToast('Rappel ajouté');
  };

  const handleRemoveReminder = (index: number) => {
    const updated = reminders.filter((_, idx) => idx !== index);
    onSave(updated);
    addToast('Rappel supprimé');
  };

  const channelLabels: Record<string, string> = {
    in_app: '🔔 In-app',
    sms: '📱 SMS',
    whatsapp: '💬 WhatsApp',
    email: '📧 Email',
  };

  return (
    <form className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Ajouter un rappel</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Date / Heure *</label>
            <input
              type="datetime-local"
              value={reminderForm.reminder_time}
              onChange={(e) => setReminderForm(prev => ({ ...prev, reminder_time: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Canal</label>
            <select
              value={reminderForm.channel}
              onChange={(e) => setReminderForm(prev => ({ ...prev, channel: e.target.value as any }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            >
              <option value="in_app">🔔 In-app (notification navigateur)</option>
              <option value="sms">📱 SMS</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">📧 Email</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] sm:text-xs text-slate-400 block mb-1">Message (optionnel)</label>
          <input
            type="text"
            value={reminderForm.message}
            onChange={(e) => setReminderForm(prev => ({ ...prev, message: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
            placeholder="Message personnalisé..."
          />
        </div>

        <button
          type="button"
          onClick={handleAddReminder}
          disabled={loading || !reminderForm.reminder_time}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Ajout...' : 'Ajouter ce rappel'}
        </button>
      </div>

      {reminders.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Rappels programmés ({reminders.length})</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {reminders.map((reminder, idx) => (
              <div key={reminder.id || idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[10px] font-medium">
                    {channelLabels[reminder.channel]}
                  </span>
                  <span className="text-slate-300 truncate">
                    {new Date(reminder.reminder_time).toLocaleString('fr-TN', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {reminder.message && (
                    <span className="text-slate-500 truncate">{reminder.message}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveReminder(idx)}
                  className="p-1 text-red-400 hover:text-red-300 rounded"
                  title="Supprimer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Fermer</button>
      </div>
    </form>
  );
}

interface EventBlockProps {
  event: AgendaEvent;
  top: number;
  height: number;
  color: string;
  label: string;
  onClick: () => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, event: AgendaEvent) => void;
  onResizeStart: (e: React.MouseEvent<HTMLElement>, event: AgendaEvent, direction: 'top' | 'bottom') => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

function EventBlock({
  event,
  top,
  height,
  color,
  label,
  onClick,
  onDelete,
  onDragStart,
  onResizeStart,
  isDragging,
  isDragOver,
}: EventBlockProps) {
  return (
    <div
      className="absolute left-1 right-1 cursor-pointer select-none transition-transform duration-150 hover:z-20 hover:shadow-lg"
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 20)}px`,
        backgroundColor: color,
        opacity: isDragging ? 0.5 : isDragOver ? 0.8 : 1,
        transform: isDragging ? 'scale(1.02)' : undefined,
      }}
      onClick={onClick}
      onDoubleClick={onClick}
      onDragStart={e => onDragStart(e, event)}
      onDragOver={e => e.preventDefault()}
      draggable
    >
      <div className="p-1 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-white/90">
          <span className="truncate font-medium">{label}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(event.id); }}
            className="w-4 h-4 opacity-0 hover:opacity-100 hover:bg-white/20 rounded transition"
            title="Supprimer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="text-[10px] text-white/70 truncate">
          {event.clients && (
            <span className="flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {event.clients.company_name || `${event.clients.first_name || ''} ${event.clients.last_name || ''}`.trim()}
            </span>
          )}
        </div>
        {event.vehicles && (
          <div className="text-[10px] text-white/60 flex items-center gap-1 truncate">
            <Car className="w-2.5 h-2.5" />
            {event.vehicles.make} {event.vehicles.model} ({event.vehicles.plate})
          </div>
        )}
        <div className="mt-auto flex items-center gap-1 text-[9px] text-white/50">
          <Clock className="w-2.5 h-2.5" />
          <span>{new Date(event.starts_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.ends_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="absolute bottom-1 right-1 w-2 h-2 cursor-n-resize opacity-0 hover:opacity-50 transition" onMouseDown={e => { e.stopPropagation(); onResizeStart(e, event, 'bottom'); }} title="Redimensionner" />
        <div className="absolute top-1 right-1 w-2 h-2 cursor-n-resize opacity-0 hover:opacity-50 transition" onMouseDown={e => { e.stopPropagation(); onResizeStart(e, event, 'top'); }} title="Redimensionner" />
      </div>
    </div>
  );
}

interface DayViewProps {
  date: Date;
  events: AgendaEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, event: AgendaEvent) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => void;
  draggedEvent: AgendaEvent | null;
  dragOverSlot: { date: Date; hour: number } | null;
  onResizeStart: (e: React.MouseEvent<HTMLElement>, event: AgendaEvent, direction: 'top' | 'bottom') => void;
  getEventTop: (date: Date) => number;
  getEventHeight: (start: Date, end: Date) => number;
  formatTime: (date: Date) => string;
  formatDate: (date: Date) => string;
  getEventColor: (event: AgendaEvent) => string;
  getEventLabel: (event: AgendaEvent) => string;
  onEventClick: (event: AgendaEvent) => void;
  onEventDelete: (id: string) => void;
}

function DayView({
  date,
  events,
  onSlotClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedEvent,
  dragOverSlot,
  onResizeStart,
  getEventTop,
  getEventHeight,
  formatTime,
  formatDate,
  getEventColor,
  getEventLabel,
  onEventClick,
  onEventDelete,
}: DayViewProps) {
  const dayEvents = events.filter(e => {
    const start = new Date(e.starts_at);
    return start.toDateString() === date.toDateString();
  });

  const hours = Array.from({ length: VISIBLE_HOURS }, (_, i) => DAY_START_HOUR + i);

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-slate-200">{formatDate(date)}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-slate-800/50">
              <th className="w-20 p-2 text-right text-xs text-slate-500 font-mono pr-2">Heure</th>
              <th className="p-2">
                <div className="relative h-full min-h-[600px]">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="relative h-[60px] border-b border-slate-800/30 last:border-0"
                      onClick={() => onSlotClick(new Date(date), hour)}
                      onDragOver={(e) => onDragOver(e, new Date(date), hour)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, new Date(date), hour)}
                    >
                      <div className="absolute left-0 top-0 w-20 p-1 text-right text-[10px] text-slate-500 font-mono pr-2">
                        {formatTime(new Date(new Date().setHours(hour, 0)))}
                      </div>
                      {dayEvents.filter(e => {
                        const top = getEventTop(new Date(e.starts_at));
                        const height = getEventHeight(new Date(e.starts_at), new Date(e.ends_at));
                        const hourTop = (hour - DAY_START_HOUR) * HOUR_HEIGHT;
                        return top < hourTop + HOUR_HEIGHT && top + height > hourTop;
                      }).map(event => (
                        <EventBlock
                          key={event.id}
                          event={event}
                          top={getEventTop(new Date(event.starts_at))}
                          height={getEventHeight(new Date(event.starts_at), new Date(event.ends_at))}
                          color={getEventColor(event)}
                          label={getEventLabel(event)}
                          onClick={() => onEventClick(event)}
                          onDelete={onEventDelete}
                          onDragStart={onDragStart}
                          onResizeStart={onResizeStart}
                          isDragging={draggedEvent?.id === event.id}
                          isDragOver={dragOverSlot?.hour === new Date(event.starts_at).getHours()}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
}

interface WeekViewProps {
  weekStart: Date;
  events: AgendaEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, event: AgendaEvent) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => void;
  draggedEvent: AgendaEvent | null;
  dragOverSlot: { date: Date; hour: number } | null;
  onResizeStart: (e: React.MouseEvent<HTMLElement>, event: AgendaEvent, direction: 'top' | 'bottom') => void;
  getEventTop: (date: Date) => number;
  getEventHeight: (start: Date, end: Date) => number;
  formatTime: (date: Date) => string;
  formatDate: (date: Date) => string;
  getEventColor: (event: AgendaEvent) => string;
  getEventLabel: (event: AgendaEvent) => string;
  onEventClick: (event: AgendaEvent) => void;
  onEventDelete: (id: string) => void;
}

function WeekView({
  weekStart,
  events,
  onSlotClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedEvent,
  dragOverSlot,
  onResizeStart,
  getEventTop,
  getEventHeight,
  formatTime,
  formatDate,
  getEventColor,
  getEventLabel,
  onEventClick,
  onEventDelete,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-slate-200">
          Semaine du {formatDate(weekStart)} au {formatDate(new Date(weekStart.getTime() + 6 * 86400000))}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-slate-800/50">
              <th className="w-20 p-2 text-right text-xs text-slate-500 font-mono pr-2">Heure</th>
              {days.map(day => (
                <th key={day.toISOString()} className="p-2 text-center">
                  <div className="text-xs text-slate-500">{day.toLocaleDateString('fr-TN', { weekday: 'short' })}</div>
                  <div className="text-sm font-semibold text-slate-200">{day.getDate()}</div>
                  <div className="text-[10px] text-slate-500">{day.toLocaleDateString('fr-TN', { month: 'short' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: VISIBLE_HOURS }, (_, i) => {
              const hour = DAY_START_HOUR + i;
              return (
                <tr key={hour}>
                  <td className="w-20 p-1 text-right text-xs text-slate-500 font-mono pr-2 sticky left-0 bg-slate-900/80 z-10">
                    {formatTime(new Date(new Date().setHours(hour, 0)))}
                  </td>
                  {days.map(day => (
                    <td key={day.toISOString()} className="relative p-0 border-l border-slate-800/30">
                      <div className="relative h-[60px] border-b border-slate-800/30 last:border-0"
                        onClick={() => onSlotClick(day, hour)}
                        onDragOver={(e) => onDragOver(e, day, hour)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDrop(e, day, hour)}
                      >
                        {events
                          .filter(e => {
                            const start = new Date(e.starts_at);
                            return start.toDateString() === day.toDateString() &&
                              getEventTop(start) < (hour - DAY_START_HOUR + 1) * HOUR_HEIGHT &&
                              getEventTop(start) + getEventHeight(new Date(e.starts_at), new Date(e.ends_at)) > (hour - DAY_START_HOUR) * HOUR_HEIGHT;
                          })
                          .map(event => (
                            <EventBlock
                              key={event.id}
                              event={event}
                              top={getEventTop(new Date(event.starts_at)) - (hour - DAY_START_HOUR) * HOUR_HEIGHT}
                              height={getEventHeight(new Date(event.starts_at), new Date(event.ends_at))}
                              color={event.color || '#3b82f6'}
                              label={event.title}
                              onClick={() => onEventClick(event)}
                              onDelete={onEventDelete}
                              onDragStart={onDragStart}
                              onResizeStart={onResizeStart}
                              isDragging={draggedEvent?.id === event.id}
                              isDragOver={dragOverSlot?.date?.toDateString() === day.toDateString() && dragOverSlot?.hour === hour}
                            />
                          ))}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MonthViewProps {
  monthStart: Date;
  monthEnd: Date;
  events: AgendaEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: AgendaEvent) => void;
  onEventDelete: (id: string) => void;
  getEventColor: (event: AgendaEvent) => string;
  formatDate: (date: Date) => string;
}

function MonthView({
  monthStart,
  monthEnd,
  events,
  onDayClick,
  onEventClick,
  onEventDelete,
  getEventColor,
  formatDate,
}: MonthViewProps) {
  const weeks: Date[][] = [];
  let current = new Date(monthStart);
  current.setDate(current.getDate() - current.getDay());

  while (current <= monthEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      week.push(d);
    }
    weeks.push(week);
    current.setDate(current.getDate() + 7);
  }

  const today = new Date();

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-slate-200">{monthStart.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-slate-800/50">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <th key={day} className="p-2 text-center text-xs text-slate-400 font-medium">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx}>
                {week.map((day, dIdx) => {
                  const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                  const isToday = day.toDateString() === today.toDateString();
                  const dayEvents = events.filter(e => new Date(e.starts_at).toDateString() === day.toDateString());

                  return (
                    <td
                      key={day.toISOString()}
                      className={`relative p-1 border border-slate-800/30 min-h-[100px] ${!isCurrentMonth ? 'bg-slate-900/50' : ''} ${isToday ? 'bg-blue-600/10' : ''}`}
                      onClick={() => onDayClick(day)}
                    >
                      <div className={`text-[10px] font-mono ${isToday ? 'text-blue-400 font-bold' : isCurrentMonth ? 'text-slate-300' : 'text-slate-500'}`}>
                        {day.getDate()}
                      </div>
                      <div className="mt-1 space-y-0.5 max-h-[80px] overflow-y-auto">
                        {dayEvents.slice(0, 4).map(event => (
                          <div
                            key={event.id}
                            className="px-1.5 py-0.5 text-[10px] rounded truncate cursor-pointer hover:bg-opacity-80 transition"
                            style={{ backgroundColor: event.color || '#3b82f6' }}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="px-1.5 py-0.5 text-[10px] text-slate-500 text-center">
                            +{dayEvents.length - 4} autre{dayEvents.length - 4 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== MAIN COMPONENT ==========

export default function PlanningPage() {
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<AgendaEvent | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ event: AgendaEvent; direction: 'top' | 'bottom'; startY: number; startHeight: number } | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const { addToast } = useToast();

  // Load data
  const loadData = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const [agdRes, cliRes, vehRes] = await Promise.all([
        fetch('/api/agenda'),
        fetch('/api/clients'),
        fetch('/api/vehicles'),
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  const goToPrev = () => {
    setCurrentDate(d => {
      const d2 = new Date(d);
      if (viewMode === 'day') d2.setDate(d2.getDate() - 1);
      else if (viewMode === 'week') d2.setDate(d2.getDate() - 7);
      else d2.setMonth(d2.getMonth() - 1);
      return d2;
    });
  };
  const goToNext = () => {
    setCurrentDate(d => {
      const d2 = new Date(d);
      if (viewMode === 'day') d2.setDate(d2.getDate() + 1);
      else if (viewMode === 'week') d2.setDate(d2.getDate() + 7);
      else d2.setMonth(d2.getMonth() + 1);
      return d2;
    });
  };

  // View helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekEnd = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + (6 - d.getDay()));
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const getMonthStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getMonthEnd = (date: Date) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const getVisibleEvents = useMemo(() => {
    const now = currentDate;
    let start: Date, end: Date;

    if (viewMode === 'day') {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      start = getWeekStart(now);
      end = getWeekEnd(now);
    } else {
      start = getMonthStart(now);
      end = getMonthEnd(now);
    }

    return agenda.filter(event => {
      const eventStart = new Date(event.starts_at);
      const eventEnd = new Date(event.ends_at);
      return eventStart <= end && eventEnd >= start;
    });
  }, [agenda, currentDate, viewMode]);

  // Format helpers
  const formatTime = (date: Date) => date.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Event position helpers
  const getEventTop = (date: Date) => {
    const hours = date.getHours() + date.getMinutes() / 60;
    return Math.max(0, (hours - DAY_START_HOUR) * HOUR_HEIGHT);
  };

  const getEventHeight = (start: Date, end: Date) => {
    const startHours = start.getHours() + start.getMinutes() / 60;
    const endHours = end.getHours() + end.getMinutes() / 60;
    return Math.max(HOUR_HEIGHT * 0.5, (endHours - startHours) * HOUR_HEIGHT);
  };

  // Modal handlers
  const openCreateModal = (prefill?: Partial<AgendaEvent>) => {
    setEditingEvent(null);
    const start = prefill?.starts_at ? new Date(prefill.starts_at) : new Date(currentDate);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setAgendaForm({
      title: '',
      starts_at: start.toISOString().slice(0, 16),
      ends_at: end.toISOString().slice(0, 16),
      client_id: '',
      vehicle_id: '',
      status: 'planned',
      color: '#3b82f6',
      description: prefill?.description || '',
      reminders: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: AgendaEvent) => {
    setEditingEvent(event);
    setAgendaForm({
      title: event.title,
      starts_at: new Date(event.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(event.ends_at).toISOString().slice(0, 16),
      client_id: event.clients?.id || '',
      vehicle_id: event.vehicles?.id || '',
      status: event.status,
      color: event.color || '#3b82f6',
      description: event.description || '',
      reminders: (event.reminders || []).map(r => ({
        id: r.id,
        reminder_time: r.reminder_time,
        channel: r.channel as 'in_app' | 'sms' | 'whatsapp' | 'email',
        status: r.status as 'pending' | 'sent' | 'failed' | 'dismissed',
        message: r.message || undefined,
      })),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    resetForm();
  };

  // Form state
  const [agendaForm, setAgendaForm] = useState<{
    title: string;
    starts_at: string;
    ends_at: string;
    client_id: string;
    vehicle_id: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    color: string;
    description: string;
    reminders: {
      id?: string;
      reminder_time: string;
      channel: 'in_app' | 'sms' | 'whatsapp' | 'email';
      status: 'pending' | 'sent' | 'failed' | 'dismissed';
      message?: string;
    }[];
  }>({
    title: '',
    starts_at: '',
    ends_at: '',
    client_id: '',
    vehicle_id: '',
    status: 'planned',
    color: '#3b82f6',
    description: '',
    reminders: [],
  });

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminderIndex, setEditingReminderIndex] = useState<number | null>(null);

  const resetForm = () => {
    setAgendaForm({
      title: '',
      starts_at: '',
      ends_at: '',
      client_id: '',
      vehicle_id: '',
      status: 'planned',
      color: '#3b82f6',
      description: '',
      reminders: [],
    });
  };

  const handleRemoveReminder = (index: number) => {
    setAgendaForm(prev => ({
      ...prev,
      reminders: prev.reminders.filter((_, idx) => idx !== index),
    }));
  };

  // CRUD operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...agendaForm,
        starts_at: new Date(agendaForm.starts_at).toISOString(),
        ends_at: new Date(agendaForm.ends_at).toISOString(),
      };
      const isEdit = !!editingEvent;
      const url = isEdit ? `/api/agenda/${editingEvent.id}` : '/api/agenda';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        addToast(isEdit ? 'Rendez-vous modifié' : 'Rendez-vous créé');
        closeModal();
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    try {
      const res = await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Rendez-vous supprimé');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent<HTMLElement>, event: AgendaEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ date, hour });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>, date: Date, hour: number) => {
    e.preventDefault();
    if (!draggedEvent) return;
    setDragOverSlot(null);

    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);
    const duration = new Date(draggedEvent.ends_at).getTime() - new Date(draggedEvent.starts_at).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      const res = await fetch(`/api/agenda/${draggedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
        }),
      });
      if (res.ok) {
        addToast('Rendez-vous déplacé');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
    setDraggedEvent(null);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent<HTMLElement>, event: AgendaEvent, direction: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setResizingEvent({ event, direction, startY: e.clientY, startHeight: getEventHeight(new Date(event.starts_at), new Date(event.ends_at)) });
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingEvent) return;
    const delta = (resizingEvent.startY - e.clientY) / HOUR_HEIGHT;
    const event = resizingEvent.event;
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    if (resizingEvent.direction === 'top') {
      const newStart = new Date(start);
      newStart.setHours(start.getHours() + delta, start.getMinutes(), 0, 0);
      if (newStart < end) {
        // Update preview
      }
    } else {
      const newEnd = new Date(end);
      newEnd.setHours(end.getHours() + delta, end.getMinutes(), 0, 0);
    }
  };

  const handleResizeEnd = async () => {
    if (!resizingEvent) return;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    setResizingEvent(null);
  };

  // Click to create
  const handleSlotClick = (date: Date, hour: number) => {
    if (draggedEvent) return;
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    openCreateModal({ starts_at: start.toISOString() });
  };

  return (
    <>
      <header className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Planning
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {mode === 'day' && 'Jour'}
                {mode === 'week' && 'Semaine'}
                {mode === 'month' && 'Mois'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToPrev} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-300 transition" title="Précédent">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-300 transition">
              <Calendar className="w-4 h-4 mr-1" />
              Aujourd'hui
            </button>
            <button onClick={goToNext} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-300 transition" title="Suivant">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button onClick={loadData} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-slate-400 transition" title="Actualiser">
            <RefreshCw className="w-5 h-5" />
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

      <div className="p-4 sm:p-6 space-y-6 no-print">
        {/* Day View */}
        {viewMode === 'day' && (
          <DayView
            date={currentDate}
            events={getVisibleEvents}
            onSlotClick={handleSlotClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggedEvent={draggedEvent}
            dragOverSlot={dragOverSlot}
            onResizeStart={handleResizeStart}
            getEventTop={getEventTop}
            getEventHeight={getEventHeight}
            formatTime={formatTime}
            formatDate={formatDate}
            getEventColor={(event) => event.color || STATUS_COLORS[event.status] || '#3b82f6'}
            getEventLabel={(event) => `${event.title} ${event.clients ? `- ${event.clients.company_name || `${event.clients.first_name || ''} ${event.clients.last_name || ''}`.trim()}` : ''}`}
            onEventClick={openEditModal}
            onEventDelete={handleDelete}
          />
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <WeekView
            weekStart={getWeekStart(currentDate)}
            events={getVisibleEvents}
            onSlotClick={handleSlotClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggedEvent={draggedEvent}
            dragOverSlot={dragOverSlot}
            onResizeStart={handleResizeStart}
            getEventTop={getEventTop}
            getEventHeight={getEventHeight}
            formatTime={formatTime}
            formatDate={formatDate}
            getEventColor={(event) => event.color || STATUS_COLORS[event.status] || '#3b82f6'}
            getEventLabel={(event) => event.title}
            onEventClick={openEditModal}
            onEventDelete={handleDelete}
          />
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <MonthView
            monthStart={getMonthStart(currentDate)}
            monthEnd={getMonthEnd(currentDate)}
            events={getVisibleEvents}
            onDayClick={(date) => openCreateModal({ starts_at: new Date(date).toISOString() })}
            onEventClick={openEditModal}
            onEventDelete={handleDelete}
            getEventColor={(event) => event.color || STATUS_COLORS[event.status] || '#3b82f6'}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">{editingEvent ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Titre *</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="ex: Vidange Golf 8"
                    value={agendaForm.title}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setAgendaForm(prev => ({ ...prev, title: prev.title + ' ' + text }))}
                    title="Dictée titre"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Début *</label>
                  <input
                    type="datetime-local"
                    required
                    value={agendaForm.starts_at}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, starts_at: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={agendaForm.ends_at}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, ends_at: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-xs text-slate-400 block mb-1">Client</label>
                  <select
                    value={agendaForm.client_id}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 pr-10"
                  >
                    <option value="">-- Aucun --</option>
                    {clients.map(c => {
                      const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
                      return <option key={c.id} value={c.id}>{name}</option>;
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowClientModal(true); setShowVehicleModal(false); }}
                    className="absolute right-2 top-[34px] p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    title="Nouveau client"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <label className="text-xs text-slate-400 block mb-1">Véhicule</label>
                  <select
                    value={agendaForm.vehicle_id}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 pr-10"
                  >
                    <option value="">-- Aucun --</option>
                    {vehicles
                      .filter(v => !agendaForm.client_id || v.client_id === agendaForm.client_id)
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowVehicleModal(true); setShowClientModal(false); }}
                    className="absolute right-2 top-[34px] p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    title="Nouveau véhicule"
                  >
                    <CarFront className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Statut</label>
                <select
                  value={agendaForm.status}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, status: e.target.value as 'planned' | 'in_progress' | 'completed' | 'cancelled' }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="planned">Planifié</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Couleur</label>
                <input
                  type="color"
                  value={agendaForm.color}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                />
              </div>

              {/* Reminders Section */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 flex items-center gap-2">
                  Rappels / Notifications
                  <button
                    type="button"
                    onClick={() => setShowReminderModal(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Gérer les rappels
                  </button>
                </label>
                {agendaForm.reminders && agendaForm.reminders.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
                    {agendaForm.reminders.map((reminder, idx) => (
                      <div key={reminder.id || idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[10px] font-medium">
                            {reminder.channel === 'in_app' ? '🔔 In-app' : reminder.channel === 'sms' ? '📱 SMS' : reminder.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                          </span>
                          <span className="text-slate-300">
                            {new Date(reminder.reminder_time).toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {reminder.message && (
                            <span className="text-slate-500 truncate max-w-[200px]">{reminder.message}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReminder(idx)}
                          className="p-1 text-red-400 hover:text-red-300 rounded"
                          title="Supprimer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description / Notes</label>
                <div className="flex gap-1.5">
                  <textarea
                    rows={3}
                    value={agendaForm.description}
                    onChange={(e) => setAgendaForm(prev => ({ ...prev, description: e.target.value }))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Symptômes, notes..."
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setAgendaForm(prev => ({ ...prev, description: prev.description + ' ' + text }))}
                    title="Dictée description"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">{editingEvent ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-500" />
                Nouveau client
              </h3>
              <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <ClientFormModalContent 
              onClose={() => setShowClientModal(false)} 
              onSuccess={() => { loadData(); setShowClientModal(false); }} 
            />
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <CarFront className="w-5 h-5 text-blue-500" />
                Nouveau véhicule
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <VehicleFormModalContent 
              onClose={() => setShowVehicleModal(false)} 
              onSuccess={() => { loadData(); setShowVehicleModal(false); }} 
              clientId={agendaForm.client_id || undefined}
              clients={clients}
            />
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Gérer les rappels
              </h3>
              <button onClick={() => setShowReminderModal(false)} className="text-slate-400 hover:text-slate-200">&times;</button>
            </div>
            <ReminderFormModalContent
              reminders={agendaForm.reminders}
              onClose={() => setShowReminderModal(false)}
              onSave={(updatedReminders) => setAgendaForm(prev => ({ ...prev, reminders: updatedReminders }))}
              eventStart={agendaForm.starts_at}
            />
          </div>
        </div>
      )}
    </>
  );
}