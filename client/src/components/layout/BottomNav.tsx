import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  townOnly?: boolean;
  adminOnly?: boolean;
  badge?: number;
}

interface NavCategory {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Primary items
// ---------------------------------------------------------------------------

function getPrimaryItems(isTraveling: boolean): NavItem[] {
  return [
    isTraveling
      ? { path: '/travel', label: 'Travel', icon: Compass }
      : { path: '/town', label: 'Town', icon: Landmark, townOnly: true },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/combat', label: 'Combat', icon: Swords },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/profile', label: 'Character', icon: User },
  ];
}

// ---------------------------------------------------------------------------
// More categories
// ---------------------------------------------------------------------------

function getMoreCategories(isAdmin: boolean): NavCategory[] {
  const categories: NavCategory[] = [
    {
      label: 'Economy',
      icon: Store,
      items: [
        { path: '/market', label: 'Market', icon: Store, townOnly: true },
        { path: '/trade', label: 'Trade', icon: Truck, townOnly: true },
        { path: '/professions', label: 'Professions', icon: Hammer, townOnly: true },
        { path: '/housing', label: 'Housing', icon: Building2, townOnly: true },
      ],
    },
    {
      label: 'Adventure',
      icon: Swords,
      items: [
        { path: '/quests', label: 'Quests', icon: ScrollText },
        { path: '/combat', label: 'Combat', icon: Swords },
        { path: '/skills', label: 'Skills', icon: Sparkles },
      ],
    },
    {
      label: 'Social',
      icon: Users,
      items: [
        { path: '/guild', label: 'Guild', icon: Shield },
        { path: '/diplomacy', label: 'Diplomacy', icon: Crown },
        { path: '/achievements', label: 'Archive', icon: Trophy },
      ],
    },
  ];

  const systemItems: NavItem[] = [];
  if (isAdmin) {
    systemItems.push({ path: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true });
  }

  if (systemItems.length > 0) {
    categories.push({
      label: 'System',
      icon: Wrench,
      items: systemItems,
    });
  }

  return categories;
}

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------

function Badge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-realm-danger text-[10px] text-realm-text-primary font-bold px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BottomNav component
// ---------------------------------------------------------------------------

export function BottomNav({ className }: { className?: string }) {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close More when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Close More on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    if (moreOpen) {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [moreOpen]);

  // Fetch character data for travel status
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

  const toggleMore = useCallback(() => {
    setMoreOpen((prev) => !prev);
  }, []);

  // Don't render in certain conditions
  if (!isAuthenticated) return null;
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/admin')) return null;

  const primaryItems = getPrimaryItems(isTraveling);
  const moreCategories = getMoreCategories(isAdmin);

  const moreIsActive = moreCategories.some((cat) =>
    cat.items.some((item) => location.pathname === item.path),
  );

  function isActive(path: string): boolean {
    return location.pathname === path;
  }

  function isDisabled(item: NavItem): boolean {
    return !!(isTraveling && item.townOnly);
  }

  // ---------------------------------------------------------------------------
  // Render a primary tab
  // ---------------------------------------------------------------------------

  function renderPrimaryTab(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const disabled = isDisabled(item);
    const isTravelItem = item.path === '/travel';

    return (
      <Link
        key={item.path}
        to={disabled ? '#' : item.path}
        onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors
          ${active
            ? 'text-realm-gold-400'
            : disabled
              ? 'text-realm-text-muted/30 cursor-not-allowed'
              : 'text-realm-text-muted hover:text-realm-text-primary'
          }`}
        aria-label={item.label}
      >
        {/* Active top bar indicator */}
        {active && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-realm-gold-400 rounded-b" />
        )}
        <span className="relative">
          <Icon className="w-5 h-5" />
          <Badge count={item.badge} />
          {/* Travel pulse dot when traveling but not on travel page */}
          {isTravelItem && isTraveling && !active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-realm-gold-400 animate-pulse" />
          )}
        </span>
        <span className="text-[10px] font-display leading-tight mt-0.5">{item.label}</span>
      </Link>
    );
  }

  // ---------------------------------------------------------------------------
  // Render a More panel item
  // ---------------------------------------------------------------------------

  function renderMoreItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const disabled = isDisabled(item);

    return (
      <Link
        key={item.path}
        to={disabled ? '#' : item.path}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          setMoreOpen(false);
        }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors
          ${active
            ? 'bg-realm-gold-400/10 text-realm-gold-400'
            : disabled
              ? 'text-realm-text-muted/30 cursor-not-allowed'
              : 'text-realm-text-primary hover:bg-realm-bg-600 hover:text-realm-gold-400'
          }`}
      >
        <span className="relative">
          <Icon className="w-4 h-4" />
          <Badge count={item.badge} />
        </span>
        <span className="font-display">
          {item.label}
          {disabled && (
            <span className="text-[10px] text-realm-text-muted/30 ml-1.5">(in town only)</span>
          )}
        </span>
      </Link>
    );
  }

  // ---------------------------------------------------------------------------
  // Render a category section
  // ---------------------------------------------------------------------------

  function renderCategory(category: NavCategory, idx: number) {
    const CatIcon = category.icon;
    return (
      <div key={category.label}>
        {idx > 0 && <div className="h-px bg-realm-border mx-3 my-1" />}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <CatIcon className="w-3.5 h-3.5 text-realm-gold-400/60" />
          <span className="text-[11px] font-display uppercase tracking-wider text-realm-gold-400/60">
            {category.label}
          </span>
        </div>
        <div className="flex flex-col">
          {category.items.map(renderMoreItem)}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Mobile More panel (full-screen overlay)
  // ---------------------------------------------------------------------------

  function renderMorePanel() {
    return (
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-realm-bg-800/98 backdrop-blur-sm flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-realm-border">
              <span className="font-display text-realm-gold-400 text-base">Menu</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-realm-text-muted hover:text-realm-text-primary transition-colors p-1"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable categories */}
            <div className="flex-1 overflow-y-auto py-2">
              {moreCategories.map((cat, idx) => renderCategory(cat, idx))}
            </div>

            {/* Logout */}
            <div className="border-t border-realm-border px-5 py-4 pb-20">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-realm-danger hover:bg-realm-danger/10 rounded-md transition-colors font-display"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* More panel overlay */}
      {renderMorePanel()}

      {/* Bottom navigation bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 h-14 bg-realm-bg-800/95 backdrop-blur-sm border-t border-realm-border ${className ?? ''}`}
      >
        <div className="flex items-center h-full safe-area-pb">
          {primaryItems.map((item) => renderPrimaryTab(item))}

          {/* More button */}
          <button
            onClick={toggleMore}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors
              ${moreOpen
                ? 'text-realm-gold-400'
                : moreIsActive
                  ? 'text-realm-gold-300'
                  : 'text-realm-text-muted hover:text-realm-text-primary'
              }`}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
          >
            {(moreOpen || moreIsActive) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-realm-gold-400 rounded-b" />
            )}
            <span className="relative">
              {moreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </span>
            <span className="text-[10px] font-display leading-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
