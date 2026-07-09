'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Chargement de BelloGarage…</span>
      </div>
    </div>
  );
}
