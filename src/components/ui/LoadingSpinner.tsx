'use client';

import React from 'react';

const LoadingSpinner = React.memo(function LoadingSpinner({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-medium">{message}</p>
      </div>
    </div>
  );
});

export default LoadingSpinner;
