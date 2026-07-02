import { getCurrentGarage } from '@/lib/context';
import { redirect } from 'next/navigation';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentGarage();

  if (!ctx) {
    redirect('/login');
  }

  return <>{children}</>;
}
