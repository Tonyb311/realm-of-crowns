import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  UserCog,
  Globe,
  Coins,
  Wrench,
  AlertCircle,
  Bot,
  Layers,
  ArrowLeft,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/characters', label: 'Characters', icon: UserCog },
  { path: '/admin/world', label: 'World', icon: Globe },
  { path: '/admin/economy', label: 'Economy', icon: Coins },
  { path: '/admin/tools', label: 'Tools', icon: Wrench },
  { path: '/admin/error-logs', label: 'Error Logs', icon: AlertCircle },
  { path: '/admin/simulation', label: 'Simulation', icon: Bot },
  { path: '/admin/content-release', label: 'Content Release', icon: Layers },
];

function isNavActive(itemPath: string, currentPath: string, exact?: boolean): boolean {
  if (exact) return currentPath === itemPath;
  return currentPath.startsWith(itemPath);
}

export default function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-realm-bg-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-realm-bg-900 border-r border-realm-border fixed inset-y-0 left-0 z-30">
        {/* Logo / Title */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-realm-border">
          <ShieldCheck className="w-6 h-6 text-realm-gold-400 flex-shrink-0" />
          <div>
            <h1 className="font-display text-realm-gold-400 text-sm leading-tight">Admin Panel</h1>
            <p className="text-realm-text-muted text-[10px]">Realm of Crowns</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.path, location.pathname, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display transition-colors ${
                  active
                    ? 'bg-realm-gold-500/15 text-realm-gold-400 border border-realm-gold-500/30'
                    : 'text-realm-text-secondary hover:bg-realm-bg-800 hover:text-realm-text-primary border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to Game */}
        <div className="p-3 border-t border-realm-border">
          <Link
            to="/town"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-realm-text-muted hover:text-realm-text-primary hover:bg-realm-bg-800 transition-colors font-display"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Game
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-realm-bg-900/95 border-b border-realm-border backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-realm-gold-400" />
            <span className="font-display text-realm-gold-400 text-sm">Admin Panel</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-realm-text-secondary hover:text-realm-text-primary"
            aria-label="Open admin navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-realm-bg-900 border-r border-realm-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-realm-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-realm-gold-400" />
                <span className="font-display text-realm-gold-400 text-sm">Admin Panel</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-realm-text-muted hover:text-realm-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.path, location.pathname, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display transition-colors ${
                      active
                        ? 'bg-realm-gold-500/15 text-realm-gold-400 border border-realm-gold-500/30'
                        : 'text-realm-text-secondary hover:bg-realm-bg-800 hover:text-realm-text-primary border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-realm-border">
              <Link
                to="/town"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-realm-text-muted hover:text-realm-text-primary hover:bg-realm-bg-800 transition-colors font-display"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Game
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-56 mt-12 md:mt-0 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
