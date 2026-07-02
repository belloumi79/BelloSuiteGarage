import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-red-500/25">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Lien invalide ou expiré</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Le lien d&apos;authentification que vous avez utilisé est invalide ou a expiré.<br />
          Veuillez réessayer depuis la page de connexion.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-sm transition"
          >
            Se connecter
          </Link>
          <Link
            href="/reset-password"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition"
          >
            Réinitialiser le mot de passe
          </Link>
        </div>
      </div>
    </div>
  );
}
