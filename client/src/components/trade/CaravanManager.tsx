import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Loader2,
  Truck,
  MapPin,
  Shield,
  FileText,
  ChevronLeft,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import CaravanCard, { CaravanData } from './CaravanCard';
import CargoLoader from './CargoLoader';
import AmbushEvent from './AmbushEvent';
import {
  CARAVAN_TYPES,
  ESCORT_TYPES,
  INSURANCE_OPTIONS,
  CaravanType,
  EscortType,
  InsuranceCoverage,
} from '@shared/data/caravans/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Town {
  id: string;
  name: string;
}

interface TravelRoute {
  id: string;
  fromTown: Town;
  toTown: Town;
  distance: number;
  dangerLevel: number;
}

type ManagerView = 'list' | 'create' | 'detail';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CaravanManager() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ManagerView>('list');
  const [selectedCaravan, setSelectedCaravan] = useState<CaravanData | null>(null);
  const [ambushCaravanId, setAmbushCaravanId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Create flow state
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedCaravanType, setSelectedCaravanType] = useState<CaravanType>('HANDCART');

  // Fetch character for current town
  const { data: character } = useQuery<{ id: string; currentTownId?: string; gold: number }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  // Fetch my caravans
  const { data: caravansData, isLoading: caravansLoading } = useQuery<{ caravans: CaravanData[] }>({
    queryKey: ['caravans', 'mine'],
    queryFn: async () => {
      const res = await api.get('/caravans/mine');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s for progress updates
  });

  // Fetch available routes from current town
  const { data: routesData } = useQuery<{ routes: TravelRoute[] }>({
    queryKey: ['travel-routes', character?.currentTownId],
    queryFn: async () => {
      const res = await api.get(`/travel/routes?fromTownId=${character!.currentTownId}`);
      return res.data;
    },
    enabled: !!character?.currentTownId,
  });

  const caravans = caravansData?.caravans ?? [];
  const routes = routesData?.routes ?? [];
  const currentTownId = character?.currentTownId ?? '';

  // Categorize caravans
  const pendingCaravans = caravans.filter(c => c.status === 'PENDING');
  const inTransitCaravans = caravans.filter(c => c.status === 'IN_PROGRESS');
  const ambushedCaravans = caravans.filter(c => c.status === 'FAILED');
  const completedCaravans = caravans.filter(c => c.status === 'COMPLETED');

  // Create caravan mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/caravans/create', {
        fromTownId: currentTownId,
        toTownId: selectedDestination,
        caravanType: selectedCaravanType,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      // Go to detail view for the new caravan
      setSelectedCaravan({
        ...data.caravan,
        totalItems: 0,
        escort: null,
        insurance: null,
        departedAt: null,
        arrivesAt: null,
        progress: 0,
      });
      setView('detail');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to create caravan');
    },
  });

  // Depart mutation
  const departMutation = useMutation({
    mutationFn: async (caravanId: string) => {
      const res = await api.post(`/caravans/${caravanId}/depart`);
      return res.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setView('list');
      setSelectedCaravan(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to depart');
    },
  });

  // Collect mutation
  const collectMutation = useMutation({
    mutationFn: async (caravanId: string) => {
      const res = await api.post(`/caravans/${caravanId}/collect`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  // Hire escort mutation
  const hireEscortMutation = useMutation({
    mutationFn: async ({ caravanId, escortType }: { caravanId: string; escortType: EscortType }) => {
      const res = await api.post(`/caravans/${caravanId}/hire-escort`, { escortType });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to hire escort');
    },
  });

  // Insure mutation
  const insureMutation = useMutation({
    mutationFn: async ({ caravanId, coverage }: { caravanId: string; coverage: InsuranceCoverage }) => {
      const res = await api.post(`/caravans/${caravanId}/insure`, { coverage });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to insure caravan');
    },
  });

  // ---------------------------------------------------------------------------
  // Renders
  // ---------------------------------------------------------------------------

  if (ambushCaravanId) {
    return (
      <AmbushEvent
        caravanId={ambushCaravanId}
        onClose={() => setAmbushCaravanId(null)}
      />
    );
  }

  // Detail view for a specific pending caravan (cargo loading, escorts, insurance, depart)
  if (view === 'detail' && selectedCaravan) {
    const typeDef = CARAVAN_TYPES[selectedCaravan.caravanType as CaravanType] ?? CARAVAN_TYPES.HANDCART;

    return (
      <div className="space-y-6">
        <button
          onClick={() => { setView('list'); setSelectedCaravan(null); setError(''); }}
          className="flex items-center gap-1 text-realm-text-muted hover:text-realm-text-secondary text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to caravans
        </button>

        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-5 h-5 text-realm-gold-400" />
            <div>
              <h3 className="font-display text-realm-text-primary">{typeDef.name}</h3>
              <p className="text-realm-text-muted text-xs">
                {selectedCaravan.from.name} → {selectedCaravan.to.name}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-realm-danger text-xs bg-realm-danger/10 border border-realm-danger/20 rounded px-3 py-2 mb-4">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Cargo loader */}
          {selectedCaravan.status === 'PENDING' && (
            <>
              <CargoLoader
                caravanId={selectedCaravan.id}
                capacity={typeDef.capacity}
                currentCargo={selectedCaravan.cargo}
                currentTotalItems={selectedCaravan.totalItems}
                onCargoUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
                }}
              />

              {/* Escort hire */}
              <div className="mt-6">
                <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Hire Escort
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.values(ESCORT_TYPES)).map(escort => (
                    <button
                      key={escort.type}
                      onClick={() => hireEscortMutation.mutate({ caravanId: selectedCaravan.id, escortType: escort.type })}
                      disabled={hireEscortMutation.isPending || selectedCaravan.escort === escort.type}
                      className={`text-left bg-realm-bg-800 border rounded-lg p-3 transition-all ${
                        selectedCaravan.escort === escort.type
                          ? 'border-realm-gold-500/50 bg-realm-gold-500/5'
                          : 'border-realm-border hover:border-realm-gold-500/30'
                      } disabled:opacity-50`}
                    >
                      <p className="font-display text-realm-text-primary text-xs">{escort.name}</p>
                      <p className="text-realm-text-muted text-[10px]">
                        {escort.cost}g &middot; +{escort.safetyBonus}% safety
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div className="mt-6">
                <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Insurance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.values(INSURANCE_OPTIONS)).map(ins => (
                    <button
                      key={ins.coverage}
                      onClick={() => insureMutation.mutate({ caravanId: selectedCaravan.id, coverage: ins.coverage })}
                      disabled={insureMutation.isPending || selectedCaravan.insurance === ins.coverage || selectedCaravan.totalItems === 0}
                      className={`text-left bg-realm-bg-800 border rounded-lg p-3 transition-all ${
                        selectedCaravan.insurance === ins.coverage
                          ? 'border-realm-gold-500/50 bg-realm-gold-500/5'
                          : 'border-realm-border hover:border-realm-gold-500/30'
                      } disabled:opacity-50`}
                    >
                      <p className="font-display text-realm-text-primary text-xs">{ins.name}</p>
                      <p className="text-realm-text-muted text-[10px]">
                        {Math.round(ins.premiumRate * 100)}% premium &middot; {Math.round(ins.payoutRate * 100)}% payout
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Depart button */}
              <div className="mt-6 pt-4 border-t border-realm-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-realm-text-muted">
                    <p>Caravan cost: <span className="text-realm-gold-400">{typeDef.cost}g</span></p>
                    <p>Travel speed: {typeDef.speedMultiplier}x</p>
                  </div>
                </div>
                <button
                  onClick={() => departMutation.mutate(selectedCaravan.id)}
                  disabled={departMutation.isPending || selectedCaravan.totalItems === 0}
                  className="w-full px-4 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {departMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                  Depart ({typeDef.cost}g)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Create flow
  if (view === 'create') {
    const selectedType = CARAVAN_TYPES[selectedCaravanType];

    return (
      <div className="space-y-6">
        <button
          onClick={() => { setView('list'); setError(''); }}
          className="flex items-center gap-1 text-realm-text-muted hover:text-realm-text-secondary text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to caravans
        </button>

        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
          <h3 className="font-display text-realm-text-primary mb-4">New Caravan</h3>

          {error && (
            <div className="flex items-center gap-2 text-realm-danger text-xs bg-realm-danger/10 border border-realm-danger/20 rounded px-3 py-2 mb-4">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Destination */}
          <div className="mb-4">
            <label className="block font-display text-xs text-realm-text-secondary uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Destination
            </label>
            {routes.length === 0 ? (
              <p className="text-realm-text-muted text-xs">No routes available from your current town.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {routes.map(route => {
                  const dest = route.fromTown.id === currentTownId ? route.toTown : route.fromTown;
                  return (
                    <button
                      key={route.id}
                      onClick={() => setSelectedDestination(dest.id)}
                      className={`text-left bg-realm-bg-800 border rounded-lg p-3 transition-all ${
                        selectedDestination === dest.id
                          ? 'border-realm-gold-500/50 bg-realm-gold-500/5'
                          : 'border-realm-border hover:border-realm-gold-500/30'
                      }`}
                    >
                      <p className="font-display text-realm-text-primary text-xs">{dest.name}</p>
                      <p className="text-realm-text-muted text-[10px]">
                        Distance: {route.distance} &middot; Danger: {route.dangerLevel}/10
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caravan type */}
          <div className="mb-4">
            <label className="block font-display text-xs text-realm-text-secondary uppercase tracking-wider mb-2">
              <Truck className="w-3.5 h-3.5 inline mr-1" />
              Caravan Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.values(CARAVAN_TYPES)).map(typeDef => (
                <button
                  key={typeDef.type}
                  onClick={() => setSelectedCaravanType(typeDef.type)}
                  className={`text-left bg-realm-bg-800 border rounded-lg p-3 transition-all ${
                    selectedCaravanType === typeDef.type
                      ? 'border-realm-gold-500/50 bg-realm-gold-500/5'
                      : 'border-realm-border hover:border-realm-gold-500/30'
                  }`}
                >
                  <p className="font-display text-realm-text-primary text-xs">{typeDef.name}</p>
                  <p className="text-realm-text-muted text-[10px]">
                    {typeDef.capacity} slots &middot; {typeDef.cost}g &middot; {typeDef.speedMultiplier}x speed
                  </p>
                  {typeDef.merchantLevelRequired > 0 && (
                    <p className="text-realm-gold-400/80 text-[10px]">
                      Requires Merchant Lv.{typeDef.merchantLevelRequired}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Summary + Create */}
          <div className="pt-4 border-t border-realm-border">
            <div className="flex items-center justify-between text-xs text-realm-text-muted mb-3">
              <span>Capacity: {selectedType.capacity} slots</span>
              <span>Cost on depart: <span className="text-realm-gold-400">{selectedType.cost}g</span></span>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !selectedDestination}
              className="w-full px-4 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Caravan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: list view
  return (
    <div className="space-y-6">
      {/* Header + New button */}
      <div className="flex items-center justify-between">
        <p className="text-realm-text-muted text-sm">
          {caravans.length === 0 ? 'No caravans yet. Create one to start trading!' : `${caravans.length} caravan(s)`}
        </p>
        <button
          onClick={() => { setView('create'); setError(''); setSelectedDestination(''); }}
          disabled={!currentTownId}
          className="px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Caravan
        </button>
      </div>

      {caravansLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Ambushed */}
          {ambushedCaravans.length > 0 && (
            <div>
              <h3 className="font-display text-sm text-realm-danger uppercase tracking-wider mb-3">
                Ambushed ({ambushedCaravans.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ambushedCaravans.map(c => (
                  <CaravanCard
                    key={c.id}
                    caravan={c}
                    onResolveAmbush={(id) => setAmbushCaravanId(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending (loading) */}
          {pendingCaravans.length > 0 && (
            <div>
              <h3 className="font-display text-sm text-realm-text-muted uppercase tracking-wider mb-3">
                Loading ({pendingCaravans.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingCaravans.map(c => (
                  <CaravanCard
                    key={c.id}
                    caravan={c}
                    onClick={(caravan) => { setSelectedCaravan(caravan); setView('detail'); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In transit */}
          {inTransitCaravans.length > 0 && (
            <div>
              <h3 className="font-display text-sm text-realm-text-muted uppercase tracking-wider mb-3">
                In Transit ({inTransitCaravans.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inTransitCaravans.map(c => (
                  <CaravanCard
                    key={c.id}
                    caravan={c}
                    onCollect={(id) => collectMutation.mutate(id)}
                    isCollecting={collectMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedCaravans.length > 0 && (
            <div>
              <h3 className="font-display text-sm text-realm-text-muted uppercase tracking-wider mb-3">
                Completed ({completedCaravans.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedCaravans.map(c => (
                  <CaravanCard key={c.id} caravan={c} />
                ))}
              </div>
            </div>
          )}

          {caravans.length === 0 && (
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
              <Truck className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
              <p className="text-realm-text-muted text-sm mb-4">
                No caravans yet. Create your first caravan to start trading between towns!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
