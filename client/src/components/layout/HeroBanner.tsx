import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export function HeroBanner() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const { data: character } = useQuery<{ id: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
    enabled: isAuthenticated,
  });

  // Same hidden conditions as HudBar
  if (!isAuthenticated || !character) return null;
  if (location.pathname.startsWith('/admin')) return null;
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <div className="bg-gradient-to-b from-realm-bg-900 via-realm-bg-800/80 to-realm-bg-900 border-b border-realm-border/50">
      <div className="max-w-screen-2xl mx-auto px-4 py-4 lg:py-5 flex items-center justify-center">
        <h1 className="font-display text-realm-gold-400/80 text-lg lg:text-xl tracking-[0.2em] uppercase select-none">
          Realm of Crowns
        </h1>
      </div>
    </div>
  );
}
