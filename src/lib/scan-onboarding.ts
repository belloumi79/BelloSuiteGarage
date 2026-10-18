/**
 * SCAN_ONBOARDING_J0 — bloc « zéro saisie » pour l'écran d'activation J0.
 *
 * @the-growth-commercialisation-bot : le pipeline OCR étant opérationnel,
 * le levier « zéro saisie » est activable dans le parcours J0.
 * Copy : bénéfice assumé (gain de temps, pas d'erreur), pas de mention technique.
 * Conformité (brouillon, RGPD) dans le finePrint, pas dans le headline.
 */

export const SCAN_ONBOARDING_J0 = {
  badge: '⚡ Nouveau — scannez vos factures',
  headline: 'Plus jamais de saisie manuelle',
  body:
    'Scannez votre première facture : l\'OCR la lit automatiquement. ' +
    'Fournisseur, numéro, montants, TVA, MF client — tout est pré-rempli. ' +
    'Vous validatez en 2 clics. C\'est 10 minutes de gagnées par facture, ' +
    'et zéro risque de MF erroné (le plus souvent rejeté par TTN).',
  bullets: [
    'PDF, photo ou scan — supportés',
    'Pré-remplissage automatique des champs',
    'Vérification arithmétique TVA/FODEC intégrée',
    'Brouillon systématique : revue humaine avant écriture',
  ],
  cta: { label: 'Scanner ma première facture', href: '/scan' },
  finePrint:
    'Le scan est un brouillon. Aucune écriture comptable n\'est enregistrée ' +
    'sans votre validation. Aucun document n\'est stocké (RGPD).',
} as const;

export type ScanOnboardingJ0 = typeof SCAN_ONBOARDING_J0;