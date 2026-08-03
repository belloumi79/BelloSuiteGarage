'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      addToast('BelloGarage installé avec succès !');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [addToast]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      addToast('Installation en cours...');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Installer BelloGarage</p>
            <p className="text-[11px] text-slate-400">Accès rapide, mode hors ligne, notifications</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
            >
              Installer
            </button>
            <button
              onClick={() => setIsInstallable(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}