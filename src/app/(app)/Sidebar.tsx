'use client';

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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between no-print z-10">
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
            <Wrench className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">BelloGarage</span>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Tunis Edition</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
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
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/60 space-y-1">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive('/admin')
                ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Shield className="w-4 h-4" />
            Administration
          </Link>
        )}
        <Link
          href="/settings/members"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            isActive('/settings/members')
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Membres
        </Link>
        <Link
          href="/settings"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            isActive('/settings')
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Settings className="w-4 h-4" />
          Paramètres Garage
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

