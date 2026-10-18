/**
 * WPPConnect Server — WhatsApp via session WhatsApp Web (sidecar Docker).
 *
 * Sidecar officiel : https://github.com/wppconnect-team/wppconnect-server
 *   - Image : wppconnect/wppconnect-server:latest (Node + Chromium inclus)
 *   - Port  : 21465
 *   - Auth  : Bearer <token> où token = valeur "full" (wppconnect:$2b$...)
 *             générée via POST /api/{session}/{SECRET_KEY}/generate-token
 *   - Docs  : https://wppconnect.io/swagger/wppconnect-server/
 *
 * Routes utilisées :
 *   POST /api/{session}/send-message              { phone, message }
 *   GET  /api/{session}/check-connection-state    { state, isLogged, etc. }
 *
 * Chaque envoi est journalisé dans whatsapp_messages (preuve horodatée, Loi 2004-5).
 *
 * Kill-switch :
 *   - Global : env WHATSAPP_ENABLED (défaut false)
 *   - Client : client.whatsapp_opt_in (défaut false)
 *   - Les DEUX doivent être vrais pour envoyer.
 */

import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WppConnectConfig {
  baseUrl: string;
  token: string;
  instanceName: string;
}

interface WppConnectMessage {
  phone: string;
  message: string;
  options?: {
    delay?: number;
    selfReply?: boolean;
    quotedMsg?: string;
  };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig(): WppConnectConfig | null {
  const baseUrl = process.env.WPPCONNECT_BASE_URL || 'http://localhost:21465';
  const token = process.env.WPPCONNECT_TOKEN || '';
  const instanceName = process.env.WPPCONNECT_INSTANCE || 'bellosuite';

  if (!token) return null;

  return { baseUrl, token, instanceName };
}

// ---------------------------------------------------------------------------
// Kill-switch tenant (garages.whatsapp_notifications_enabled)
// ---------------------------------------------------------------------------
// Double gate Loi 2004-5 :
//   1. Tenant : garages.whatsapp_notifications_enabled (kill-switch, défaut false)
//   2. Client : clients.whatsapp_opt_in (consentement individuel, défaut false)
// L'env WHATSAPP_ENABLED reste en garde-fond global (false = rien ne part,
// même si les deux switches DB sont à true — ex : incident, numéro banni).

async function isTenantWhatsAppEnabled(garageId: string): Promise<boolean> {
  try {
    const garage = await prisma.garages.findUnique({
      where: { id: garageId },
      select: { whatsapp_notifications_enabled: true },
    });
    return garage?.whatsapp_notifications_enabled === true;
  } catch (err: unknown) {
    console.error('[WPPConnect] Erreur lecture kill-switch tenant :', getErrorMessage(err));
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session health check (appelé avant chaque envoi, et par le healthcheck)
// ---------------------------------------------------------------------------

/**
 * Vérifie que la session WPPConnect est connectée (QR scanné).
 * Retourne null si connecté, sinon un message d'erreur.
 */
export async function checkSessionHealth(): Promise<string | null> {
  const config = getConfig();
  if (!config) return 'WPPConnect non configuré (WPPCONNECT_TOKEN manquant)';

  const url = `${config.baseUrl}/api/${config.instanceName}/check-connection-state`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return `WPPConnect healthcheck HTTP ${res.status}`;
    const data = await res.json();
    // WPPConnect renvoie { state: 'CONNECTED' | 'DISCONNECTED' | 'OPENING', ... }
    const state = data?.state ?? data?.status ?? null;
    if (state === 'CONNECTED' || state === 'connected' || state === 'OPENING') return null;
    return `Session WPPConnect non connectée (state=${state}) — scan QR requis`;
  } catch (err: unknown) {
    return `WPPConnect healthcheck échoué : ${getErrorMessage(err)}`;
  }
}

// ---------------------------------------------------------------------------
// Phone formatting (Tunisia → international)
// ---------------------------------------------------------------------------

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\+\-\(\)]/g, '');
  if (cleaned.startsWith('216')) return cleaned;
  if (cleaned.startsWith('0')) return `216${cleaned.substring(1)}`;
  return `216${cleaned}`;
}

// ---------------------------------------------------------------------------
// WPPConnect API calls — official WPPConnect Server REST API
//   POST /api/{session}/send-message
//   Body : { phone, message }
//   Auth : Bearer <token>
// ---------------------------------------------------------------------------
// Note : le token est la valeur "full" retournée par generate-token
//        (ex: "wppconnect:$2b$10$...") — c'est elle qu'il faut mettre dans .env.

async function sendTextToWpp(msg: WppConnectMessage): Promise<{ messageId: string }> {
  const config = getConfig();
  if (!config) {
    console.warn('[WPPConnect] Config manquante — envoi impossible');
    throw new Error('WPPConnect non configuré');
  }

  // Route officielle : /api/{session}/send-message
  const url = `${config.baseUrl}/api/${config.instanceName}/send-message`;
  const body = {
    phone: msg.phone,
    message: msg.message,
    ...(msg.options && { options: msg.options }),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
      // Authentification par Bearer token (valeur "full" de generate-token)
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown');
    throw new Error(`WPPConnect ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  // Réponse WPPConnect : { status, message, key: { id }, ... }
  return {
    messageId:
      data?.key?.id ??
      data?.messageId ??
      data?.result?.key?.id ??
      data?.id ??
      'unknown',
  };
}

// ---------------------------------------------------------------------------
// Templates — rappels de paiement (structure fiscale validée)
// ---------------------------------------------------------------------------

export function buildPaymentReminderTemplate(
  garageName: string,
  clientName: string,
  invoiceNumber: string,
  clientTaxId: string | null,
  amountTtc: number,
  dueDate: string,
  penalties: number | null,
  pdfUrl: string
): string {
  // Conformité Loi 2004-5 : identifiant expéditeur + référence facture + finalité
  let body = `🔔 [BelloSuite ${garageName}]\n`;
  body += `Rappel de paiement\n\n`;

  // Référence facture avec MF client (exigé en cas de litige DGI)
  const ref = clientTaxId ? `${clientTaxId}/${invoiceNumber}` : invoiceNumber;
  body += `Réf facture : ${ref}\n`;
  body += `Client : ${clientName}\n`;
  body += `Montant TTC : ${amountTtc.toFixed(2)} TND\n`;
  body += `Échéance : ${dueDate}\n`;

  if (penalties && penalties > 0) {
    body += `Pénalités de retard : ${penalties.toFixed(2)} TND\n`;
  }

  body += `\n📄 Facture : ${pdfUrl}\n`;
  body += `\nPour toute question, répondez à ce message.`;

  return body;
}

// ---------------------------------------------------------------------------
// Main entry — sendWhatsApp()
// ---------------------------------------------------------------------------

export interface SendWhatsAppOptions {
  /** Client Prisma ID (pour vérifier opt-in + journaliser) */
  clientId: string;
  /** Garage ID */
  garageId: string;
  /** Document ID si lié (pour preuve de relance) */
  documentId?: string;
  /** Numéro du client (format local ou international) */
  phone: string;
  /** Corps du message */
  message: string;
  /** Clé du template utilisé (pour audit) */
  templateKey?: string;
}

/**
 * Envoie un message WhatsApp au client via WPPConnect.
 * Vérifie kill-switch + opt-in avant tout envoi.
 * Journalise toujours dans whatsapp_messages (preuve horodatée).
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<boolean> {
  const { clientId, garageId, documentId, phone, message, templateKey } = options;

  // 1. Kill-switch global env (garde-fond : incident, numéro banni, feature coupée)
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('[WPPConnect] Kill-switch env désactivé — envoi ignoré');
    return false;
  }

  // 2. Kill-switch tenant (garages.whatsapp_notifications_enabled)
  const tenantEnabled = await isTenantWhatsAppEnabled(garageId);
  if (!tenantEnabled) {
    console.log(`[WPPConnect] Kill-switch tenant ${garageId} désactivé — envoi ignoré`);
    return false;
  }

  // 3. Opt-in client (Loi 2004-5 — consentement explicite)
  const client = await prisma.clients.findFirst({
    where: { id: clientId, garage_id: garageId },
    select: { whatsapp_opt_in: true, mobile: true, phone: true },
  });

  if (!client) {
    console.warn(`[WPPConnect] Client ${clientId} non trouvé`);
    return false;
  }

  if (!client.whatsapp_opt_in) {
    console.log(`[WPPConnect] Client ${clientId} n'a pas opt-in — envoi bloqué (Loi 2004-5)`);
    return false;
  }

  // 3. Numéro de destination (priorité mobile > phone du body > phone du param)
  const toPhone = formatPhone(phone || client.mobile || client.phone || '');
  if (!toPhone || toPhone.length < 8) {
    console.warn(`[WPPConnect] Numéro invalide pour client ${clientId}`);
    return false;
  }

  // 3b. Session health check (QR scanné ?) — évite les échecs silencieux
  const health = await checkSessionHealth();
  if (health) {
    console.warn(`[WPPConnect] Session déconnectée — envoi bloqué : ${health}`);
    // Journalisation (preuve d'attempt bloqué)
    await prisma.whatsapp_messages.create({
      data: {
        garage_id: garageId,
        client_id: clientId,
        document_id: documentId || null,
        direction: 'out',
        template_key: templateKey || null,
        body: message,
        to_phone: toPhone,
        wa_status: 'failed',
        error_message: health,
        sent_at: new Date(),
      },
    });
    return false;
  }

  // 4. Envoi via WPPConnect (best-effort)
  let errorMessage: string | null = null;

  try {
    const result = await sendTextToWpp({ phone: toPhone, message });

    // Journalisation succès (preuve horodatée — valeur légale)
    await prisma.whatsapp_messages.create({
      data: {
        garage_id: garageId,
        client_id: clientId,
        document_id: documentId || null,
        direction: 'out',
        template_key: templateKey || null,
        body: message,
        to_phone: toPhone,
        wa_status: 'sent',
        wa_message_id: result.messageId || 'unknown',
        sent_at: new Date(),
      },
    });
    console.log(`[WPPConnect] Message envoyé à ${toPhone} (client ${clientId})`);
    return true;
  } catch (err: unknown) {
    errorMessage = getErrorMessage(err);
    console.error(`[WPPConnect] Erreur envoi à ${toPhone}:`, errorMessage);

    // Journalisation échec (toujours — preuve)
    await prisma.whatsapp_messages.create({
      data: {
        garage_id: garageId,
        client_id: clientId,
        document_id: documentId || null,
        direction: 'out',
        template_key: templateKey || null,
        body: message,
        to_phone: toPhone,
        wa_status: 'failed',
        error_message: errorMessage,
        sent_at: new Date(),
      },
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper — relance facture (enveloppe du cron)
// ---------------------------------------------------------------------------

export interface InvoiceReminderPayload {
  garageId: string;
  clientId: string;
  documentId: string;
  phone: string;
  garageName: string;
  clientName: string;
  invoiceNumber: string;
  clientTaxId: string | null;
  amountTtc: number;
  dueDate: string;
  penalties: number | null;
  pdfUrl: string;
  reminderDay: number; // J+3, J+7, J+15
}

/**
 * Construit et envoie une relance de paiement.
 * Retourne true si envoyé, false si bloqué par kill-switch/opt-in ou erreur.
 */
export async function sendInvoiceReminder(payload: InvoiceReminderPayload): Promise<boolean> {
  const message = buildPaymentReminderTemplate(
    payload.garageName,
    payload.clientName,
    payload.invoiceNumber,
    payload.clientTaxId,
    payload.amountTtc,
    payload.dueDate,
    payload.penalties,
    payload.pdfUrl
  );

  const templateKey = `invoice_reminder_j${payload.reminderDay}`;

  return sendWhatsApp({
    clientId: payload.clientId,
    garageId: payload.garageId,
    documentId: payload.documentId,
    phone: payload.phone,
    message,
    templateKey,
  });
}
