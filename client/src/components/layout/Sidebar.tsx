import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Landmark,
  Compass,
  Map,
  Swords,
  Package,
  User,
  Store,
  Truck,
  Hammer,
  Building2,
  ScrollText,
  Sparkles,
  Shield,
  Crown,
  Trophy,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Tooltip from '../ui/Tooltip';
import type { LucideIcon } from 'lucide-react';

interface NavItemDef {
  icon: LucideIcon;
  label: string;
  route: string;
  townOnly?: boolean;
  travelAlt?: {
    icon: LucideIcon;
    label: string;
    route: string;
  };
}

interface NavSection {
  items: NavItemDef[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { icon: Landmark, label: 'Town', route: '/town', townOnly: true, travelAlt: { icon: Compass, label: 'Travel', route: '/travel' } },
      { icon: Map, label: 'Map', route: '/map' },
      { icon: Swords, label: 'Combat', route: '/combat' },
      { icon: Package, label: 'Inventory', route: '/inventory' },
      { icon: User, label: 'Character', route: '/profile' },
    ],
  },
  {
    items: [
      { icon: Store, label: 'Market', route: '/market', townOnly: true },
      { icon: Truck, label: 'Trade', route: '/trade', townOnly: true },
      { icon: Hammer, label: 'Professions', route: '/professions', townOnly: true },
      { icon: Building2, label: 'Housing', route: '/housing', townOnly: true },
    ],
  },
  {
    items: [
      { icon: ScrollText, label: 'Quests', route: '/quests' },
      { icon: Sparkles, label: 'Skills', route: '/skills' },
      { icon: Shield, label: 'Guild', route: '/guild' },
      { icon: Crown, label: 'Diplomacy', route: '/diplomacy' },
      { icon: Trophy, label: 'Achievements', route: '/achievements' },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

  const { data: character } = useQuery<{ status: string } | null>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get('/characters/me');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  const isTraveling = character?.status === 'traveling';

  if (!isAuthenticated) return null;
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/admin')) return null;

  function isActive(route: string): boolean {
    return location.pathname === route || location.pathname.startsWith(route + '/');
  }

  function isDisabled(item: NavItemDef): boolean {
    return !!(isTraveling && item.townOnly);
  }

  function resolveItem(item: NavItemDef): { icon: LucideIcon; label: string; route: string; townOnly?: boolean } {
    if (isTraveling && item.travelAlt) {
      return { icon: item.travelAlt.icon, label: item.travelAlt.label, route: item.travelAlt.route };
    }
    return item;
  }

  function renderItem(itemDef: NavItemDef) {
    const item = resolveItem(itemDef);
    const Icon = item.icon;
    const active = isActive(item.route);
    const disabled = isDisabled(item);

    const button = (
      <Link
        to={disabled ? '#' : item.route}
        onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        className={`relative w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors
          ${active
            ? 'text-realm-gold-400 bg-realm-gold-400/10'
            : disabled
              ? 'text-realm-text-muted/30 cursor-not-allowed'
              : 'text-realm-text-muted hover:text-realm-text-primary hover:bg-realm-bg-600'
          }`}
        aria-label={item.label}
      >
        {/* Active left edge bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-realm-gold-400 rounded-r" />
        )}
        <Icon className="w-5 h-5" />
        <span className="text-[9px] font-display leading-tight">{item.label}</span>
      </Link>
    );

    const tooltipContent = disabled ? 'Available when in a town' : item.label;

    return (
      <Tooltip key={item.route} content={tooltipContent} position="right">
        {button}
      </Tooltip>
    );
  }

  return (
    <nav
      className={`fixed left-0 top-14 lg:top-16 bottom-0 w-16 bg-realm-bg-800/95 backdrop-blur-sm border-r border-realm-border flex flex-col items-center py-4 gap-1 z-40 ${className ?? ''}`}
    >
      {/* Navigation sections */}
      {NAV_SECTIONS.map((section, sIdx) => (
        <div key={sIdx} className="flex flex-col items-center gap-1">
          {/* Divider between sections */}
          {sIdx > 0 && (
            <div className="w-8 h-px bg-realm-border my-1" />
          )}
          {section.items.map((item) => renderItem(item))}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Admin link */}
      {isAdmin && (
        <Tooltip content="Admin" position="right">
          <Link
            to="/admin"
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors
              ${isActive('/admin')
                ? 'text-realm-gold-400 bg-realm-gold-400/10'
                : 'text-realm-text-muted hover:text-realm-text-primary hover:bg-realm-bg-600'
              }`}
            aria-label="Admin"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[9px] font-display leading-tight">Admin</span>
          </Link>
        </Tooltip>
      )}

      {/* Logout */}
      <Tooltip content="Logout" position="right">
        <button
          onClick={() => logout()}
          className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-realm-danger hover:bg-realm-danger/10 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-display leading-tight">Logout</span>
        </button>
      </Tooltip>
    </nav>
  );
}
