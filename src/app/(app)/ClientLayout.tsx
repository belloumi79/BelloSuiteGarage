'use client';

import { ToastProvider } from '@/components/ui/Toast';
import FloatingAssistant from '@/components/ai/FloatingAssistant';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { OnlineStatus } from '@/components/OnlineStatus';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OnlineStatus />
      <PWAInstallPrompt />
      {children}
      <FloatingAssistant />
    </ToastProvider>
  );
}
