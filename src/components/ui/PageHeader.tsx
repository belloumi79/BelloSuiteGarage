'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onRefresh?: () => void;
}

const PageHeader = React.memo(function PageHeader({ title, onRefresh }: PageHeaderProps) {
  return (
    <header className="p-6 border-b border-slate-800 flex justify-between items-center no-print bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold capitalize bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          {title}
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition"
            title="Actualiser les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
});

export default PageHeader;
