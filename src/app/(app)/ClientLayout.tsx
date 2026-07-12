'use client';

import { ToastProvider } from '@/components/ui/Toast';
import FloatingAssistant from '@/components/ai/FloatingAssistant';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <FloatingAssistant />
    </ToastProvider>
  );
}
