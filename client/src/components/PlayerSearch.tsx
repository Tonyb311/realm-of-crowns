import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
import api from '../services/api';

interface SearchResult {
  id: string;
  name: string;
  race: string;
  level: number;
  guildTag?: string;
}

interface PlayerSearchProps {
  onSelect?: (character: SearchResult) => void;
  placeholder?: string;
}

export default function PlayerSearch({ onSelect, placeholder = 'Search players...' }: PlayerSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ['character-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get('/characters/search', { params: { q: debouncedQuery, limit: 10 } });
      return res.data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  function handleSelect(character: SearchResult) {
    setIsOpen(false);
    setQuery('');
    if (onSelect) {
      onSelect(character);
    } else {
      navigate(`/profile/${character.id}`);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 bg-realm-bg-800 border border-realm-border rounded text-sm text-realm-text-primary placeholder-realm-text-muted focus:outline-none focus:border-realm-gold-500"
        />
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-realm-bg-700 border border-realm-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-realm-gold-400 animate-spin" />
            </div>
          ) : !results || results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-realm-text-muted">No players found.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-realm-bg-600 transition-colors text-left"
              >
                <div>
                  <span className="text-sm text-realm-text-primary font-semibold">{c.name}</span>
                  {c.guildTag && (
                    <span className="ml-1.5 text-xs text-realm-gold-400">[{c.guildTag}]</span>
                  )}
                  <span className="ml-2 text-xs text-realm-text-muted capitalize">{c.race.toLowerCase()}</span>
                </div>
                <span className="text-xs text-realm-text-muted">Lv. {c.level}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
