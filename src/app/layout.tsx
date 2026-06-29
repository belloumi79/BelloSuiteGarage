import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BelloGarage — Logiciel de Gestion pour Garages',
  description: 'Gérez vos clients, véhicules, devis, ordres de réparation, factures, trésorerie et stock gratuitement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
