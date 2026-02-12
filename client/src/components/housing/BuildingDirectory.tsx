import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, Loader2, Building2, Wrench } from 'lucide-react';
import api from '../../services/api';
import BuildingCard, { BuildingData, buildingTypeLabel } from './BuildingCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TownBuildingData extends BuildingData {
  isWorkshop?: boolean;
  hasStorage?: boolean;
}

interface TownDirectoryResponse {
  town: { id: string; name: string };
  buildings: TownBuildingData[];
}

interface BuildingDirectoryProps {
  townId: string;
  onSelectBuilding?: (building: BuildingData) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BuildingDirectory({ townId, onSelectBuilding }: BuildingDirectoryProps) {
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [showWorkshopsOnly, setShowWorkshopsOnly] = useState(false);

  const { data, isLoading } = useQuery<TownDirectoryResponse>({
    queryKey: ['buildings', 'town', townId],
    queryFn: async () => {
      const res = await api.get(`/buildings/town/${townId}`);
      return res.data;
    },
    enabled: !!townId,
  });

  const allBuildings = data?.buildings ?? [];

  // Unique types and owners for filters
  const uniqueTypes = [...new Set(allBuildings.map(b => b.type))].sort();
  const uniqueOwners = [...new Set(allBuildings.map(b => b.owner?.name).filter(Boolean))].sort();

  // Apply filters
  const filtered = allBuildings.filter(b => {
    if (typeFilter !== 'ALL' && b.type !== typeFilter) return false;
    if (ownerFilter && b.owner?.name !== ownerFilter) return false;
    if (showWorkshopsOnly && !b.isWorkshop) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Town name */}
      {data?.town && (
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-realm-gold-400" />
          <h3 className="font-display text-lg text-realm-text-primary">{data.town.name} Buildings</h3>
          <span className="text-xs text-realm-text-muted">({allBuildings.length} total)</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none bg-realm-bg-700 border border-realm-border rounded px-3 py-1.5 text-sm text-realm-text-primary pr-8 focus:border-realm-gold-500 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{buildingTypeLabel(t)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Owner filter */}
        {uniqueOwners.length > 0 && (
          <div className="relative">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="appearance-none bg-realm-bg-700 border border-realm-border rounded px-3 py-1.5 text-sm text-realm-text-primary pr-8 focus:border-realm-gold-500 focus:outline-none"
            >
              <option value="">All Owners</option>
              {uniqueOwners.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Workshops toggle */}
        <button
          onClick={() => setShowWorkshopsOnly(!showWorkshopsOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display rounded border transition-colors
            ${showWorkshopsOnly
              ? 'bg-realm-gold-500/20 text-realm-gold-400 border-realm-gold-500/30'
              : 'bg-realm-bg-700 text-realm-text-secondary border-realm-border hover:border-realm-gold-500/40'}`}
        >
          <Wrench className="w-3 h-3" />
          Workshops for Rent
        </button>
      </div>

      {/* Building list */}
      {filtered.length === 0 ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
          <Building2 className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
          <p className="text-realm-text-muted text-sm">
            {showWorkshopsOnly ? 'No workshops available for rent.' : 'No buildings found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(b => (
            <BuildingCard
              key={b.id}
              building={b}
              onClick={onSelectBuilding}
              showOwner
            />
          ))}
        </div>
      )}
    </div>
  );
}
