import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Store,
  ScrollText,
  Sparkles,
  Map,
  Shield,
  Package,
  Swords,
  Trophy,
  Hammer,
  Building2,
  Truck,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Compass,
  User,
  ChevronUp,
  Users,
  Crown,
  Wrench,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Tooltip from './Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  townOnly?: boolean;
  adminOnly?: boolean;
  badge?: number;
}

interface NavCategory {
  label: string;
  icon: typeof Home;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Primary bar items (always visible in the bottom bar, max 5 + "More")
// ---------------------------------------------------------------------------

/** Returns the primary bar items. Town/Travel is contextual. */
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
// "More" panel categories
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

  // System category — always has Logout; conditionally has Admin
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
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blood-light text-[10px] text-realm-text-primary font-bold px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Navigation component
// ---------------------------------------------------------------------------

export default function Navigation() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "More" when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Close "More" on Escape
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

  // Don't render at all in certain conditions
  if (!isAuthenticated) return null;
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/admin')) return null;

  const primaryItems = getPrimaryItems(isTraveling);
  const moreCategories = getMoreCategories(isAdmin);

  // Check if any "More" item is the active route
  const moreIsActive = moreCategories.some((cat) =>
    cat.items.some((item) => location.pathname === item.path),
  );

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function isActive(path: string): boolean {
    return location.pathname === path;
  }

  function isDisabled(item: NavItem): boolean {
    return !!(isTraveling && item.townOnly);
  }

  /** Render a single item for the primary bottom bar (desktop: icon + label) */
  function renderPrimaryDesktop(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const disabled = isDisabled(item);
    const isTravelItem = item.path === '/travel';

    const content = (
      <Link
        key={item.path}
        to={disabled ? '#' : item.path}
        onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        className={`relative flex flex-col items-center justify-center gap-0.5 px-3 h-full min-w-[56px] transition-colors
          ${active
            ? 'text-realm-gold-400'
            : disabled
              ? 'text-realm-text-muted/30 cursor-not-allowed'
              : 'text-realm-text-secondary hover:text-realm-text-primary'
          }`}
      >
        {/* Active indicator bar */}
        {active && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-realm-gold-500 rounded-b" />
        )}
        <span className="relative">
          <Icon className="w-5 h-5" />
          <Badge count={item.badge} />
          {isTravelItem && isTraveling && !active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-realm-gold-500 animate-pulse" />
          )}
        </span>
        <span className="text-[10px] font-display leading-tight">{item.label}</span>
      </Link>
    );

    if (disabled) {
      return (
        <Tooltip key={item.path} content="Available when in a town" position="top">
          {content}
        </Tooltip>
      );
    }
    return <span key={item.path}>{content}</span>;
  }

  /** Render a single item for the primary bottom bar (mobile: icon only) */
  function renderPrimaryMobile(item: NavItem) {
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
              : 'text-realm-text-secondary hover:text-realm-text-primary'
          }`}
        aria-label={item.label}
      >
        {active && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-realm-gold-500 rounded-b" />
        )}
        <span className="relative">
          <Icon className="w-5 h-5" />
          <Badge count={item.badge} />
          {isTravelItem && isTraveling && !active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-realm-gold-500 animate-pulse" />
          )}
        </span>
      </Link>
    );
  }

  /** Render an item inside the "More" panel */
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
            ? 'bg-realm-gold-500/10 text-realm-gold-400'
            : disabled
              ? 'text-realm-text-muted/30 cursor-not-allowed'
              : 'text-realm-text-secondary hover:bg-realm-bg-800/50 hover:text-realm-text-primary'
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

  /** Render a category section in the "More" panel */
  function renderCategory(category: NavCategory, idx: number) {
    const CatIcon = category.icon;
    return (
      <div key={category.label}>
        {idx > 0 && <div className="h-px bg-realm-bg-600/50 mx-3 my-1" />}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <CatIcon className="w-3.5 h-3.5 text-realm-text-muted/60" />
          <span className="text-[11px] font-display uppercase tracking-wider text-realm-text-muted/60">
            {category.label}
          </span>
        </div>
        <div className="flex flex-col">
          {category.items.map(renderMoreItem)}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Desktop "More" panel (opens upward from the bottom bar)
  // -------------------------------------------------------------------------

  function renderDesktopMorePanel(): ReactNode {
    return (
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed bottom-16 right-4 z-50 w-72 max-h-[70vh] bg-realm-bg-900 border border-realm-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-realm-border">
                <span className="font-display text-realm-gold-400 text-sm">Menu</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="text-realm-text-muted hover:text-realm-text-primary transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable categories */}
              <div className="flex-1 overflow-y-auto py-1">
                {moreCategories.map((cat, idx) => renderCategory(cat, idx))}
              </div>

              {/* Logout — separated at the bottom */}
              <div className="border-t border-realm-border px-4 py-2.5">
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blood-light hover:bg-blood-dark/20 rounded-md transition-colors font-display"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // -------------------------------------------------------------------------
  // Mobile "More" panel (full-screen overlay)
  // -------------------------------------------------------------------------

  function renderMobileMorePanel(): ReactNode {
    return (
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 md:hidden bg-realm-bg-900/98 backdrop-blur-sm flex flex-col"
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

            {/* Logout — separated at the bottom */}
            <div className="border-t border-realm-border px-5 py-4 pb-20">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-blood-light hover:bg-blood-dark/20 rounded-md transition-colors font-display"
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

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Desktop "More" panel */}
      <div className="hidden md:block">
        {renderDesktopMorePanel()}
      </div>

      {/* Mobile "More" panel */}
      {renderMobileMorePanel()}

      {/* Desktop bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-realm-bg-900/95 border-t border-realm-border backdrop-blur-sm hidden md:block">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-center h-14">
          {primaryItems.map((item) => renderPrimaryDesktop(item))}

          {/* Divider before "More" */}
          <div className="w-px h-7 bg-realm-bg-600 mx-1" />

          {/* "More" button */}
          <button
            onClick={toggleMore}
            className={`relative flex flex-col items-center justify-center gap-0.5 px-3 h-full min-w-[56px] transition-colors
              ${moreOpen
                ? 'text-realm-gold-400'
                : moreIsActive
                  ? 'text-realm-gold-400'
                  : 'text-realm-text-secondary hover:text-realm-text-primary'
              }`}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
          >
            {(moreOpen || moreIsActive) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-realm-gold-500 rounded-b" />
            )}
            <span className="relative">
              {moreOpen ? <ChevronUp className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </span>
            <span className="text-[10px] font-display leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-realm-bg-900/95 border-t border-realm-border backdrop-blur-sm md:hidden">
        <div className="flex items-center h-16 safe-area-bottom">
          {primaryItems.map((item) => renderPrimaryMobile(item))}

          {/* "More" button */}
          <button
            onClick={toggleMore}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors
              ${moreOpen
                ? 'text-realm-gold-400'
                : moreIsActive
                  ? 'text-realm-gold-400'
                  : 'text-realm-text-secondary hover:text-realm-text-primary'
              }`}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
          >
            {(moreOpen || moreIsActive) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-realm-gold-500 rounded-b" />
            )}
            <span className="relative">
              {moreOpen ? <ChevronUp className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
