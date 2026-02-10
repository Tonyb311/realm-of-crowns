import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Flag,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/town', label: 'Town', icon: Home },
  { path: '/market', label: 'Market', icon: Store },
  { path: '/quests', label: 'Quests', icon: ScrollText },
  { path: '/skills', label: 'Skills', icon: Sparkles },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/combat', label: 'Combat', icon: Swords },
  { path: '/guild', label: 'Guild', icon: Shield },
  { path: '/trade', label: 'Trade', icon: Truck },
  { path: '/housing', label: 'Housing', icon: Building2 },
  { path: '/professions', label: 'Professions', icon: Hammer },
  { path: '/achievements', label: 'Achieve', icon: Trophy },
  { path: '/diplomacy', label: 'Diplomacy', icon: Flag },
];

export default function Navigation() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) return null;

  // Don't show nav on login/register/character creation
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <>
      {/* Desktop bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-600/95 border-t border-dark-50 backdrop-blur-sm hidden md:block">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-center h-12 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display transition-colors ${
                  isActive
                    ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                    : 'text-parchment-500 hover:text-parchment-200 hover:bg-dark-400/50 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-dark-50 mx-1" />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display text-parchment-500 hover:text-blood-light hover:bg-dark-400/50 transition-colors border border-transparent"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 md:hidden w-12 h-12 bg-primary-400 text-dark-500 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-300 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile slide-out nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-dark-500 border-l border-dark-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-50">
              <span className="font-display text-primary-400 text-sm">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-400/10 text-primary-400 border-r-2 border-primary-400'
                        : 'text-parchment-300 hover:bg-dark-400/50 hover:text-parchment-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-display">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-dark-50 p-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blood-light hover:bg-blood-dark/20 rounded transition-colors font-display"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
