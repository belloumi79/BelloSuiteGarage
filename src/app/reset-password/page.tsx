'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Wrench, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-500/25">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">E-mail envoyé</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Si un compte existe pour <span className="text-white font-medium">{email}</span>,<br />
            vous recevrez un lien de réinitialisation sous peu.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm text-blue-400 hover:text-blue-300 transition">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">BelloGarage</h1>
          <p className="text-gray-400 text-sm mt-1">Réinitialisation du mot de passe</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Mot de passe oublié ?</h2>
          <p className="text-gray-400 text-sm mb-6">
            Saisissez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : 'Envoyer le lien'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
