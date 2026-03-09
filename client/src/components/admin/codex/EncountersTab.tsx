import { useState, useMemo } from 'react';
import { Search, Users, MapPin, Layers } from 'lucide-react';
import { ENCOUNTER_TEMPLATES, type EncounterTemplate } from '@shared/data/encounter-templates';

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

const FAMILY_COLORS: Record<string, string> = {
  wolves: 'bg-gray-500/20 text-gray-300',
  goblins: 'bg-green-500/20 text-green-300',
  bandits: 'bg-amber-500/20 text-amber-300',
  undead: 'bg-purple-500/20 text-purple-300',
  beasts: 'bg-emerald-500/20 text-emerald-300',
  elementals: 'bg-cyan-500/20 text-cyan-300',
  fey: 'bg-pink-500/20 text-pink-300',
  desert: 'bg-yellow-500/20 text-yellow-300',
  aquatic: 'bg-blue-500/20 text-blue-300',
  insects: 'bg-orange-500/20 text-orange-300',
};

const BIOME_COLORS: Record<string, string> = {
  FOREST: 'bg-green-500/20 text-green-300',
  TUNDRA: 'bg-sky-500/20 text-sky-300',
  HILLS: 'bg-amber-500/20 text-amber-300',
  BADLANDS: 'bg-orange-500/20 text-orange-300',
  PLAINS: 'bg-lime-500/20 text-lime-300',
  SWAMP: 'bg-emerald-500/20 text-emerald-300',
  UNDERGROUND: 'bg-gray-500/20 text-gray-300',
  MOUNTAIN: 'bg-slate-500/20 text-slate-300',
  VOLCANIC: 'bg-red-500/20 text-red-300',
  COASTAL: 'bg-blue-500/20 text-blue-300',
  FEYWILD: 'bg-pink-500/20 text-pink-300',
  DESERT: 'bg-yellow-500/20 text-yellow-300',
  RIVER: 'bg-cyan-500/20 text-cyan-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllFamilies(): string[] {
  return [...new Set(ENCOUNTER_TEMPLATES.map(t => t.family))].sort();
}

function getAllBiomes(): string[] {
  return [...new Set(ENCOUNTER_TEMPLATES.flatMap(t => t.biomes))].sort();
}

function formatComposition(template: EncounterTemplate): string {
  return template.composition
    .map(c => {
      const scale = c.statScale && c.statScale < 1 ? ` (${c.statScale}x)` : '';
      return `${c.count}x ${c.monsterName}${scale}`;
    })
    .join(' + ');
}

// Level tier buckets for coverage grid
const LEVEL_TIERS = [
  { label: 'L1-3', min: 1, max: 3 },
  { label: 'L4-6', min: 4, max: 6 },
  { label: 'L7-9', min: 7, max: 9 },
];

function templateCovers(t: EncounterTemplate, biome: string, tier: { min: number; max: number }): boolean {
  return t.biomes.includes(biome as any) && t.levelRange.min <= tier.max && t.levelRange.max >= tier.min;
}

// ---------------------------------------------------------------------------
// Coverage Grid
// ---------------------------------------------------------------------------

function CoverageGrid() {
  const biomes = getAllBiomes();

  return (
    <div className="bg-realm-bg-800 rounded-lg p-4 border border-realm-border/30">
      <h3 className="text-sm font-display text-realm-gold-400 mb-3 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Coverage Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-realm-text-muted font-display">Biome</th>
              {LEVEL_TIERS.map(t => (
                <th key={t.label} className="text-center py-1 px-3 text-realm-text-muted font-display">{t.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {biomes.map(biome => (
              <tr key={biome} className="border-t border-realm-border/10">
                <td className="py-1.5 pr-4 text-realm-text-secondary">{biome}</td>
                {LEVEL_TIERS.map(tier => {
                  const count = ENCOUNTER_TEMPLATES.filter(t => templateCovers(t, biome, tier)).length;
                  const color = count === 0
                    ? 'text-red-400 bg-red-500/10'
                    : count <= 2
                    ? 'text-yellow-400 bg-yellow-500/10'
                    : 'text-green-400 bg-green-500/10';
                  return (
                    <td key={tier.label} className={`text-center py-1.5 px-3 rounded-sm ${color}`}>
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({ template }: { template: EncounterTemplate }) {
  return (
    <div className="bg-realm-bg-800/80 border border-realm-border/40 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="font-display text-sm text-realm-text-primary font-semibold">{template.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-sm ${FAMILY_COLORS[template.family] || 'bg-gray-500/20 text-gray-300'}`}>
          {template.family}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-sm bg-realm-bg-700/60 text-realm-text-secondary">
          L{template.levelRange.min}-{template.levelRange.max}
        </span>
        {template.soloAppropriate && (
          <span className="text-xs px-2 py-0.5 rounded-sm bg-green-500/15 text-green-400">Solo</span>
        )}
        <span className="text-[10px] text-realm-text-muted ml-auto" title="Encounter weight (higher = more common)">
          W:{template.weight}
        </span>
      </div>

      <p className="text-xs text-realm-text-secondary italic mb-2">{template.description}</p>

      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <Users className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        <span className="text-xs text-realm-text-primary">{formatComposition(template)}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <MapPin className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        {template.biomes.map(b => (
          <span key={b} className={`text-[10px] px-1.5 py-0.5 rounded-sm ${BIOME_COLORS[b] || 'bg-gray-500/20 text-gray-300'}`}>
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EncountersTab
// ---------------------------------------------------------------------------

export default function EncountersTab() {
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('All');
  const [biomeFilter, setBiomeFilter] = useState('All');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [soloOnly, setSoloOnly] = useState(false);

  const families = useMemo(() => getAllFamilies(), []);
  const biomes = useMemo(() => getAllBiomes(), []);

  const filtered = useMemo(() => {
    return ENCOUNTER_TEMPLATES.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = t.name.toLowerCase().includes(q);
        const familyMatch = t.family.toLowerCase().includes(q);
        const descMatch = t.description.toLowerCase().includes(q);
        const monsterMatch = t.composition.some(c => c.monsterName.toLowerCase().includes(q));
        if (!nameMatch && !familyMatch && !descMatch && !monsterMatch) return false;
      }
      if (familyFilter !== 'All' && t.family !== familyFilter) return false;
      if (biomeFilter !== 'All' && !t.biomes.includes(biomeFilter as any)) return false;
      if (levelMin && t.levelRange.max < parseInt(levelMin)) return false;
      if (levelMax && t.levelRange.min > parseInt(levelMax)) return false;
      if (soloOnly && !t.soloAppropriate) return false;
      return true;
    });
  }, [search, familyFilter, biomeFilter, levelMin, levelMax, soloOnly]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display text-realm-gold-400">Encounter Templates</h2>
        <p className="text-realm-text-muted text-sm mt-1">
          {ENCOUNTER_TEMPLATES.length} templates across {families.length} families
        </p>
      </div>

      {/* Coverage Grid */}
      <CoverageGrid />

      {/* Filters */}
      <div className="bg-realm-bg-800 rounded-lg p-4 border border-realm-border/30 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
            <input
              type="text"
              placeholder="Search name, family, monster..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
          </div>

          <select
            value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Families</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={biomeFilter} onChange={e => setBiomeFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Biomes</option>
            {biomes.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="number" min="1" max="50" placeholder="Min Lv"
              value={levelMin} onChange={e => setLevelMin(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
            <span className="text-realm-text-muted">-</span>
            <input
              type="number" min="1" max="50" placeholder="Max Lv"
              value={levelMax} onChange={e => setLevelMax(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloOnly}
              onChange={e => setSoloOnly(e.target.checked)}
              className="accent-realm-gold-400"
            />
            <span className="text-xs text-realm-text-secondary">Solo only</span>
          </label>
        </div>

        <div className="text-xs text-realm-text-muted">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Template List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-realm-text-muted">
          No encounter templates match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => <TemplateCard key={t.id} template={t} />)}
        </div>
      )}
    </div>
  );
}
