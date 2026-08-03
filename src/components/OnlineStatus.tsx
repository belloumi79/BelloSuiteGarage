'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setWasOffline(true);
        addToast('Mode hors ligne activé - Données en cache disponibles', 'warning');
      } else if (wasOffline) {
        setWasOffline(false);
        addToast('Connexion rétablie - Synchronisation...', 'success');
        // Trigger background sync
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            // Background Sync API is not in standard TypeScript types yet
            const swReg = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
            if (swReg.sync) {
              swReg.sync.register('sync-data').catch(console.error);
            }
          });
        }
      }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [wasOffline, addToast]);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium animate-slide-down">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </path>
        </svg>
        <span>Mode hors ligne - Données en cache disponibles</span>
      </div>
    </div>
  );
}