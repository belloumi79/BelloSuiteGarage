'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface WritingAssistantProps {
  text: string;
  onResult: (text: string) => void;
  mode?: 'correct' | 'improve' | 'translate-en' | 'translate-ar';
}

export default function WritingAssistant({ text, onResult, mode = 'improve' }: WritingAssistantProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const prompts: Record<string, string> = {
      correct: 'Corrige les fautes d\'orthographe et de grammaire de ce texte sans en changer le sens. Réponds uniquement avec le texte corrigé :\n\n',
      improve: 'Améliore le professionnalisme et la clarté de ce texte pour un ordre de réparation automobile. Réponds uniquement avec le texte amélioré :\n\n',
      'translate-en': 'Traduis ce texte en anglais (technique automobile). Réponds uniquement avec la traduction :\n\n',
      'translate-ar': 'Traduis ce texte en arabe (technique automobile). Réponds uniquement avec la traduction :\n\n',
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompts[mode] + text,
          context: 'writing',
        }),
      });
      const data = await res.json();
      if (data.reply) onResult(data.reply);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={loading || !text.trim()}
      className="p-1.5 bg-purple-600/10 hover:bg-purple-600/20 rounded-lg text-purple-400 transition disabled:opacity-40"
      title={
        mode === 'correct' ? 'Corriger' :
        mode === 'translate-en' ? 'Traduire en anglais' :
        mode === 'translate-ar' ? 'Traduire en arabe' :
        'Améliorer le texte'
      }
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
    </button>
  );
}
