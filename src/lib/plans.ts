/**
 * Configuration des plans d'abonnement BelloSuiteGarage
 * 
 * Tous les plans ont accès aux fonctionnalités de base.
 * Les limites (quotas) et fonctionnalités avancées varient selon le plan.
 */

export type PlanKey = 'starter' | 'pro' | 'enterprise';

export type FeatureKey = 
  | 'documents'           // Documents & Devis (base)
  | 'clients'             // Gestion clients (base)
  | 'vehicles'            // Gestion véhicules (base)
  | 'basic_stock'         // Stock basique (articles, mouvements)
  | 'advanced_stock'      // Stock avancé (alertes, inventaire, catégories)
  | 'planning'            // Planning / Agenda
  | 'reports'             // Rapports & Export CSV
  | 'multi_user'          // Multi-utilisateurs (inviter membres)
  | 'api_access'          // Accès API / Webhooks
  | 'sso'                 // Single Sign-On
  | 'custom_integrations' // Intégrations personnalisées
  | 'priority_support'    // Support prioritaire
  | 'white_label'         // Marque blanche
  | 'audit_logs';         // Journaux d'audit détaillés

export interface PlanLimits {
  maxMembers: number;      // -1 = illimité
  maxClients: number;
  maxVehicles: number;
  maxItems: number;
  maxDocumentsPerMonth: number;
  storageMB: number;       // Stockage fichiers (PDF, images)
  apiCallsPerMonth: number;
}

export interface PlanConfig {
  key: PlanKey;
  label: string;
  description: string;
  priceMonthly: number;    // en TND
  priceYearly: number;     // en TND (avec remise ~20%)
  limits: PlanLimits;
  features: FeatureKey[];
  popular?: boolean;
}

// Configuration des plans
export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: 'starter',
    label: 'Starter',
    description: 'Idéal pour débuter - Garage solo ou très petite équipe',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxMembers: 1,           // Propriétaire uniquement
      maxClients: 200,
      maxVehicles: 100,
      maxItems: 500,
      maxDocumentsPerMonth: 50,
      storageMB: 100,
      apiCallsPerMonth: 0,
    },
    features: [
      'documents',
      'clients',
      'vehicles',
      'basic_stock',
    ],
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    description: 'Pour garages en croissance - Équipe jusqu\'à 10 personnes',
    priceMonthly: 49,
    priceYearly: 470,  // ~20% remise
    limits: {
      maxMembers: 10,
      maxClients: 2000,
      maxVehicles: 1000,
      maxItems: 5000,
      maxDocumentsPerMonth: 500,
      storageMB: 1000,
      apiCallsPerMonth: 10000,
    },
    features: [
      'documents',
      'clients',
      'vehicles',
      'basic_stock',
      'advanced_stock',
      'planning',
      'reports',
      'multi_user',
    ],
    popular: true,
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    description: 'Pour grands garages / réseaux - Sans limites',
    priceMonthly: 199,
    priceYearly: 1910,  // ~20% remise
    limits: {
      maxMembers: -1,        // Illimité
      maxClients: -1,
      maxVehicles: -1,
      maxItems: -1,
      maxDocumentsPerMonth: -1,
      storageMB: -1,
      apiCallsPerMonth: -1,
    },
    features: [
      'documents',
      'clients',
      'vehicles',
      'basic_stock',
      'advanced_stock',
      'planning',
      'reports',
      'multi_user',
      'api_access',
      'sso',
      'custom_integrations',
      'priority_support',
      'white_label',
      'audit_logs',
    ],
  },
};

/**
 * Récupère la config d'un plan
 */
export function getPlanConfig(planKey: string): PlanConfig {
  return PLANS[planKey as PlanKey] ?? PLANS.starter;
}

/**
 * Vérifie si un plan a une fonctionnalité
 */
export function hasFeature(planKey: string, feature: FeatureKey): boolean {
  const plan = getPlanConfig(planKey);
  return plan.features.includes(feature);
}

/**
 * Vérifie si une limite est atteinte
 * Retourne { allowed: boolean, current: number, limit: number, message?: string }
 */
export function checkLimit(
  planKey: string,
  resource: keyof PlanLimits,
  currentCount: number
): { allowed: boolean; current: number; limit: number; message?: string } {
  const plan = getPlanConfig(planKey);
  const limit = plan.limits[resource];
  
  // -1 = illimité
  if (limit === -1) {
    return { allowed: true, current: currentCount, limit: -1 };
  }
  
  const allowed = currentCount < limit;
  return {
    allowed,
    current: currentCount,
    limit,
    message: allowed 
      ? undefined 
      : `Limite ${resource} atteinte (${currentCount}/${limit}). Passez au plan supérieur.`,
  };
}

/**
 * Vérifie l'accès à une fonctionnalité
 */
export function checkFeatureAccess(
  planKey: string,
  feature: FeatureKey
): { allowed: boolean; message?: string } {
  const allowed = hasFeature(planKey, feature);
  return {
    allowed,
    message: allowed 
      ? undefined 
      : `La fonctionnalité "${feature}" n'est pas incluse dans le plan ${getPlanConfig(planKey).label}. Passez au plan Pro ou Enterprise.`,
  };
}

/**
 * Obtient toutes les limites d'un plan
 */
export function getPlanLimits(planKey: string): PlanLimits {
  return getPlanConfig(planKey).limits;
}

/**
 * Vérifie si le garage peut créer un document ce mois-ci
 */
export function canCreateDocument(planKey: string, docsThisMonth: number): { allowed: boolean; message?: string } {
  return checkLimit(planKey, 'maxDocumentsPerMonth', docsThisMonth);
}

/**
 * Vérifie si on peut inviter un membre
 */
export function canInviteMember(planKey: string, currentMembers: number): { allowed: boolean; message?: string } {
  // Vérifier la feature multi_user
  const featureCheck = checkFeatureAccess(planKey, 'multi_user');
  if (!featureCheck.allowed) return featureCheck;
  
  // Vérifier la limite
  return checkLimit(planKey, 'maxMembers', currentMembers);
}

/**
 * Vérifie si on peut ajouter un client
 */
export function canAddClient(planKey: string, currentClients: number): { allowed: boolean; message?: string } {
  return checkLimit(planKey, 'maxClients', currentClients);
}

/**
 * Vérifie si on peut ajouter un véhicule
 */
export function canAddVehicle(planKey: string, currentVehicles: number): { allowed: boolean; message?: string } {
  return checkLimit(planKey, 'maxVehicles', currentVehicles);
}

/**
 * Vérifie si on peut ajouter un article
 */
export function canAddItem(planKey: string, currentItems: number): { allowed: boolean; message?: string } {
  return checkLimit(planKey, 'maxItems', currentItems);
}