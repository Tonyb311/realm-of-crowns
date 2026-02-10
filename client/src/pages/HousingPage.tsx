import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Building2,
  Plus,
  Loader2,
  Hammer,
} from 'lucide-react';
import api from '../services/api';
import { useBuildingEvents } from '../hooks/useBuildingEvents';
import BuildingCard, { BuildingData } from '../components/housing/BuildingCard';
import BuildingDirectory from '../components/housing/BuildingDirectory';
import ConstructionFlow from '../components/housing/ConstructionFlow';
import BuildingInterior from '../components/housing/BuildingInterior';
import WorkshopView from '../components/housing/WorkshopView';
import ShopView from '../components/housing/ShopView';

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

type Tab = 'my-properties' | 'town-buildings';

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
  const [activeTab, setActiveTab] = useState<Tab>('my-properties');
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

  // Fetch character (for townId and characterId)
  const { data: character } = useQuery<{ id: string; currentTownId?: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const townId = character?.currentTownId ?? '';
  const characterId = character?.id ?? '';

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
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-primary-400">Housing</h1>
              <p className="text-parchment-500 text-sm mt-1">Build, manage, and upgrade your properties</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConstructionFlow(true)}
                disabled={!townId}
                className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Build New
              </button>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-parchment-500/40 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex border-b border-dark-50 mb-6">
          {([
            { key: 'my-properties' as Tab, label: 'My Properties', icon: Home },
            { key: 'town-buildings' as Tab, label: 'Town Buildings', icon: Building2 },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                ${activeTab === key
                  ? 'border-primary-400 text-primary-400'
                  : 'border-transparent text-parchment-500 hover:text-parchment-300'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'my-properties' && myBuildings.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-display bg-primary-400/20 text-primary-400 rounded-full">
                  {myBuildings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'my-properties' && (
          <MyPropertiesTab
            buildings={myBuildings}
            isLoading={myBuildingsLoading}
            onBuildingClick={handleBuildingClick}
            onBuildNew={() => setShowConstructionFlow(true)}
            hasTown={!!townId}
          />
        )}

        {activeTab === 'town-buildings' && (
          townId ? (
            <BuildingDirectory
              townId={townId}
              onSelectBuilding={handleBuildingClick}
            />
          ) : (
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
              <Building2 className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
              <p className="text-parchment-500 text-sm">
                You are not currently in a town. Travel to a town to view its buildings.
              </p>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {showConstructionFlow && townId && (
        <ConstructionFlow
          townId={townId}
          onClose={() => setShowConstructionFlow(false)}
        />
      )}

      {constructionBuildingId && (
        <ConstructionFlow
          townId={townId}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// My Properties Tab
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
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Hammer className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm mb-4">You don't own any buildings yet.</p>
        {hasTown && (
          <button
            onClick={onBuildNew}
            className="px-6 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
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
          <h3 className="font-display text-sm text-parchment-500 uppercase tracking-wider mb-3">
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
          <h3 className="font-display text-sm text-parchment-500 uppercase tracking-wider mb-3">
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
