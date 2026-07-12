import { createClient } from '@/lib/supabase/server';
import { getCurrentGarage } from '@/lib/context';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Sidebar from './Sidebar';
import ClientLayout from './ClientLayout';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentGarage();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    if (expiresAt.getTime() < now.getTime() + 30 * 60 * 1000) {
      await supabase.auth.refreshSession();
    }
  }

  let isSuperAdmin = false;
  if (ctx) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: { id: ctx.user.id },
        select: { is_super_admin: true },
      });
      isSuperAdmin = dbUser?.is_super_admin ?? false;
    } catch {}
  }

  if (ctx) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        <Sidebar isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950 relative">
          <ClientLayout>{children}</ClientLayout>
        </main>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-red-500/25">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Erreur de connexion</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Impossible de se connecter à la base de données.
            Vérifiez que <code className="text-red-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">DATABASE_URL</code> est correcte dans les variables d&apos;environnement Vercel.
          </p>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  redirect('/login');
}
