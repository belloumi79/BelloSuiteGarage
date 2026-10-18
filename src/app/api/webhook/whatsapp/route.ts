/**
 * Webhook WPPConnect — reçoit les messages entrants WhatsApp.
 *
 * Le sidecar WPPConnect Server envoie automatiquement les événements
 * sur cette URL si WEBHOOK_URL est configuré dans le conteneur.
 *
 * Événements supportés :
 *   - messages.upsert        : nouveau message reçu (2-way com)
 *   - messages.update        : accusés de réception, lecture, échec
 *   - chats.set              : session ouverte, contact créé
 *   - connection.state        : état de la session (CONNECTED/DISCONNECTED)
 *
 * Auth : Authorization: Bearer <token> (WPPCONNECT_TOKEN)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Types WPPConnect Server webhook events
// ---------------------------------------------------------------------------

interface WppWebhookMessage {
  key?: {
    id: string;
    fromMe: boolean;
    remote: string;
    participant?: string;
  };
  phone?: string;
  pushName?: string;
  contactName?: string;
  from?: string;
  to?: string;
  fromMe?: boolean;
  id?: string;
  ack?: number;
  type?: string;
  typeNotification?: string;
  body?: string;
  timestamp?: number;
  sender?: string;
  senderName?: string;
}

interface WppWebhookPayload {
  event?: string;
  instance?: {
    name: string;
    number?: string;
    profile?: {
      name?: string;
      number?: string;
      picture?: string;
    };
  };
  data?: any;
  messages?: any[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function verifyAuth(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth) return 'Missing Authorization header';
  const token = auth.replace('Bearer ', '').trim();
  const expectedToken = process.env.WPPCONNECT_TOKEN || '';
  if (!token || !expectedToken || token !== expectedToken) return 'Invalid token';
  return null;
}

// ---------------------------------------------------------------------------
// Normalize sender phone (Tunisia-friendly)
// ---------------------------------------------------------------------------

function normalizePhone(rawPhone: string | undefined): string {
  if (!rawPhone) return '';
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.endsWith('@c.us')) return cleaned.replace('@c.us', '');
  if (cleaned.startsWith('216')) return cleaned;
  if (cleaned.startsWith('0')) return `216${cleaned.substring(1)}`;
  return cleaned;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // 1. Auth
    const authError = verifyAuth(request.headers);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // 2. Parse payload
    const payload: WppWebhookPayload = await request.json().catch(() => ({}));
    const event = payload.event || 'unknown';
    const instanceName = payload.instance?.name || 'bellosuite';

    // 3. Skip non-message events (log them)
    if (event !== 'messages.upsert') {
      // connection.state events — logs pour monitoring
      if (event === 'connection.state') {
        const state = payload.data?.state || 'unknown';
        console.log(`[WPPConnect] Session ${instanceName} état : ${state}`);
      }
      return NextResponse.json({ status: 'received', event, skipped: true });
    }

    // 4. messages.upsert — seul les messages entrants (fromMe === false)
    const messages = payload.messages || payload.data?.messages || [payload.data];
    const results = { received: 0, skipped: 0, errors: [] as string[] };

    for (const msg of messages) {
      try {
        const wppMsg = msg as unknown as WppWebhookMessage;

        // Skip les messages envoyés par nous-mêmes
        if (wppMsg.key?.fromMe || wppMsg.fromMe) {
          results.skipped++;
          continue;
        }

        // Récupérer le numéro du client
        const rawPhone = wppMsg.key?.remote || wppMsg.from || wppMsg.sender || '';
        const senderPhone = normalizePhone(rawPhone);
        const senderName =
          wppMsg.pushName || wppMsg.contactName || wppMsg.senderName || rawPhone || 'Inconnu';
        const messageBody = wppMsg.body || '';

        if (!senderPhone || !messageBody) {
          results.skipped++;
          continue;
        }

        // Trouver le client BelloSuite par numéro (Tunisia : 216XX XXX XXX)
        const client = await prisma.clients.findFirst({
          where: {
            OR: [
              { mobile: senderPhone },
              { phone: senderPhone },
              { mobile: `+${senderPhone}` },
              { phone: `+${senderPhone}` },
            ],
          },
          select: { id: true, garage_id: true, company_name: true },
        });

        if (!client) {
          // Journaliser quand même (message d'un numéro inconnu)
          console.log(`[WPPConnect] Message de ${senderPhone} (${senderName}) — client non trouvé`);
          results.skipped++;
          continue;
        }

        // Journalisation message entrant
        await prisma.whatsapp_messages.create({
          data: {
            garage_id: client.garage_id,
            client_id: client.id,
            document_id: null,
            direction: 'in',
            template_key: null,
            body: messageBody,
            to_phone: senderPhone,
            wa_status: 'received',
            wa_message_id: wppMsg.key?.id || wppMsg.id || 'unknown',
            wa_sender_name: senderName,
            sent_at: wppMsg.timestamp ? new Date(wppMsg.timestamp * 1000) : new Date(),
          },
        });

        results.received++;
        console.log(
          `[WPPConnect] Message entrant de ${senderPhone} (${client.company_name || senderName}) — garage ${client.garage_id}`
        );

        // TODO Phase 2 : créer un ticket / notification pour le support
        //              — FreeLLMAPI pour suggérer une réponse
        //              — Push notification au support
      } catch (err) {
        results.errors.push(getErrorMessage(err));
      }
    }

    return NextResponse.json({
      status: 'processed',
      event,
      instance: instanceName,
      results,
    });
  } catch (err) {
    console.error('[WPPConnect] Webhook error:', getErrorMessage(err));
    return NextResponse.json(
      { error: 'Webhook processing failed', detail: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

/**
 * GET — vérifie que le webhook est actif (healthcheck externe).
 */
export async function GET(request: Request) {
  const authError = verifyAuth(request.headers);
  if (authError) return NextResponse.json({ error: authError }, { status: 401 });

  return NextResponse.json({
    status: 'ok',
    endpoint: 'webhook/whatsapp',
    timestamp: new Date().toISOString(),
  });
}
