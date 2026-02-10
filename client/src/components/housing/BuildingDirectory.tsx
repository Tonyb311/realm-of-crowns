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
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Town name */}
      {data?.town && (
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary-400" />
          <h3 className="font-display text-lg text-parchment-200">{data.town.name} Buildings</h3>
          <span className="text-xs text-parchment-500">({allBuildings.length} total)</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none bg-dark-300 border border-dark-50 rounded px-3 py-1.5 text-sm text-parchment-200 pr-8 focus:border-primary-400 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{buildingTypeLabel(t)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-parchment-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Owner filter */}
        {uniqueOwners.length > 0 && (
          <div className="relative">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="appearance-none bg-dark-300 border border-dark-50 rounded px-3 py-1.5 text-sm text-parchment-200 pr-8 focus:border-primary-400 focus:outline-none"
            >
              <option value="">All Owners</option>
              {uniqueOwners.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-parchment-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Workshops toggle */}
        <button
          onClick={() => setShowWorkshopsOnly(!showWorkshopsOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display rounded border transition-colors
            ${showWorkshopsOnly
              ? 'bg-primary-400/20 text-primary-400 border-primary-400/30'
              : 'bg-dark-300 text-parchment-300 border-dark-50 hover:border-primary-400/40'}`}
        >
          <Wrench className="w-3 h-3" />
          Workshops for Rent
        </button>
      </div>

      {/* Building list */}
      {filtered.length === 0 ? (
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
          <Building2 className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
          <p className="text-parchment-500 text-sm">
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
