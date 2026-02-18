import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Building2,
  Plus,
  Loader2,
  Hammer,
  Package,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api';
import { useBuildingEvents } from '../hooks/useBuildingEvents';
import BuildingCard, { BuildingData } from '../components/housing/BuildingCard';
import BuildingDirectory from '../components/housing/BuildingDirectory';
import ConstructionFlow from '../components/housing/ConstructionFlow';
import BuildingInterior from '../components/housing/BuildingInterior';
import WorkshopView from '../components/housing/WorkshopView';
import ShopView from '../components/housing/ShopView';
import HouseView from '../components/housing/HouseView';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MyBuilding extends BuildingData {
  underConstruction: boolean;
  constructionStatus: string | null;
  completesAt: string | null;
}

interface MyBuildingsResponse {
  buildings: MyBuilding[];
}

type Tab = 'my-home' | 'workshops' | 'town-buildings';

interface MyHouse {
  id: string;
  townId: string;
  townName: string;
  tier: number;
  name: string;
  storageSlots: number;
  storageUsed: number;
  isCurrentTown: boolean;
}

// ---------------------------------------------------------------------------
// Workshop building types (for detecting which detail view to show)
// ---------------------------------------------------------------------------
const WORKSHOP_TYPES = [
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
];

const STORAGE_TYPES = ['HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'WAREHOUSE'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HousingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('my-home');
  const [showConstructionFlow, setShowConstructionFlow] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);
  const [interiorBuildingId, setInteriorBuildingId] = useState<string | null>(null);
  const [workshopBuildingId, setWorkshopBuildingId] = useState<string | null>(null);
  const [workshopIsOwner, setWorkshopIsOwner] = useState(false);
  const [shopBuildingId, setShopBuildingId] = useState<string | null>(null);
  const [shopBuildingName, setShopBuildingName] = useState('');
  const [constructionBuildingId, setConstructionBuildingId] = useState<string | null>(null);

  // Socket events
  useBuildingEvents();

  // Fetch character (for townId, homeTownId, characterId)
  const { data: character } = useQuery<{
    id: string;
    currentTownId?: string;
    homeTownId?: string;
    homeTownName?: string;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const townId = character?.currentTownId ?? '';
  const homeTownId = character?.homeTownId ?? '';
  const homeTownName = character?.homeTownName ?? '';
  const characterId = character?.id ?? '';
  const isHome = !!townId && townId === homeTownId;

  // Fetch my houses (will be 0 or 1)
  const { data: myHousesData, isLoading: housesLoading } = useQuery<{ houses: MyHouse[] }>({
    queryKey: ['houses', 'mine'],
    queryFn: async () => (await api.get('/houses/mine')).data,
  });

  const myHouse = (myHousesData?.houses ?? [])[0] ?? null;

  // House view state
  const [viewHouseId, setViewHouseId] = useState<string | null>(null);
  const [viewHouseIsCurrentTown, setViewHouseIsCurrentTown] = useState(false);

  // Fetch my buildings
  const { data: myBuildingsData, isLoading: myBuildingsLoading } = useQuery<MyBuildingsResponse>({
    queryKey: ['buildings', 'mine'],
    queryFn: async () => {
      const res = await api.get('/buildings/mine');
      return res.data;
    },
  });

  const myBuildings = myBuildingsData?.buildings ?? [];

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (buildingId: string) => {
      const res = await api.post('/buildings/upgrade', { buildingId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
      // Open construction flow for the upgrade
      setConstructionBuildingId(data.upgrade.buildingId);
      setInteriorBuildingId(null);
    },
  });

  // Handle building click
  function handleBuildingClick(building: BuildingData) {
    // If under construction or level 0, open construction flow
    if (building.level === 0 || (building as MyBuilding).underConstruction) {
      setConstructionBuildingId(building.id);
      return;
    }

    const isOwner = building.owner?.id === characterId || !building.owner;

    // Workshop type -> workshop view
    if (WORKSHOP_TYPES.includes(building.type)) {
      setWorkshopBuildingId(building.id);
      setWorkshopIsOwner(isOwner);
      return;
    }

    // Market stall -> shop view
    if (building.type === 'MARKET_STALL') {
      setShopBuildingId(building.id);
      setShopBuildingName(building.name);
      return;
    }

    // Storage types -> interior view
    if (STORAGE_TYPES.includes(building.type) && isOwner) {
      setInteriorBuildingId(building.id);
      return;
    }

    // Fallback: interior view for owned buildings
    if (isOwner) {
      setInteriorBuildingId(building.id);
    }
  }

  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">My Home</h1>
              <p className="text-realm-text-muted text-sm mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {homeTownName || 'Loading...'}
                {isHome && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-realm-success/10 border border-realm-success/30 text-realm-success ml-1">
                    You are here
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              {isHome && (
                <button
                  onClick={() => setShowConstructionFlow(true)}
                  className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Build New
                </button>
              )}
              {townId && (
                <button
                  onClick={() => navigate('/town')}
                  className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
                >
                  Back to Town
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Away from home banner */}
      {character && !isHome && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-realm-warning flex-shrink-0" />
            <p className="text-sm text-realm-warning">
              You are away from home. Physical actions (deposit, withdraw, harvest, build) are unavailable until you return to {homeTownName}.
              Remote actions (list on market) still work.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex border-b border-realm-border mb-6">
          {([
            { key: 'my-home' as Tab, label: 'My Home', icon: Home },
            { key: 'workshops' as Tab, label: 'Workshops', icon: Hammer, count: myBuildings.length },
            { key: 'town-buildings' as Tab, label: 'Town Buildings', icon: Building2 },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                ${activeTab === key
                  ? 'border-realm-gold-400 text-realm-gold-400'
                  : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count != null && count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-display bg-realm-gold-500/20 text-realm-gold-400 rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'my-home' && (
          <MyHomeTab
            house={myHouse}
            isLoading={housesLoading}
            isHome={isHome}
            homeTownName={homeTownName}
            onViewHouse={(h) => { setViewHouseId(h.id); setViewHouseIsCurrentTown(h.isCurrentTown); }}
          />
        )}

        {activeTab === 'workshops' && (
          <MyPropertiesTab
            buildings={myBuildings}
            isLoading={myBuildingsLoading}
            onBuildingClick={handleBuildingClick}
            onBuildNew={() => setShowConstructionFlow(true)}
            hasTown={isHome}
          />
        )}

        {activeTab === 'town-buildings' && (
          townId ? (
            <BuildingDirectory
              townId={townId}
              onSelectBuilding={handleBuildingClick}
            />
          ) : (
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
              <Building2 className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
              <p className="text-realm-text-muted text-sm">
                You are not currently in a town. Travel to a town to view its buildings.
              </p>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {showConstructionFlow && homeTownId && (
        <ConstructionFlow
          townId={homeTownId}
          onClose={() => setShowConstructionFlow(false)}
        />
      )}

      {constructionBuildingId && (
        <ConstructionFlow
          townId={homeTownId || townId}
          existingBuildingId={constructionBuildingId}
          onClose={() => {
            setConstructionBuildingId(null);
            queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
          }}
        />
      )}

      {interiorBuildingId && (
        <BuildingInterior
          buildingId={interiorBuildingId}
          onClose={() => setInteriorBuildingId(null)}
          onUpgrade={() => upgradeMutation.mutate(interiorBuildingId)}
        />
      )}

      {workshopBuildingId && (
        <WorkshopView
          buildingId={workshopBuildingId}
          isOwner={workshopIsOwner}
          onClose={() => setWorkshopBuildingId(null)}
        />
      )}

      {shopBuildingId && (
        <ShopView
          buildingId={shopBuildingId}
          buildingName={shopBuildingName}
          onClose={() => setShopBuildingId(null)}
        />
      )}

      {viewHouseId && (
        <HouseView
          houseId={viewHouseId}
          isCurrentTown={viewHouseIsCurrentTown}
          onClose={() => setViewHouseId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// My Home Tab — single cottage with storage overview
// ---------------------------------------------------------------------------
interface MyHomeTabProps {
  house: MyHouse | null;
  isLoading: boolean;
  isHome: boolean;
  homeTownName: string;
  onViewHouse: (house: MyHouse) => void;
}

function MyHomeTab({ house, isLoading, isHome, homeTownName, onViewHouse }: MyHomeTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <Home className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm mb-2">No house found.</p>
        <p className="text-realm-text-muted text-xs">Your free cottage should have been created automatically. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cottage card */}
      <button
        onClick={() => onViewHouse(house)}
        className="w-full text-left bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg p-6 transition-all hover:border-realm-gold-500/50 hover:bg-realm-bg-700/80"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-realm-gold-400/10 flex items-center justify-center">
            <Home className="w-6 h-6 text-realm-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg text-realm-gold-400">{house.name}</h3>
              <span className="text-[9px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-realm-gold-500/20 text-realm-gold-400">
                Tier {house.tier}
              </span>
            </div>
            <p className="text-xs text-realm-text-muted flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {house.townName}
              {isHome && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-realm-success/10 border border-realm-success/30 text-realm-success ml-1">
                  Here
                </span>
              )}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-realm-text-secondary">
                <Package className="w-4 h-4" />
                Storage: {house.storageUsed}/{house.storageSlots} slots
              </div>
              {/* Progress bar */}
              <div className="flex-1 max-w-[200px] h-1.5 bg-realm-bg-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-realm-gold-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (house.storageUsed / house.storageSlots) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-realm-text-muted mt-3 italic">
          Click to manage storage — {isHome ? 'deposit, withdraw, or list items on the market' : 'list items on the market remotely'}
        </p>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// My Properties Tab (Workshops)
// ---------------------------------------------------------------------------
interface MyPropertiesTabProps {
  buildings: BuildingData[];
  isLoading: boolean;
  onBuildingClick: (building: BuildingData) => void;
  onBuildNew: () => void;
  hasTown: boolean;
}

function MyPropertiesTab({ buildings, isLoading, onBuildingClick, onBuildNew, hasTown }: MyPropertiesTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <Hammer className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm mb-4">You don't own any buildings yet.</p>
        {hasTown && (
          <button
            onClick={onBuildNew}
            className="px-6 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
          >
            Build Your First Property
          </button>
        )}
      </div>
    );
  }

  // Separate under construction vs active
  const active = buildings.filter(b => b.level > 0 && !(b as any).underConstruction);
  const underConstruction = buildings.filter(b => b.level === 0 || (b as any).underConstruction);

  return (
    <div className="space-y-6">
      {/* Under construction */}
      {underConstruction.length > 0 && (
        <div>
          <h3 className="font-display text-sm text-realm-text-muted uppercase tracking-wider mb-3">
            Under Construction ({underConstruction.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {underConstruction.map(b => (
              <BuildingCard key={b.id} building={b} onClick={onBuildingClick} />
            ))}
          </div>
        </div>
      )}

      {/* Active buildings */}
      {active.length > 0 && (
        <div>
          <h3 className="font-display text-sm text-realm-text-muted uppercase tracking-wider mb-3">
            Active Properties ({active.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map(b => (
              <BuildingCard key={b.id} building={b} onClick={onBuildingClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
