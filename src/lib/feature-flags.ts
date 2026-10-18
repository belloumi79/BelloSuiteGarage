/**
 * feature-flags.ts
 * Feature flags du produit — lecture côté client uniquement (NEXT_PUBLIC_*).
 *
 * Aucune dépendance serveur : importable depuis un composant 'use client'.
 */

// Scan de facture OCR (J0) — activable par feature flag.
// NEXT_PUBLIC_SCAN_ONBOARDING=false → onboarding J0 désactivée.
export const SCAN_ONBOARDING_ENABLED = process.env.NEXT_PUBLIC_SCAN_ONBOARDING !== 'false';