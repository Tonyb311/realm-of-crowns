import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Beer, Coins, ChevronRight, Store, Loader2, User, ShoppingCart, Star, Users, LogIn, LogOut } from 'lucide-react';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, PageHeader } from '../components/ui/realm-index';
import GoldAmount from '../components/shared/GoldAmount';
import { getSocket } from '../services/socket';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InnOwner {
  id: string;
  name: string;
}

interface InnSummary {
  id: string;
  name: string;
  level: number;
  owner: InnOwner;
  menuItemCount: number;
  patronCount: number;
}

interface MenuItem {
  itemTemplateId: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  isFood: boolean;
  isBeverage: boolean;
  foodBuff: unknown;
  price: number;
  quantity: number;
  weight: number;
}

interface InnMenuResponse {
  inn: {
    id: string;
    name: string;
    level: number;
    owner: InnOwner;
  };
  menu: MenuItem[];
}

interface BuyResult {
  purchased: {
    itemTemplateId: string;
    itemName: string;
    quantity: number;
    totalPrice: number;
    ownerShare: number;
    townTaxCut: number;
  };
  gold: number;
  weightState: unknown;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TavernPage() {
  const queryClient = useQueryClient();
  const [selectedInnId, setSelectedInnId] = useState<string | null>(null);
  const [lastBuy, setLastBuy] = useState<{ name: string; price: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch character for current town + gold + check-in state
  const { data: character } = useQuery<{
    id: string;
    name: string;
    gold: number;
    currentTownId: string | null;
    checkedInInnId: string | null;
    checkedInInnName: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;
  const gold = character?.gold ?? 0;
  const checkedInInnId = character?.checkedInInnId ?? null;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch inns in town
  const {
    data: innsData,
    isLoading: innsLoading,
  } = useQuery<{ inns: InnSummary[] }>({
    queryKey: ['inns', 'town', townId],
    queryFn: async () => (await api.get(`/inn/town/${townId}`)).data,
    enabled: !!townId,
  });

  // Fetch selected inn menu
  const {
    data: menuData,
    isLoading: menuLoading,
  } = useQuery<InnMenuResponse>({
    queryKey: ['inn', selectedInnId, 'menu'],
    queryFn: async () => (await api.get(`/inn/${selectedInnId}/menu`)).data,
    enabled: !!selectedInnId,
  });

  // Listen for real-time patron updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePatronUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['inns', 'town', townId] });
    };

    socket.on('inn:patronUpdate', handlePatronUpdate);
    return () => { socket.off('inn:patronUpdate', handlePatronUpdate); };
  }, [townId, queryClient]);

  // Buy mutation
  const buyMutation = useMutation({
    mutationFn: async ({ buildingId, itemTemplateId, quantity }: { buildingId: string; itemTemplateId: string; quantity: number }) => {
      const res = await api.post(`/inn/${buildingId}/menu/buy`, { itemTemplateId, quantity });
      return res.data as BuyResult;
    },
    onSuccess: (data) => {
      setLastBuy({ name: data.purchased.itemName, price: data.purchased.totalPrice });
      queryClient.invalidateQueries({ queryKey: ['inn', selectedInnId, 'menu'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inns', 'town', townId] });
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (buildingId: string) => {
      const res = await api.post(`/inn/${buildingId}/check-in`);
      return res.data;
    },
    onSuccess: (data) => {
      setToast(data.message);
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inns', 'town', townId] });
    },
    onError: (err: any) => {
      setToast(err.response?.data?.error ?? 'Failed to check in');
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/inn/check-out');
      return res.data;
    },
    onSuccess: (data) => {
      setToast(data.message);
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inns', 'town', townId] });
    },
    onError: (err: any) => {
      setToast(err.response?.data?.error ?? 'Failed to check out');
    },
  });

  const inns = innsData?.inns ?? [];
  const townName = town?.name ?? 'this town';

  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Tavern" />
        <RealmPanel title="Tavern">
          <p className="text-xs text-realm-text-muted">You must be in a town to visit the tavern.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Tavern \u2014 ${townName}`} />

      {/* Toasts */}
      {lastBuy && (
        <div className="bg-realm-success/10 border border-realm-success/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-realm-success">
            <Beer className="w-4 h-4" />
            <span>Purchased <strong>{lastBuy.name}</strong> for <GoldAmount amount={lastBuy.price} />!</span>
          </div>
          <button
            onClick={() => setLastBuy(null)}
            className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {toast && (
        <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-realm-gold-400">
            <Beer className="w-4 h-4" />
            <span>{toast}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gold display */}
      <div className="flex items-center gap-2 text-xs text-realm-text-secondary">
        <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
        <span>Your gold: <GoldAmount amount={gold} /></span>
      </div>

      {/* Inn directory or selected inn menu */}
      {selectedInnId ? (
        <InnMenu
          data={menuData}
          isLoading={menuLoading}
          gold={gold}
          checkedInInnId={checkedInInnId}
          onBack={() => setSelectedInnId(null)}
          onBuy={(itemTemplateId) =>
            buyMutation.mutate({ buildingId: selectedInnId, itemTemplateId, quantity: 1 })
          }
          buyPending={buyMutation.isPending}
          buyError={buyMutation.isError ? ((buyMutation.error as any)?.response?.data?.error || 'Failed to purchase.') : null}
          onCheckIn={() => checkInMutation.mutate(selectedInnId)}
          onCheckOut={() => checkOutMutation.mutate()}
          checkInPending={checkInMutation.isPending || checkOutMutation.isPending}
        />
      ) : (
        <InnDirectory
          inns={inns}
          isLoading={innsLoading}
          checkedInInnId={checkedInInnId}
          onSelectInn={(id) => setSelectedInnId(id)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inn Directory — list of taverns in town
// ---------------------------------------------------------------------------
interface InnDirectoryProps {
  inns: InnSummary[];
  isLoading: boolean;
  checkedInInnId: string | null;
  onSelectInn: (id: string) => void;
}

function InnDirectory({ inns, isLoading, checkedInInnId, onSelectInn }: InnDirectoryProps) {
  if (isLoading) {
    return (
      <RealmPanel title="Taverns">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        </div>
      </RealmPanel>
    );
  }

  if (inns.length === 0) {
    return (
      <RealmPanel title="Taverns">
        <div className="text-center py-8">
          <Store className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-realm-text-muted">No taverns have been established yet.</p>
          <p className="text-xs text-realm-text-muted mt-1">An Innkeeper must build an INN in this town first.</p>
        </div>
      </RealmPanel>
    );
  }

  return (
    <RealmPanel title="Taverns" className="relative">
      <div className="absolute top-3 right-5">
        <RealmBadge variant="default">{inns.length}</RealmBadge>
      </div>

      <div className="space-y-2">
        {inns.map((inn) => {
          const isHere = checkedInInnId === inn.id;
          return (
            <button
              key={inn.id}
              onClick={() => onSelectInn(inn.id)}
              className={`w-full text-left bg-realm-bg-800 border rounded-lg p-4 transition-colors ${
                isHere
                  ? 'border-realm-success/40 bg-realm-success/5'
                  : 'border-realm-bg-600 hover:border-realm-gold-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Beer className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                    <span className="text-sm font-display text-realm-text-primary">{inn.name}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: inn.level }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-realm-gold-400 fill-realm-gold-400" />
                      ))}
                    </div>
                    {isHere && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-realm-success/10 border border-realm-success/30 text-realm-success">
                        You're here
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <User className="w-3 h-3 text-realm-text-muted" />
                    <span className="text-realm-text-muted">{inn.owner.name}</span>
                    <span className="text-realm-text-muted">&middot;</span>
                    <span className="text-realm-text-muted">
                      {inn.menuItemCount} {inn.menuItemCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-realm-text-muted">&middot;</span>
                    <Users className="w-3 h-3 text-realm-text-muted" />
                    <span className="text-realm-text-muted">
                      {inn.patronCount > 0 ? `${inn.patronCount} ${inn.patronCount === 1 ? 'patron' : 'patrons'}` : 'Empty'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </RealmPanel>
  );
}

// ---------------------------------------------------------------------------
// Inn Menu — view + buy + check-in/out
// ---------------------------------------------------------------------------
interface InnMenuProps {
  data: InnMenuResponse | undefined;
  isLoading: boolean;
  gold: number;
  checkedInInnId: string | null;
  onBack: () => void;
  onBuy: (itemTemplateId: string) => void;
  buyPending: boolean;
  buyError: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  checkInPending: boolean;
}

function InnMenu({ data, isLoading, gold, checkedInInnId, onBack, onBuy, buyPending, buyError, onCheckIn, onCheckOut, checkInPending }: InnMenuProps) {
  if (isLoading || !data) {
    return (
      <RealmPanel title="Menu">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        </div>
      </RealmPanel>
    );
  }

  const { inn, menu } = data;
  const isCheckedInHere = checkedInInnId === inn.id;
  const isCheckedInElsewhere = !!checkedInInnId && checkedInInnId !== inn.id;

  return (
    <div className="space-y-3">
      {/* Back + inn header */}
      <button
        onClick={onBack}
        className="text-xs text-realm-text-muted hover:text-realm-gold-400 transition-colors flex items-center gap-1"
      >
        <ChevronRight className="w-3 h-3 rotate-180" />
        Back to tavern list
      </button>

      <RealmPanel title={inn.name} className="relative">
        <div className="absolute top-3 right-5 flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: inn.level }).map((_, i) => (
              <Star key={i} className="w-3 h-3 text-realm-gold-400 fill-realm-gold-400" />
            ))}
          </div>
        </div>

        <p className="text-[11px] text-realm-text-muted mb-3">
          Proprietor: {inn.owner.name}
        </p>

        {/* Check-in/out controls */}
        <div className="flex items-center gap-2 mb-4">
          {isCheckedInHere ? (
            <>
              <span className="text-[10px] px-2 py-1 rounded-sm bg-realm-success/10 border border-realm-success/30 text-realm-success flex items-center gap-1">
                <Beer className="w-3 h-3" /> You're here
              </span>
              <RealmButton
                variant="ghost"
                size="sm"
                onClick={onCheckOut}
                disabled={checkInPending}
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                {checkInPending ? '...' : 'Check Out'}
              </RealmButton>
            </>
          ) : (
            <RealmButton
              variant="primary"
              size="sm"
              onClick={onCheckIn}
              disabled={checkInPending}
            >
              <LogIn className="w-3.5 h-3.5 mr-1" />
              {checkInPending ? '...' : isCheckedInElsewhere ? 'Check In Here' : 'Check In'}
            </RealmButton>
          )}
        </div>

        {menu.length === 0 ? (
          <div className="text-center py-8">
            <Beer className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted">The menu is empty!</p>
            <p className="text-xs text-realm-text-muted mt-1">Check back later — the innkeeper may restock.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menu.map((item) => {
              const cantAfford = gold < item.price;

              return (
                <div
                  key={item.itemTemplateId}
                  className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Beer className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                        <span className="text-sm font-display text-realm-text-primary">
                          {item.name}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-realm-text-muted">x{item.quantity}</span>
                        )}
                        <RealmBadge variant={item.isBeverage ? 'uncommon' : 'default'}>
                          {item.isBeverage ? 'Drink' : 'Food'}
                        </RealmBadge>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-realm-text-muted mb-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px]">
                        <Coins className="w-3 h-3 text-realm-gold-400" />
                        <span className="text-realm-gold-400 font-display">{item.price}g</span>
                      </div>
                    </div>

                    <RealmButton
                      variant="primary"
                      size="sm"
                      onClick={() => onBuy(item.itemTemplateId)}
                      disabled={buyPending || cantAfford}
                      title={cantAfford ? 'Not enough gold' : `Buy for ${item.price}g`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      {buyPending ? '...' : 'Buy'}
                    </RealmButton>
                  </div>
                </div>
              );
            })}

            {buyError && (
              <p className="text-xs text-realm-danger mt-2">{buyError}</p>
            )}
          </div>
        )}
      </RealmPanel>
    </div>
  );
}
