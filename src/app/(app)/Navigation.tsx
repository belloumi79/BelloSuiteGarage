'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Car,
  Package,
  FileText,
  Calendar,
  Settings,
  LogOut,
  UserCog,
  Shield,
  ChevronLeft,
  X,
  Wrench,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: TrendingUp },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/vehicles', label: 'Véhicules', icon: Car },
  { path: '/items', label: 'Articles & Stock', icon: Package },
  { path: '/documents', label: 'Documents & Devis', icon: FileText },
  { path: '/planning', label: 'Planning', icon: Calendar },
];

const secondaryNavItems = [
  { path: '/settings/members', label: 'Membres', icon: UserCog },
  { path: '/settings', label: 'Paramètres Garage', icon: Settings },
];

interface MobileSidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null);

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within MobileSidebarProvider');
  }
  return context;
}

export function MobileSidebarProvider({
  children,
  isSuperAdmin,
}: {
  children: React.ReactNode;
  isSuperAdmin?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (overlayRef.current && overlayRef.current.contains(event.target as Node)) {
          close();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  return (
    <MobileSidebarContext.Provider value={{ isOpen, toggle, close }}>
      <div
        ref={overlayRef}
        className={`mobile-sidebar-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden ${isOpen ? 'open' : ''}`}
        onClick={close}
        aria-hidden={!isOpen}
      />
      <aside
        ref={sidebarRef}
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menu de navigation"
      >
        <SidebarContent isSuperAdmin={isSuperAdmin} />
      </aside>
      {children}
    </MobileSidebarContext.Provider>
  );
}

function SidebarContent({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const { close } = useMobileSidebar();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
            <Wrench className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">
              BelloGarage
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Tunis Edition</p>
          </div>
        </div>
        <button
          onClick={close}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 touch-target"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={close}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
                isActive(item.path)
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link
            href="/admin"
            onClick={close}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
              isActive('/admin')
                ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Shield className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Administration</span>
          </Link>
        )}
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={close}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
                isActive(item.path)
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/60 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent transition-all touch-target cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}

/* Desktop Sidebar - Hidden on mobile/tablet, visible on desktop */
export function DesktopSidebar({ isSuperAdmin, pathname }: { isSuperAdmin?: boolean; pathname: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch {
      console.error('Error during logout');
    }
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:bg-slate-900 lg:border-r lg:border-slate-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}
      aria-label="Menu de navigation principal"
    >
      <div className="lg:flex lg:flex-col lg:flex-1 lg:overflow-y-auto">
        <div className={`lg:p-4 lg:border-b lg:border-slate-800 lg:flex lg:items-center lg:gap-3 ${isCollapsed ? 'lg:px-2' : ''}`}>
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
            <Wrench className="w-5 h-5" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent truncate block">
                BelloGarage
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase truncate">Tunis Edition</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition touch-target ${isCollapsed ? 'rotate-180' : ''}`}
              aria-label={isCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
              aria-expanded={!isCollapsed}
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className={`lg:p-4 lg:space-y-1 ${isCollapsed ? 'lg:px-2' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:transition-all touch-target ${
                  isActive(item.path)
                    ? 'lg:bg-blue-600/10 lg:text-blue-400 lg:border lg:border-blue-500/20'
                    : 'lg:text-slate-400 lg:hover:bg-slate-800/60 lg:hover:text-slate-200 lg:border lg:border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
                <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:transition-all touch-target ${
                isActive('/admin')
                  ? 'lg:bg-amber-600/10 lg:text-amber-400 lg:border lg:border-amber-500/20'
                  : 'lg:text-slate-400 lg:hover:bg-slate-800/60 lg:hover:text-slate-200 lg:border lg:border-transparent'
              }`}
              title={isCollapsed ? 'Administration' : ''}
            >
              <Shield className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
              <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>Administration</span>
            </Link>
          )}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:transition-all touch-target ${
                  isActive(item.path)
                    ? 'lg:bg-blue-600/10 lg:text-blue-400 lg:border lg:border-blue-500/20'
                    : 'lg:text-slate-400 lg:hover:bg-slate-800/60 lg:hover:text-slate-200 lg:border lg:border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
                <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`lg:p-4 lg:border-t lg:border-slate-800/60 lg:space-y-1 ${isCollapsed ? 'lg:px-2' : ''}`}>
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={`lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:transition-all touch-target ${
              isActive('/admin')
                ? 'lg:bg-amber-600/10 lg:text-amber-400 lg:border lg:border-amber-500/20'
                : 'lg:text-slate-400 lg:hover:bg-slate-800/60 lg:hover:text-slate-200 lg:border lg:border-transparent'
            }`}
            title={isCollapsed ? 'Administration' : ''}
          >
            <Shield className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
            <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>Administration</span>
          </Link>
        )}
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:transition-all touch-target ${
                isActive(item.path)
                  ? 'lg:bg-blue-600/10 lg:text-blue-400 lg:border lg:border-blue-500/20'
                  : 'lg:text-slate-400 lg:hover:bg-slate-800/60 lg:hover:text-slate-200 lg:border lg:border-transparent'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
              <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl lg:text-sm lg:font-medium lg:text-slate-400 lg:hover:bg-red-950/20 lg:hover:text-red-400 lg:border lg:border-transparent lg:transition-all touch-target lg:cursor-pointer"
          title={isCollapsed ? 'Se déconnecter' : ''}
        >
          <LogOut className="lg:w-5 lg:h-5 lg:flex-shrink-0" aria-hidden="true" />
          <span className={`lg:truncate ${isCollapsed ? 'hidden' : ''}`}>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

/* Top Tab Navigation for Tablet (hidden on mobile and desktop) */
export function TopTabNavigation({ pathname, isSuperAdmin }: { pathname: string; isSuperAdmin?: boolean }) {
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="hidden md:flex md:items-center md:gap-1 md:px-4 md:py-2 md:bg-slate-900/80 md:backdrop-blur-md md:border-b md:border-slate-800 md:sticky md:top-0 md:z-30 lg:hidden"
      role="navigation"
      aria-label="Navigation principale tablette"
    >
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap touch-target ${
                isActive(item.path)
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap touch-target ${
              isActive('/admin')
                ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
            aria-current={isActive('/admin') ? 'page' : undefined}
          >
            <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

/* Bottom Tab Navigation for Mobile (hidden on tablet and desktop) */
export function BottomTabNavigation({ pathname }: { pathname: string }) {
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 md:hidden" role="navigation" aria-label="Navigation principale mobile">
      <div className="flex justify-around items-center p-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`bottom-nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all min-w-[60px] ${
                isActive(item.path) ? 'text-blue-400' : 'text-slate-400 active:text-blue-400'
              }`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileSidebarProvider;