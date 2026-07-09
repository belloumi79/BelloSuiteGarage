'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BelloGarage] App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-amber-500/25">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Une erreur inattendue s&apos;est produite lors du chargement de la page.
          Veuillez réessayer ou vous reconnecter.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm transition"
          >
            Réessayer
          </button>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition"
          >
            Se reconnecter
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-600 mt-6">
            Réf : {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
