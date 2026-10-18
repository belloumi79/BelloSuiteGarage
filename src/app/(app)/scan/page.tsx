'use client';

import { useState, useRef, useCallback, type DragEvent } from 'react';
import Link from 'next/link';
import {
  ScanLine,
  Upload,
  FileText,
  Loader2,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import ReviewFieldsHint from '@/components/ui/ReviewFieldsHint';
import {
  extractInvoice,
  type RawInvoiceData,
  type InvoiceExtractResult,
} from '@/lib/invoice-extract';
import { SCAN_ONBOARDING_J0 } from '@/lib/scan-onboarding';
import { SCAN_ONBOARDING_ENABLED } from '@/lib/feature-flags';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'uploading' | 'review';

interface UploadError {
  wakeUpMessage?: string | null;
  serviceDownMessage?: string | null;
  fileRejected?: boolean;
  fileSizeMB?: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo — contrôle local avant upload
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function formatDT(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-TN');
  } catch {
    return d;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { addToast } = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [result, setResult] = useState<InvoiceExtractResult | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Validation locale du fichier (taille + format) ──────────────────────────
  const validateLocal = useCallback(
    (f: File): string | null => {
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
      const mimeOk = ACCEPTED_MIME.includes(f.type);
      if (!mimeOk && !ACCEPTED_EXTENSIONS.includes(ext)) {
        return 'Format non supporté. Formats acceptés : PDF, JPG, PNG, WebP.';
      }
      if (f.size > MAX_FILE_SIZE) {
        const mb = Math.round((f.size / (1024 * 1024)) * 100) / 100;
        return `Trop volumineux : ${mb} Mo (max 5 Mo).`;
      }
      return null;
    },
    []
  );

  // ── Appel de l'API de scan ──────────────────────────────────────────────────
  const scan = useCallback(
    async (f: File) => {
      setPhase('uploading');
      setUploadError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', f);
      // Langue des hints OCR selon la langue du navigateur
      const lang = (typeof navigator !== 'undefined' && navigator.language) || 'fr';
      formData.append('hint_lang', lang.toLowerCase().startsWith('ar') ? 'ar' : 'fr');

      try {
        const res = await fetch('/api/scan/extract', { method: 'POST', body: formData });

        // 503 : service OCR endormi (wake-up PythonAnywhere)
        if (res.status === 503) {
          const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          setUploadError({
            wakeUpMessage:
              (body.message as string | undefined) ||
              'Le service OCR s\u2019est endormi la nuit. Premier appel du jour \u2014 r\u00e9essayez dans quelques secondes, le service sera r\u00e9veill\u00e9.',
          });
          setPhase('idle');
          return;
        }

        // 413 : fichier trop volumineux
        if (res.status === 413) {
          const body = await res.json().catch(() => ({}));
          setUploadError({
            fileRejected: true,
            fileSizeMB:
              typeof (body as Record<string, unknown>).fileSizeMB === 'number'
                ? ((body as Record<string, unknown>).fileSizeMB as number)
                : undefined,
          });
          setPhase('idle');
          return;
        }

        // Autre erreur
        if (!res.ok) {
          setUploadError({
            serviceDownMessage: `Erreur du service OCR (code ${res.status}). Le scan peut \u00eatre indisponible \u2014 r\u00e9essayez dans quelques instants.`,
          });
          setPhase('idle');
          return;
        }

        // 200 : le proxy renvoie le JSON PythonAnywhere brut (sans raw_text).
        // La validation DGI (checks/warnings/isDraft/minConf/reviewFields)
        // est appliquée ici côté client via extractInvoice (module pur).
        const raw = (await res.json()) as unknown as RawInvoiceData;
        const extracted = extractInvoice(raw);
        setResult(extracted);
        setPhase('review');
      } catch {
        setUploadError({
          serviceDownMessage:
            'Connexion au service OCR impossible. V\u00e9rifiez votre connexion \u2014 le service peut \u00eatre indisponible temporairement.',
        });
        setPhase('idle');
      }
    },
    []
  );

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      const err = validateLocal(f);
      if (err) {
        setUploadError({
          fileRejected: true,
          fileSizeMB: f.size > MAX_FILE_SIZE
            ? Math.round((f.size / (1024 * 1024)) * 100) / 100
            : undefined,
        });
        addToast(err, 'error');
        setPhase('idle');
        return;
      }
      setFile(f);
      void scan(f);
    },
    [scan, validateLocal, addToast]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0] || null;
      handleFile(f);
    },
    [handleFile]
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setFile(null);
    setResult(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const showOnboarding = SCAN_ONBOARDING_ENABLED && phase === 'idle' && !onboardingDismissed;
  const d = result?.data ?? null;

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* ─── En-tête ─── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/10 border border-blue-500/20 p-2.5 rounded-xl">
            <ScanLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-200">Scan Facture</h1>
            <p className="text-xs text-slate-400">
              OCR \u2014 extraction automatique, validation DGI, brouillon avant écriture
            </p>
          </div>
        </div>
      </div>

      {/* ─── Onboarding J0 (feature flag) ─── */}
      {showOnboarding && (
        <div className="relative bg-gradient-to-br from-blue-900/20 to-slate-900 border border-blue-500/20 rounded-2xl p-5">
          <button
            onClick={() => setOnboardingDismissed(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Masquer cette section"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="inline-block px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-[11px] font-semibold text-blue-300 mb-3">
            {SCAN_ONBOARDING_J0.badge}
          </span>
          <h2 className="text-lg font-bold text-slate-100 mb-2">{SCAN_ONBOARDING_J0.headline}</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">{SCAN_ONBOARDING_J0.body}</p>
          <ul className="grid sm:grid-cols-2 gap-2 mb-4">
            {SCAN_ONBOARDING_J0.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <Link
            href={SCAN_ONBOARDING_J0.cta.href}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-500/20"
          >
            {SCAN_ONBOARDING_J0.cta.label}
            <ChevronRight className="w-4 h-4" />
          </Link>
          <p className="text-[11px] text-slate-500 mt-4">{SCAN_ONBOARDING_J0.finePrint}</p>
        </div>
      )}

      {/* ─── Phase idle : dropzone ─── */}
      {phase === 'idle' && (
        <>
          {uploadError && (
            <ReviewFieldsHint
              isDraft={false}
              reviewFields={[]}
              warnings={[]}
              wakeUpMessage={uploadError.wakeUpMessage ?? undefined}
              serviceDownMessage={uploadError.serviceDownMessage ?? undefined}
              fileRejected={uploadError.fileRejected}
              fileSizeMB={uploadError.fileSizeMB}
            />
          )}
          <div
            role="button"
            tabIndex={0}
            aria-label="Déposer une facture (PDF, JPG, PNG, WebP — 5 Mo max)"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-10 md:p-16 cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900'
            }`}
          >
            <div className="bg-slate-800 p-4 rounded-2xl">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-200">
                Glissez votre facture ici, ou cliquez pour choisir
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PDF, JPG, PNG, WebP \u2014 5 Mo maximum
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>
        </>
      )}

      {/* ─── Phase uploading ─── */}
      {phase === 'uploading' && (
        <div className="flex flex-col items-center justify-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">
              Lecture de la facture en cours\u2026
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {file ? file.name : ''} \u2014 OCR, extraction et contrôles arithmétiques DGI.
              Premier appel du jour : le service peut prendre jusqu\u2019à 45 s.
            </p>
          </div>
        </div>
      )}

      {/* ─── Phase review ─── */}
      {phase === 'review' && result && d && (
        <div className="space-y-4">
          {/* Bannière d\u2019état (brouillon / contrôles passés) */}
          <ReviewFieldsHint
            isDraft={result.isDraft}
            reviewFields={result.reviewFields}
            warnings={result.warnings}
          />

          {/* Badge confiance */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                result.minConf >= 0.7
                  ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-900/30 border-amber-500/40 text-amber-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Confiance : {Math.round(result.minConf * 100)} %
            </span>
            {file && (
              <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {file.name}
              </span>
            )}
          </div>

          {/* Grille des champs extraits */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Champs extraits</h3>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Field label="Fournisseur" value={d.vendor_name} />
              <Field label="N° de facture" value={d.invoice_number} mono />
              <Field label="Date" value={formatDate(d.date)} />
              <Field label="Échéance" value={formatDate(d.due_date)} />
              <Field label="Client" value={d.client_name} />
              <Field label="MF client" value={d.client_mf} mono />
              <Field label="Montant HT" value={`${formatDT(d.subtotal_ht)} DT`} mono />
              <Field label="FODEC" value={d.fodec !== null ? `${formatDT(d.fodec)} DT` : '—'} mono />
              <Field label="TVA totale" value={`${formatDT(d.vat_total)} DT`} mono />
              <Field label="Timbre fiscal" value={d.stamp_tax !== null ? `${formatDT(d.stamp_tax)} DT` : '—'} mono />
              <Field
                label="Total TTC"
                value={`${formatDT(d.total_ttc)} DT`}
                mono
                highlight
              />
            </dl>

            {/* Détail vat_breakdown */}
            {d.vat_breakdown && d.vat_breakdown.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Détail de la TVA
                </h4>
                <ul className="space-y-1.5">
                  {d.vat_breakdown.map((v, i) => (
                    <li
                      key={`${v.rate}-${i}`}
                      className="flex items-center justify-between text-xs bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2"
                    >
                      <span className="text-slate-300">TVA {v.rate} %</span>
                      <span className="text-slate-200 font-mono">{formatDT(v.amount)} DT</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tableau des lignes */}
            {d.lines && d.lines.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Lignes ({d.lines.length})
                </h4>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-800">
                        <th className="py-2 px-1 font-medium">Désignation</th>
                        <th className="py-2 px-1 font-medium text-right">Qté</th>
                        <th className="py-2 px-1 font-medium text-right">PU HT</th>
                        <th className="py-2 px-1 font-medium text-right">Total HT</th>
                        <th className="py-2 px-1 font-medium text-right">TVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.lines.map((l, i) => (
                        <tr key={i} className="border-b border-slate-800/60 last:border-0">
                          <td className="py-2 px-1 text-slate-300">{l.designation}</td>
                          <td className="py-2 px-1 text-right text-slate-300 font-mono">
                            {l.quantity}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-300 font-mono">
                            {formatDT(l.unit_price)}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-200 font-mono">
                            {formatDT(l.total)}
                          </td>
                          <td className="py-2 px-1 text-right text-slate-400 font-mono">
                            {l.vat_rate !== undefined ? `${l.vat_rate} %` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/documents"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition shadow-lg shadow-blue-500/20 flex-1"
            >
              Valider et pré-remplir
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition border border-slate-700 flex-1 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Scanner une autre facture
            </button>
          </div>

          {/* Note RGPD */}
          <p className="text-[11px] text-slate-500 text-center">
            🔒 Fichier traité en mémoire, jamais stocké. Aucun texte extrait n\u2019est
            conservé (RGPD).
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sous-composant ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd
        className={`mt-0.5 ${mono ? 'font-mono' : ''} ${
          highlight
            ? 'text-base font-bold text-slate-100'
            : 'text-sm text-slate-200'
        } ${value ? '' : 'text-slate-600'}`}
      >
        {value || '—'}
      </dd>
    </div>
  );
}
