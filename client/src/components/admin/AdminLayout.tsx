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
];

function isNavActive(itemPath: string, currentPath: string, exact?: boolean): boolean {
  if (exact) return currentPath === itemPath;
  return currentPath.startsWith(itemPath);
}

export default function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-dark-500">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-dark-600 border-r border-dark-50 fixed inset-y-0 left-0 z-30">
        {/* Logo / Title */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-dark-50">
          <ShieldCheck className="w-6 h-6 text-primary-400 flex-shrink-0" />
          <div>
            <h1 className="font-display text-primary-400 text-sm leading-tight">Admin Panel</h1>
            <p className="text-parchment-500 text-[10px]">Realm of Crowns</p>
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
                    ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                    : 'text-parchment-300 hover:bg-dark-400 hover:text-parchment-200 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to Game */}
        <div className="p-3 border-t border-dark-50">
          <Link
            to="/town"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-parchment-500 hover:text-parchment-200 hover:bg-dark-400 transition-colors font-display"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Game
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-dark-600/95 border-b border-dark-50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <span className="font-display text-primary-400 text-sm">Admin Panel</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-parchment-300 hover:text-parchment-200"
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
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-dark-600 border-r border-dark-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-dark-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-400" />
                <span className="font-display text-primary-400 text-sm">Admin Panel</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-parchment-500 hover:text-parchment-200"
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
                        ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                        : 'text-parchment-300 hover:bg-dark-400 hover:text-parchment-200 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-dark-50">
              <Link
                to="/town"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-parchment-500 hover:text-parchment-200 hover:bg-dark-400 transition-colors font-display"
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
