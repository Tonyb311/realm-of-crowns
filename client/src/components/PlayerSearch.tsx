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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 bg-dark-400 border border-dark-50 rounded text-sm text-parchment-200 placeholder-parchment-500 focus:outline-none focus:border-primary-400"
        />
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-dark-300 border border-dark-50 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
            </div>
          ) : !results || results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-parchment-500">No players found.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-dark-200 transition-colors text-left"
              >
                <div>
                  <span className="text-sm text-parchment-200 font-semibold">{c.name}</span>
                  {c.guildTag && (
                    <span className="ml-1.5 text-xs text-primary-400">[{c.guildTag}]</span>
                  )}
                  <span className="ml-2 text-xs text-parchment-500 capitalize">{c.race.toLowerCase()}</span>
                </div>
                <span className="text-xs text-parchment-500">Lv. {c.level}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
