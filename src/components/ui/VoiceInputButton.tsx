'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  lang?: string;
  title?: string;
}

type AnyConstructor = new (...args: unknown[]) => unknown;

function getSpeechRecognition(): AnyConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, AnyConstructor | undefined>;
  return w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null;
}

export default function VoiceInputButton({
  onTranscript,
  className = '',
  lang = 'fr-FR',
  title = 'Dictée vocale (IA navigateur)'
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      addToast('La saisie vocale n\'est pas supportée par votre navigateur (Utilisez Chrome ou Edge)', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition() as Record<string, unknown>;
      recognition['continuous'] = false;
      recognition['interimResults'] = false;
      recognition['lang'] = lang;

      recognition['onstart'] = () => {
        setIsListening(true);
        addToast('Écoute en cours... Parlez maintenant', 'info');
      };

      recognition['onresult'] = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
          addToast(`Texte capturé: "${transcript}"`);
        }
      };

      recognition['onerror'] = (event: { error: string }) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          addToast(`Erreur de dictée vocale: ${event.error}`, 'error');
        }
      };

      recognition['onend'] = () => {
        setIsListening(false);
      };

      (recognition['start'] as () => void)();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      addToast('Impossible de démarrer la reconnaissance vocale', 'error');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-2 rounded-xl transition flex items-center justify-center ${
        isListening
          ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
          : 'bg-slate-800/80 text-slate-400 hover:text-blue-400 hover:bg-slate-700 border border-slate-700/50'
      } ${className}`}
      title={isListening ? 'Arrêter l\'écoute' : title}
    >
      {isListening ? (
        <MicOff className="w-4 h-4 text-red-400 animate-bounce" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
