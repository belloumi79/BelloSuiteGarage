'use client';

import { usePathname } from 'next/navigation';
import MobileSidebarProvider, { useMobileSidebar, BottomTabNavigation, TopTabNavigation, DesktopSidebar } from './Navigation';
import { Menu, X } from 'lucide-react';

function MobileHeader() {
  const { isOpen, toggle } = useMobileSidebar();

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 touch-target"
            aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isOpen}
            aria-controls="sidebar"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-display font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">
            BelloGarage
          </span>
        </div>
      </div>
    </header>
  );
}

export default function AppShell({ children, isSuperAdmin }: { children: React.ReactNode; isSuperAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <MobileSidebarProvider isSuperAdmin={isSuperAdmin}>
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        <DesktopSidebar isSuperAdmin={isSuperAdmin} pathname={pathname} />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950 relative lg:ml-0">
          <MobileHeader />
          <TopTabNavigation pathname={pathname} isSuperAdmin={isSuperAdmin} />
          {children}
          <BottomTabNavigation pathname={pathname} />
        </main>
      </div>
    </MobileSidebarProvider>
  );
}