'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
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
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: TrendingUp },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/vehicles', label: 'Véhicules', icon: Car },
  { path: '/items', label: 'Articles & Stock', icon: Package },
  { path: '/documents', label: 'Documents & Devis', icon: FileText },
  { path: '/planning', label: 'Planning', icon: Calendar },
];

export default function Sidebar({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile, isTablet]);

  const renderNavItems = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive(item.path)
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            } touch-target`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="sidebar-label truncate">{item.label}</span>
          </Link>
        );
      })}
      {isSuperAdmin && (
        <Link
          href="/admin"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
            isActive('/admin')
              ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Shield className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="sidebar-label truncate">Administration</span>
        </Link>
      )}
      <Link
        href="/settings/members"
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
          isActive('/settings/members')
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
        }`}
      >
        <UserCog className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="sidebar-label truncate">Membres</span>
      </Link>
      <Link
        href="/settings"
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
          isActive('/settings')
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Settings className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="sidebar-label truncate">Paramètres Garage</span>
      </Link>
    </>
  );

  // Mobile Bottom Navigation
  if (isMobile) {
    return (
      <>
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Menu de navigation"
        >
          <div className="flex flex-col flex-1 overflow-y-auto">
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
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 touch-target"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1">
              {renderNavItems()}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800/60 space-y-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent transition-all touch-target cursor-pointer"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="sidebar-label truncate">Se déconnecter</span>
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Bottom Navigation for Mobile */}
        <nav className="bottom-nav lg:hidden no-print" role="navigation" aria-label="Navigation principale">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </>
    );
  }

  // Tablet & Desktop Sidebar
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out no-print ${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      } ${isTablet ? 'tablet-hidden' : ''}`}
      aria-label="Menu de navigation principal"
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
            <Wrench className="w-5 h-5" aria-hidden="true" />
          </div>
          {!isSidebarCollapsed && (
            <div className="sidebar-logo-text min-w-0">
              <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent truncate block">
                BelloGarage
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase truncate">Tunis Edition</p>
            </div>
          )}
          {!isTablet && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition touch-target ${
                isSidebarCollapsed ? 'rotate-180' : ''
              }`}
              aria-label={isSidebarCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
              aria-expanded={!isSidebarCollapsed}
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className={`p-4 space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {renderNavItems()}
        </nav>
      </div>

      <div className={`p-4 border-t border-slate-800/60 space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
              isActive('/admin')
                ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
            title={isSidebarCollapsed ? 'Administration' : ''}
          >
            <Shield className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="sidebar-label truncate">Administration</span>
          </Link>
        )}
        <Link
          href="/settings/members"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
            isActive('/settings/members')
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
          }`}
          title={isSidebarCollapsed ? 'Membres' : ''}
        >
          <UserCog className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="sidebar-label truncate">Membres</span>
        </Link>
        <Link
          href="/settings"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all touch-target ${
            isActive('/settings')
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
          }`}
          title={isSidebarCollapsed ? 'Paramètres Garage' : ''}
        >
          <Settings className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="sidebar-label truncate">Paramètres Garage</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent transition-all touch-target cursor-pointer"
          title={isSidebarCollapsed ? 'Se déconnecter' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="sidebar-label truncate">Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

