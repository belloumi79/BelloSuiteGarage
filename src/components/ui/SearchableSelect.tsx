'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => (query
      ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
      : options
    ),
    [options, query],
  );

  useEffect(() => {
    if (!open) { setQuery(''); setHighlightIndex(-1); }
  }, [open]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (query && query !== value) onChange(query);
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [query, value, onChange]);

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          select(filtered[highlightIndex]);
        } else if (query) {
          select(query);
        }
        break;
      case 'Escape':
        if (query && query !== value) onChange(query);
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      <div
        className={`w-full bg-slate-950 border rounded-xl flex items-center px-3 cursor-text ${open ? 'border-blue-500' : 'border-slate-800'}`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'Sélectionnez...'}
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent py-2 text-sm text-slate-200 focus:outline-none"
          required={required}
        />
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">Aucun résultat</div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition ${i === highlightIndex ? 'bg-blue-600/30 text-blue-300' : 'text-slate-300 hover:bg-slate-800'}`}
                onClick={() => select(opt)}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
