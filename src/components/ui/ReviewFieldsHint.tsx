/**
 * ReviewFieldsHint.tsx
 * Composant d'UI — bannière brouillon avec liste explicite des champs à vérifier.
 *
 * Quand confidence < 0.7 ou un check échoue, cette bannière liste les champs
 * à relire (MF client, Total HT, TVA, Timbre, Total TTC) — pas un générique
 * « à vérifier » qui laisse l'utilisateur cliquer sans relire.
 *
 * @the-customer-success-support-bot : la bannière doit pointer les champs,
 * pas dire « à vérifier ».
 */

import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { ExtractWarning } from '@/lib/invoice-extract';

interface ReviewFieldsHintProps {
  /** true → brouillon forcé, revue humaine obligatoire */
  isDraft: boolean;
  /** Champs à relire (ex: ['MF client', 'Total HT', 'TVA']) */
  reviewFields: string[];
  /** Warnings détaillées par le check */
  warnings: ExtractWarning[];
  /** Message d'attente wake-up PythonAnywhere (optionnel) */
  wakeUpMessage?: string | null;
  /** Message d'erreur service down (optionnel) */
  serviceDownMessage?: string | null;
  /** true → message de refus de fichier */
  fileRejected?: boolean;
  /** Taille du fichier refusé (en Mo) */
  fileSizeMB?: number;
}

export function ReviewFieldsHint({
  isDraft,
  reviewFields,
  warnings,
  wakeUpMessage,
  serviceDownMessage,
  fileRejected,
  fileSizeMB,
}: ReviewFieldsHintProps) {
  // ── Wake-up PythonAnywhere ──────────────────────────────────────────────────
  if (wakeUpMessage) {
    return (
      <div className="flex items-start gap-2 bg-blue-900/30 border border-blue-500/40 rounded-xl p-3 text-xs text-blue-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Service OCR — premier appel du jour</p>
          <p>{wakeUpMessage}</p>
          <p className="text-blue-400/70 mt-1">Le scan suivant sera instantané.</p>
        </div>
      </div>
    );
  }

  // ── Service down / timeout ──────────────────────────────────────────────────
  if (serviceDownMessage) {
    return (
      <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-xs text-red-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Service OCR indisponible</p>
          <p>{serviceDownMessage}</p>
        </div>
      </div>
    );
  }

  // ── Fichier refusé ──────────────────────────────────────────────────────────
  if (fileRejected) {
    return (
      <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Fichier refusé</p>
          <p>
            {fileSizeMB !== undefined
              ? `Le fichier dépasse la limite de 5 Mo (${fileSizeMB} Mo).`
              : 'Format non supporté. Formats acceptés : PDF, JPG, PNG, WebP.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Brouillon : liste explicite des champs à vérifier ────────────────────────
  if (isDraft && reviewFields.length > 0) {
    return (
      <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold mb-1.5">
            ⚠️ Brouillon — revue humaine obligatoire avant écriture comptable
          </p>
          <p className="text-amber-400/80 mb-2">
            Aucune ligne journal / 411 / 471 n{'\''}est créée sans votre validation explicite.
            Veuillez relire les champs suivants :
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {reviewFields.map((field) => (
              <li
                key={field}
                className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-200 font-medium"
              >
                {field}
              </li>
            ))}
          </ul>
          {/* Détail des warnings par code */ }
          {warnings.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-amber-500/20 pt-2">
              {warnings.map((w) => (
                <p key={w.code} className="text-[11px] text-amber-400/80">
                  <span className="font-mono text-amber-300/70">{w.code}</span> — {w.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Clean (pas de brouillon) ────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-2 bg-emerald-900/30 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300">
      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="font-medium">Facture extraite — contrôles arithmétiques passés</p>
    </div>
  );
}

export default ReviewFieldsHint;