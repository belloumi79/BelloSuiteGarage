import { NextResponse } from 'next/server';
import { checkSessionHealth } from '@/lib/whatsapp';

/**
 * Healthcheck complet — inclut l'état de la session WPPConnect.
 * Appelé par le healthcheck Docker (et par le monitoring).
 */
export async function GET() {
  const checks: Record<string, string> = {
    app: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  // WPPConnect — optionnel : si pas configuré, la feature est off (pas un problème)
  const wppConfigured = Boolean(process.env.WPPCONNECT_TOKEN);
  const wppHealth = wppConfigured ? await checkSessionHealth() : null;
  checks.wppconnect = !wppConfigured ? 'disabled' : (wppHealth ?? 'connected');

  // L'app est saine si l'app répond ET que, si WPPConnect est configuré, la session est up
  const allOk = checks.app === 'ok' && (!wppConfigured || checks.wppconnect === 'connected');

  return NextResponse.json(checks, { status: allOk ? 200 : 503 });
}