import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Swords,
  Hammer,
  Package,
  Globe,
  ScrollText,
  Search,
} from 'lucide-react';
import { RealmInput } from '../components/ui/RealmInput';
import { PageHeader } from '../components/layout/PageHeader';

// Lazy-load codex sections for code splitting
const CodexRaces = lazy(() => import('../components/codex/CodexRaces'));
const CodexClasses = lazy(() => import('../components/codex/CodexClasses'));
const CodexProfessions = lazy(() => import('../components/codex/CodexProfessions'));
const CodexItems = lazy(() => import('../components/codex/CodexItems'));
const CodexWorld = lazy(() => import('../components/codex/CodexWorld'));
const CodexMechanics = lazy(() => import('../components/codex/CodexMechanics'));

const SECTIONS = [
  { id: 'races', label: 'Races', icon: Users, description: '20 playable races' },
  { id: 'classes', label: 'Classes', icon: Swords, description: '7 classes, 21 specs' },
  { id: 'professions', label: 'Professions', icon: Hammer, description: '29 professions' },
  { id: 'items', label: 'Items', icon: Package, description: '288+ items' },
  { id: 'world', label: 'World', icon: Globe, description: 'Regions & towns' },
  { id: 'mechanics', label: 'Mechanics', icon: ScrollText, description: 'Game systems' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-realm-text-muted">
        <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
        <span className="font-body text-sm">Loading section...</span>
      </div>
    </div>
  );
}

export default function CodexPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const activeSection: SectionId = (SECTIONS.find(s => s.id === section)?.id) || 'races';

  function handleSectionChange(id: SectionId) {
    navigate(`/codex/${id}`, { replace: true });
    setSearchQuery('');
  }

  const activeIcon = SECTIONS.find(s => s.id === activeSection)?.icon || BookOpen;
  const ActiveIcon = activeIcon;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-realm-gold-400" />
          <h1 className="font-display text-2xl text-realm-text-gold tracking-wide">Codex</h1>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search the codex..."
            className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:shadow-realm-glow focus:outline-none font-body text-sm transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-realm-text-muted hover:text-realm-text-primary text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Section navigation */}
        <nav className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSectionChange(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-200 whitespace-nowrap text-left min-w-fit
                    ${isActive
                      ? 'bg-realm-gold-400/10 border border-realm-gold-500/30 text-realm-gold-400'
                      : 'text-realm-text-secondary hover:text-realm-text-primary hover:bg-realm-bg-600 border border-transparent'
                    }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-display text-sm">{s.label}</span>
                    <span className="text-[10px] text-realm-text-muted hidden lg:block">{s.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Content area */}
        <main className="flex-1 min-w-0">
          <Suspense fallback={<SectionFallback />}>
            {activeSection === 'races' && <CodexRaces searchQuery={searchQuery} />}
            {activeSection === 'classes' && <CodexClasses searchQuery={searchQuery} />}
            {activeSection === 'professions' && <CodexProfessions searchQuery={searchQuery} />}
            {activeSection === 'items' && <CodexItems searchQuery={searchQuery} />}
            {activeSection === 'world' && <CodexWorld searchQuery={searchQuery} />}
            {activeSection === 'mechanics' && <CodexMechanics searchQuery={searchQuery} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
