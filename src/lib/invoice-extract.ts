/**
 * invoice-extract.ts
 * Validation & contrôle arithmétique pour l'extraction OCR de factures tunisiennes.
 *
 * Contrôles appliqués (non négociables — @the-local-compliance-tax-agent) :
 *   1. totalsConsistent  : HT + FODEC + TVA + timbre ≈ TTC  (tolérance 0,05)
 *   2. vatBaseCoherent   : TVA recalculée = taux × (HT + FODEC)
 *      — détecte les factures auto-cohérentes mais sous-facturées (TVA sur HT seul)
 *      — taux unique : strict, pas d'échappatoire
 *      — multi-taux  : Σ(amount_i / taux_i) ≤ HT + FODEC
 *      — FODEC null  : base = HT seul (services, produits agricoles)
 *
 * RGPD : raw_text n'est JAMAIS retourné ni persisté côté BelloSuite.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceLine {
  designation: string;
  quantity: number;
  unit_price: number;
  total: number;
  vat_rate?: number; // taux de TVA de la ligne (pour breakdown multi-taux)
}

export interface VatBreakdown {
  rate: number;
  amount: number;
}

export interface RawInvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  date: string | null;          // YYYY-MM-DD
  due_date: string | null;      // YYYY-MM-DD
  client_name: string | null;
  client_mf: string | null;     // DGI: NNNNNNN/clé/codeTVA/catégorie/EEE
  subtotal_ht: number | null;
  fodec: number | null;
  vat_total: number | null;
  vat_breakdown: VatBreakdown[] | null;
  stamp_tax: number | null;
  total_ttc: number | null;
  lines: InvoiceLine[] | null;
  confidence: number;
  raw_text?: string;            // JAMAIS retourné au client
}

export interface ExtractCheck {
  totalsConsistent: boolean;
  vatBaseCoherent: boolean;
}

export interface ExtractWarning {
  code: string;
  field: string;
  message: string;
}

export interface InvoiceExtractResult {
  data: Omit<RawInvoiceData, 'raw_text'>;
  checks: ExtractCheck;
  warnings: ExtractWarning[];
  isDraft: boolean;             // true → brouillon forcé, revue humaine
  minConf: number;              // confiance effective après contrôles
  reviewFields: string[];       // champs à relire (pour ReviewFieldsHint)
}

// ─── Constantes fiscales ─────────────────────────────────────────────────────

const TOLERANCE = 0.05;          // tolérance arithmétique en DT
const CONF_DRAFT_THRESHOLD = 0.7; // sous 0.7 → brouillon forcé
const VAT_RATES = [0, 7, 13, 19];

// MF DGI : 7 chiffres + / + 1-4 lettres + / + 1-3 lettres + / + 3 chiffres
const MF_DGI_REGEX = /^\d{7}\/[A-Z]{1,4}\/[A-Z]{1,3}\/\d{3}$/;
// MF simple (7 chiffres + 1 lettre) — toléré pour les particuliers
const MF_SIMPLE_REGEX = /^\d{7}[A-Z]$/;
// 7 chiffres seuls → pas assez, retourner null (BelloSuite fait le regex complet)
const MF_7_DIGITS_ONLY_REGEX = /^\d{7}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function near(a: number, b: number, tol = TOLERANCE): boolean {
  return Math.abs(a - b) <= tol;
}

/**
 * Normalize un MF DGI reçu de l'OCR.
 * - Si le regex complet passe → le retourner tel quel
 * - Si seulement 7 chiffres → null (BelloSuite fait le regex complet)
 * - Si format partiel invalide → null (ne pas inventer)
 */
export function normalizeClientMF(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (MF_DGI_REGEX.test(trimmed)) return trimmed;
  if (MF_SIMPLE_REGEX.test(trimmed)) return trimmed;
  if (MF_7_DIGITS_ONLY_REGEX.test(trimmed)) return null; // trop incomplet
  return null; // format inconnu → ne pas inventer
}

/**
 * Valide un taux de TVA tunisien.
 */
export function isValidTvaRate(rate: number): boolean {
  return VAT_RATES.includes(rate);
}

// ─── Contrôles arithmétiques ──────────────────────────────────────────────────

interface ControlContext {
  ht: number;
  fodec: number;   // 0 si null (services, produits agricoles)
  vatTotal: number;
  vatBreakdown: VatBreakdown[] | null;
  stamp: number;
  ttc: number;
}

/**
 * Contrôle 1 : la somme tient-elle ?
 * HT + FODEC + TVA + timbre ≈ TTC
 */
export function checkTotalsConsistent(ctx: ControlContext): boolean {
  if (ctx.ht === 0 || ctx.ttc === 0) return true; // pas de montants → pas d'erreur
  const somme = ctx.ht + ctx.fodec + ctx.vatTotal + ctx.stamp;
  return near(somme, ctx.ttc, TOLERANCE);
}

/**
 * Contrôle 2 : la TVA est-elle cohérente avec la base DGI ?
 *
 * Taux unique :
 *   base_tva = HT + FODEC
 *   tva_attendue = (taux / 100) × base_tva
 *   |tva_attendue − vat_total| > tol → incohérent
 *
 * Multi-taux (vat_breakdown non null) :
 *   Chaque breakdown porte sur sa propre base de ligne.
 *   Check : Σ(amount_i / taux_i) ≤ HT + FODEC
 *   (si un taux est échangé entre lignes ou la base est gonflée → explose)
 *
 * FODEC null/0 : base = HT seul (pas de FODEC sur services/agricoles)
 */
export function checkVatBaseCoherent(ctx: ControlContext): boolean {
  const { ht, fodec, vatTotal, vatBreakdown } = ctx;
  if (vatTotal === 0) return true; // pas de TVA → pas d'erreur

  const baseTva = round3(ht + fodec); // FODEC null → fodec = 0 → base = HT

  // ── Taux unique (pas de breakdown) ──────────────────────────────────────────
  if (!vatBreakdown || vatBreakdown.length === 0) {
    // Déduire le taux implicite : tva_total / base_tva × 100
    const impliedRate = baseTva > 0 ? (vatTotal / baseTva) * 100 : 0;

    // Trouver le taux le plus proche parmi les taux légaux
    const closestRate = VAT_RATES.reduce((best, r) =>
      Math.abs(r - impliedRate) < Math.abs(best - impliedRate) ? r : best
    );

    if (closestRate === 0) {
      // Pas de TVA attendue mais il y en a → incohérent
      return false;
    }

    // Calcul strict : tva_attendue = taux × base_tva
    const tvaAttendue = (closestRate / 100) * baseTva;
    // Taux unique : STRICT — pas d'échappatoire (le contrôle doit être ferme)
    const tol = Math.max(0.01, Math.abs(vatTotal) * 0.002);
    return near(tvaAttendue, vatTotal, tol);
  }

  // ── Multi-taux (breakdown présent) ──────────────────────────────────────────
  // Chaque taux porte sur sa propre base de ligne.
  // Check STRICT : Σ(amount_i / taux_i) ≈ HT + FODEC (tolérance bilatérale).
  // Une base réduite (TVA sur HT seul au lieu de HT+FODEC) est détectée ici,
  // tout comme une base gonflée.
  let sumImplicitBases = 0;
  for (const item of vatBreakdown) {
    if (item.rate === 0) continue; // lignes 0 % : amount = 0, base non déductible du breakdown
    // Base implicite de cette ligne = amount / (rate/100)
    const implicitBase = item.amount / (item.rate / 100);
    sumImplicitBases += implicitBase;
  }
  // La somme des bases implicites doit être égale à la base totale (HT + FODEC)
  return near(sumImplicitBases, baseTva, TOLERANCE);
}

// ─── Fonction principale ──────────────────────────────────────────────────────

/**
 * Extrait et valide une facture depuis la réponse PythonAnywhere.
 *
 * RGPD : raw_text est supprimé de la réponse retournée.
 * Jamais loggué, jamais persisté côté BelloSuite.
 */
export function extractInvoice(raw: RawInvoiceData): InvoiceExtractResult {
  const warnings: ExtractWarning[] = [];

  // ── Normaliser client_mf ────────────────────────────────────────────────────
  const client_mf = normalizeClientMF(raw.client_mf);
  if (raw.client_mf && !client_mf) {
    warnings.push({
      code: 'mf_incomplete',
      field: 'client_mf',
      message: 'MF client incomplet — format DGI attendu : NNNNNNN/clé/codeTVA/EEE',
    });
  }

  // ── Construire le contexte de contrôle ──────────────────────────────────────
  const ht = raw.subtotal_ht ?? 0;
  const fodec = raw.fodec ?? 0; // null → 0 (services, produits agricoles)
  const vatTotal = raw.vat_total ?? 0;
  const vatBreakdown = raw.vat_breakdown && raw.vat_breakdown.length > 0
    ? raw.vat_breakdown
    : null;
  const stamp = raw.stamp_tax ?? 0;
  const ttc = raw.total_ttc ?? 0;

  const ctx: ControlContext = { ht, fodec, vatTotal, vatBreakdown, stamp, ttc };

  // ── Contrôle 1 : somme globale ──────────────────────────────────────────────
  const totalsConsistent = checkTotalsConsistent(ctx);
  if (!totalsConsistent) {
    warnings.push({
      code: 'check:totals_mismatch',
      field: 'total_ttc',
      message: `La somme HT + FODEC + TVA + timbre (${round3(ht + fodec + vatTotal + stamp)}) ne correspond pas au TTC déclaré (${round3(ttc)})`,
    });
  }

  // ── Contrôle 2 : cohérence TVA / base DGI ───────────────────────────────────
  const vatBaseCoherent = checkVatBaseCoherent(ctx);
  if (!vatBaseCoherent) {
    warnings.push({
      code: 'check:vat_base_mismatch',
      field: 'vat_total',
      message: `TVA non cohérente avec la base (HT + FODEC = ${round3(ht + fodec)}) — possible sous-déclaration TVA`,
    });
  }

  // ── Contrôle 3 : taux de TVA légaux ─────────────────────────────────────────
  if (vatBreakdown) {
    for (const item of vatBreakdown) {
      if (!isValidTvaRate(item.rate)) {
        warnings.push({
          code: 'check:vat_rate_invalid',
          field: 'vat_breakdown',
          message: `Taux de TVA ${item.rate} % invalide — taux attendus : 0, 7, 13, 19 %`,
        });
      }
    }
  }

  // ── Calculer la confiance effective ─────────────────────────────────────────
  let minConf = raw.confidence;

  // Contrôle échoué → plafonner la confiance à 0.40 (brouillon forcé)
  if (!totalsConsistent) minConf = Math.min(minConf, 0.40);
  if (!vatBaseCoherent)  minConf = Math.min(minConf, 0.40);

  const isDraft = minConf < CONF_DRAFT_THRESHOLD;

  // ── Champs à relire (pour ReviewFieldsHint) ─────────────────────────────────
  const reviewFields: string[] = [];
  if (!client_mf || (raw.client_mf && !MF_DGI_REGEX.test(raw.client_mf))) {
    reviewFields.push('MF client');
  }
  if (!totalsConsistent) {
    reviewFields.push('Total HT');
    reviewFields.push('Total TTC');
  }
  if (!vatBaseCoherent) {
    reviewFields.push('Montant TVA');
    reviewFields.push('Taux de TVA');
  }
  if (warnings.some(w => w.code === 'check:vat_rate_invalid')) {
    reviewFields.push('Taux de TVA');
  }
  if (raw.fodec !== null && raw.fodec !== undefined && raw.fodec !== 0) {
    reviewFields.push('FODEC');
  }
  if (raw.stamp_tax !== null && raw.stamp_tax !== undefined) {
    reviewFields.push('Timbre');
  }

  // ── Supprimer raw_text (RGPD) ───────────────────────────────────────────────
  const { raw_text: _raw, ...data } = raw;
  void _raw; // ne jamais logguer ni retourner

  return {
    data: { ...data, client_mf },
    checks: { totalsConsistent, vatBaseCoherent },
    warnings,
    isDraft,
    minConf: round3(minConf),
    reviewFields: [...new Set(reviewFields)], // dedup
  };
}

// ─── Types déjà exportés ci-dessus (interfaces) ────────────────────────────────
// ExtractCheck, ExtractWarning, InvoiceExtractResult, RawInvoiceData,
// VatBreakdown, InvoiceLine sont exportés en déclaration directe au-dessus.
