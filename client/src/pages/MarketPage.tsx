import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  TrendingUp,
  CircleDollarSign,
} from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import ErrorMessage from '../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MarketListing {
  id: string;
  itemId: string;
  itemName: string;
  itemType: string;
  rarity: Rarity;
  price: number;
  quantity: number;
  sellerName: string;
  sellerId: string;
  listedAt: string;
  expiresAt: string;
  description?: string;
}

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: Rarity;
  quantity: number;
  description?: string;
}

interface PriceHistoryPoint {
  date: string;
  avgPrice: number;
  volume: number;
}

interface PriceHistoryResponse {
  itemName: string;
  history: PriceHistoryPoint[];
  averagePrice: number;
  totalVolume: number;
}

interface BrowseResponse {
  listings: MarketListing[];
  total: number;
  page: number;
  pageSize: number;
}

interface WalletResponse {
  gold: number;
}

interface ItemOption {
  itemId: string;
  name: string;
}

type Rarity = 'POOR' | 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY';
type SortField = 'price_asc' | 'price_desc' | 'newest' | 'rarity';
type Tab = 'browse' | 'my-listings' | 'price-history';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<Rarity, string> = {
  POOR: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  COMMON: 'text-parchment-200 bg-parchment-200/10 border-parchment-200/30',
  FINE: 'text-green-400 bg-green-400/10 border-green-400/30',
  SUPERIOR: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  MASTERWORK: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  LEGENDARY: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
};

const RARITY_TEXT: Record<Rarity, string> = {
  POOR: 'text-gray-400',
  COMMON: 'text-parchment-200',
  FINE: 'text-[#4ade80]',
  SUPERIOR: 'text-[#60a5fa]',
  MASTERWORK: 'text-[#a78bfa]',
  LEGENDARY: 'text-[#f59e0b]',
};

const RARITY_ORDER: Rarity[] = ['POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY'];

const ITEM_TYPES = ['All', 'Weapon', 'Armor', 'Consumable', 'Material', 'Accessory', 'Tool', 'Misc'];

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Gold display helper
// ---------------------------------------------------------------------------
function GoldAmount({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <CircleDollarSign className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${RARITY_COLORS[rarity]}`}>
      {rarity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------
function PriceChart({ data }: { data: PriceHistoryPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-parchment-500 text-sm">
        No price data available
      </div>
    );
  }

  const width = 600;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const prices = data.map((d) => d.avgPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - minPrice) / priceRange) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.avgPrice).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${xScale(data.length - 1).toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${padding.left.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minPrice + (priceRange * i) / 4);

  // X-axis labels (up to 6)
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xTicks = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <line
          key={tick}
          x1={padding.left}
          y1={yScale(tick)}
          x2={width - padding.right}
          y2={yScale(tick)}
          stroke="rgba(168, 154, 128, 0.15)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#goldGradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#C9A461" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.avgPrice)} r="3" fill="#C9A461" stroke="#1A1A2E" strokeWidth="1.5" />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick) => (
        <text key={tick} x={padding.left - 8} y={yScale(tick) + 4} textAnchor="end" fontSize="10" fill="#A89A80">
          {Math.round(tick).toLocaleString()}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((d) => {
        const idx = data.indexOf(d);
        const date = new Date(d.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        return (
          <text key={d.date} x={xScale(idx)} y={height - 8} textAnchor="middle" fontSize="10" fill="#A89A80">
            {label}
          </text>
        );
      })}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A461" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C9A461" stopOpacity="0.02" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function MarketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('browse');

  // -- Browse state --
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterRarity, setFilterRarity] = useState('All');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<SortField>('newest');
  const [page, setPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [buyConfirm, setBuyConfirm] = useState<MarketListing | null>(null);

  // -- My Listings state --
  const [showListModal, setShowListModal] = useState(false);
  const [listItemId, setListItemId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listQty, setListQty] = useState('1');

  // -- Price History state --
  const [historyItemId, setHistoryItemId] = useState('');

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  // P1 #24: Fetch actual tax rate from the player's current town
  const { data: charData } = useQuery<{ currentTownId: string | null }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const { data: townData } = useQuery<{ town: { taxRate?: number } }>({
    queryKey: ['town', charData?.currentTownId],
    queryFn: async () => (await api.get(`/towns/${charData!.currentTownId}`)).data,
    enabled: !!charData?.currentTownId,
  });

  const taxRate = townData?.town?.taxRate ?? 0.10;

  const { data: wallet } = useQuery<WalletResponse>({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get('/characters/me/wallet')).data,
  });

  const browseParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort,
    };
    if (searchText) params.search = searchText;
    if (filterType !== 'All') params.type = filterType;
    if (filterRarity !== 'All') params.rarity = filterRarity;
    if (priceMin) params.priceMin = priceMin;
    if (priceMax) params.priceMax = priceMax;
    return params;
  }, [page, sort, searchText, filterType, filterRarity, priceMin, priceMax]);

  const {
    data: browseData,
    isLoading: browseLoading,
  } = useQuery<BrowseResponse>({
    queryKey: ['market', 'browse', browseParams],
    queryFn: async () => (await api.get('/market/browse', { params: browseParams })).data,
    enabled: activeTab === 'browse',
  });

  const {
    data: myListings,
    isLoading: myListingsLoading,
  } = useQuery<MarketListing[]>({
    queryKey: ['market', 'my-listings'],
    queryFn: async () => (await api.get('/market/my-listings')).data,
    enabled: activeTab === 'my-listings',
  });

  const {
    data: inventory,
  } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => (await api.get('/characters/me/inventory')).data,
    enabled: showListModal,
  });

  const {
    data: itemOptions,
  } = useQuery<ItemOption[]>({
    queryKey: ['market', 'item-options'],
    queryFn: async () => (await api.get('/market/item-options')).data,
    enabled: activeTab === 'price-history',
  });

  const {
    data: priceHistory,
    isLoading: historyLoading,
  } = useQuery<PriceHistoryResponse>({
    queryKey: ['market', 'history', historyItemId],
    queryFn: async () => (await api.get('/market/history', { params: { itemId: historyItemId, days: 30 } })).data,
    enabled: activeTab === 'price-history' && !!historyItemId,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const buyMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return (await api.post('/market/buy', { listingId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setBuyConfirm(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return (await api.post('/market/cancel', { listingId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const listMutation = useMutation({
    mutationFn: async (data: { itemId: string; price: number; quantity: number }) => {
      return (await api.post('/market/list', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowListModal(false);
      setListItemId('');
      setListPrice('');
      setListQty('1');
    },
  });

  const handleList = useCallback(() => {
    const price = parseFloat(listPrice);
    const quantity = parseInt(listQty, 10);
    if (!listItemId || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) return;
    listMutation.mutate({ itemId: listItemId, price, quantity });
  }, [listItemId, listPrice, listQty, listMutation]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const totalPages = browseData ? Math.ceil(browseData.total / PAGE_SIZE) : 1;
  const gold = wallet?.gold ?? 0;

  const selectedInventoryItem = inventory?.find((i) => i.itemId === listItemId);
  const listPriceNum = parseFloat(listPrice) || 0;
  const listQtyNum = parseInt(listQty, 10) || 0;
  const listTotal = listPriceNum * listQtyNum;
  const listTax = Math.ceil(listTotal * taxRate);

  // ---------------------------------------------------------------------------
  // Tab config
  // ---------------------------------------------------------------------------
  const tabs: { key: Tab; label: string; icon: typeof Store }[] = [
    { key: 'browse', label: 'Browse', icon: Store },
    { key: 'my-listings', label: 'My Listings', icon: Package },
    { key: 'price-history', label: 'Price History', icon: TrendingUp },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">Marketplace</h1>
                <p className="text-parchment-500 text-sm">Trade goods with fellow adventurers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-dark-300 border border-dark-50 rounded px-4 py-2 flex items-center gap-2">
                <span className="text-parchment-500 text-xs">Your Gold:</span>
                <GoldAmount amount={gold} className="text-primary-400 font-display text-sm" />
              </div>
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

      {/* Tabs */}
      <div className="border-b border-dark-50 bg-dark-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ================================================================= */}
        {/* TAB 1: Browse                                                     */}
        {/* ================================================================= */}
        {activeTab === 'browse' && (
          <div>
            {/* Filter bar */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-parchment-500 text-xs mb-1 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                      placeholder="Item name..."
                      className="w-full pl-9 pr-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Type filter */}
                <div>
                  <label className="text-parchment-500 text-xs mb-1 block">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Rarity filter */}
                <div>
                  <label className="text-parchment-500 text-xs mb-1 block">Rarity</label>
                  <select
                    value={filterRarity}
                    onChange={(e) => { setFilterRarity(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
                  >
                    <option value="All">All</option>
                    {RARITY_ORDER.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Price range */}
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Min Price</label>
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                      placeholder="0"
                      min="0"
                      className="w-24 px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <span className="text-parchment-500 pb-2">-</span>
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Max Price</label>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                      placeholder="Any"
                      min="0"
                      className="w-24 px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-parchment-500 text-xs mb-1 block">Sort</label>
                  <div className="flex gap-1">
                    {([
                      { key: 'price_asc', label: 'Price', icon: ArrowUp },
                      { key: 'price_desc', label: 'Price', icon: ArrowDown },
                      { key: 'newest', label: 'Newest', icon: Clock },
                      { key: 'rarity', label: 'Rarity', icon: ArrowUpDown },
                    ] as const).map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.key}
                          onClick={() => setSort(s.key)}
                          className={`flex items-center gap-1 px-2.5 py-2 rounded text-xs transition-colors ${
                            sort === s.key
                              ? 'bg-primary-400/20 text-primary-400 border border-primary-400/40'
                              : 'bg-dark-500 text-parchment-500 border border-dark-50 hover:text-parchment-300'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Listings grid */}
            {browseLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : !browseData?.listings?.length ? (
              <div className="text-center py-20">
                <Store className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
                <p className="text-parchment-500">No listings found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {browseData.listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="bg-dark-300 border border-dark-50 rounded-lg p-4 hover:border-primary-400/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-display text-sm ${RARITY_TEXT[listing.rarity]}`}>
                          {listing.itemName}
                        </h3>
                        <RarityBadge rarity={listing.rarity} />
                      </div>
                      <p className="text-parchment-500 text-xs mb-3 capitalize">{listing.itemType}</p>
                      <div className="flex items-center justify-between">
                        <GoldAmount amount={listing.price} className="text-primary-400 font-semibold text-sm" />
                        <span className="text-parchment-500 text-xs">x{listing.quantity}</span>
                      </div>
                      <p className="text-parchment-500/70 text-[10px] mt-2">Seller: {listing.sellerName}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setBuyConfirm(listing); }}
                        className="mt-3 w-full py-1.5 bg-primary-400/20 text-primary-400 text-xs font-display rounded border border-primary-400/30 hover:bg-primary-400/30 transition-colors"
                      >
                        Buy
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-parchment-300 text-sm font-display">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: My Listings                                                */}
        {/* ================================================================= */}
        {activeTab === 'my-listings' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-parchment-200">Your Active Listings</h2>
              <button
                onClick={() => setShowListModal(true)}
                className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
              >
                List Item
              </button>
            </div>

            {myListingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : !myListings?.length ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
                <p className="text-parchment-500 mb-2">You have no active listings.</p>
                <p className="text-parchment-500/60 text-sm">List items from your inventory to start selling.</p>
              </div>
            ) : (
              <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-50 text-left">
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Item</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Rarity</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Price</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Qty</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Listed</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display">Expires</th>
                      <th className="px-4 py-3 text-parchment-500 text-xs font-display"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-50">
                    {myListings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-dark-200/30 transition-colors">
                        <td className={`px-4 py-3 text-sm font-semibold ${RARITY_TEXT[listing.rarity]}`}>
                          {listing.itemName}
                        </td>
                        <td className="px-4 py-3">
                          <RarityBadge rarity={listing.rarity} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <GoldAmount amount={listing.price} className="text-primary-400" />
                        </td>
                        <td className="px-4 py-3 text-sm text-parchment-300">{listing.quantity}</td>
                        <td className="px-4 py-3 text-xs text-parchment-500">
                          {new Date(listing.listedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-parchment-500">
                          {new Date(listing.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => cancelMutation.mutate(listing.id)}
                            disabled={cancelMutation.isPending}
                            className="px-3 py-1 text-xs text-blood-light border border-blood-light/30 rounded hover:bg-blood-light/10 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: Price History                                              */}
        {/* ================================================================= */}
        {activeTab === 'price-history' && (
          <div>
            <h2 className="text-xl font-display text-parchment-200 mb-6">Price History</h2>

            <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
              {/* Item selector */}
              <div className="mb-6">
                <label className="text-parchment-500 text-xs mb-1 block">Select Item</label>
                <select
                  value={historyItemId}
                  onChange={(e) => setHistoryItemId(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
                >
                  <option value="">Choose an item...</option>
                  {itemOptions?.map((item) => (
                    <option key={item.itemId} value={item.itemId}>{item.name}</option>
                  ))}
                </select>
              </div>

              {!historyItemId ? (
                <div className="text-center py-16">
                  <TrendingUp className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
                  <p className="text-parchment-500">Select an item to view price trends.</p>
                </div>
              ) : historyLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex gap-6">
                    <div className="bg-dark-500 border border-dark-50 rounded px-4 py-3 w-40 h-16" />
                    <div className="bg-dark-500 border border-dark-50 rounded px-4 py-3 w-40 h-16" />
                  </div>
                  <div className="bg-dark-400 rounded h-64" />
                </div>
              ) : priceHistory ? (
                <div>
                  {/* Stats */}
                  <div className="flex gap-6 mb-6">
                    <div className="bg-dark-500 border border-dark-50 rounded px-4 py-3">
                      <p className="text-parchment-500 text-xs">Average Price (30d)</p>
                      <GoldAmount
                        amount={Math.round(priceHistory.averagePrice)}
                        className="text-primary-400 font-display text-lg"
                      />
                    </div>
                    <div className="bg-dark-500 border border-dark-50 rounded px-4 py-3">
                      <p className="text-parchment-500 text-xs">Total Volume (30d)</p>
                      <p className="text-parchment-200 font-display text-lg">{priceHistory.totalVolume.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Chart */}
                  <PriceChart data={priceHistory.history} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: Item Details Popup                                          */}
      {/* ================================================================= */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedListing(null)}>
          <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className={`text-xl font-display ${RARITY_TEXT[selectedListing.rarity]}`}>
                {selectedListing.itemName}
              </h3>
              <button onClick={() => setSelectedListing(null)} className="text-parchment-500 hover:text-parchment-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <RarityBadge rarity={selectedListing.rarity} />
                <span className="text-parchment-500 text-xs capitalize">{selectedListing.itemType}</span>
              </div>
              {selectedListing.description && (
                <p className="text-parchment-300 text-sm leading-relaxed">{selectedListing.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-parchment-500 text-xs">Price</p>
                  <GoldAmount amount={selectedListing.price} className="text-primary-400 font-semibold" />
                </div>
                <div>
                  <p className="text-parchment-500 text-xs">Quantity</p>
                  <p className="text-parchment-200">{selectedListing.quantity}</p>
                </div>
                <div>
                  <p className="text-parchment-500 text-xs">Seller</p>
                  <p className="text-parchment-200">{selectedListing.sellerName}</p>
                </div>
                <div>
                  <p className="text-parchment-500 text-xs">Listed</p>
                  <p className="text-parchment-200">{new Date(selectedListing.listedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setBuyConfirm(selectedListing); setSelectedListing(null); }}
              className="w-full py-2.5 bg-primary-400 text-dark-500 font-display rounded hover:bg-primary-300 transition-colors"
            >
              Buy This Item
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Buy Confirmation                                           */}
      {/* ================================================================= */}
      {buyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBuyConfirm(null)}>
          <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display text-primary-400 mb-4">Confirm Purchase</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-parchment-500">Item</span>
                <span className={`font-semibold ${RARITY_TEXT[buyConfirm.rarity]}`}>{buyConfirm.itemName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-parchment-500">Price</span>
                <GoldAmount amount={buyConfirm.price} className="text-parchment-200" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-parchment-500">Tax ({Math.round(taxRate * 100)}%)</span>
                <GoldAmount amount={Math.ceil(buyConfirm.price * taxRate)} className="text-parchment-200" />
              </div>
              <div className="border-t border-dark-50 pt-2 flex justify-between text-sm font-semibold">
                <span className="text-parchment-300">Total</span>
                <GoldAmount
                  amount={buyConfirm.price + Math.ceil(buyConfirm.price * taxRate)}
                  className="text-primary-400"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-parchment-500">Your Gold</span>
                <GoldAmount amount={gold} className="text-parchment-200" />
              </div>
              {gold < buyConfirm.price + Math.ceil(buyConfirm.price * taxRate) && (
                <p className="text-blood-light text-xs">You do not have enough gold for this purchase.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBuyConfirm(null)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => buyMutation.mutate(buyConfirm.id)}
                disabled={buyMutation.isPending || gold < buyConfirm.price + Math.ceil(buyConfirm.price * taxRate)}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buyMutation.isPending ? 'Buying...' : 'Confirm'}
              </button>
            </div>
            {buyMutation.isError && (
              <p className="text-blood-light text-xs mt-3 text-center">Purchase failed. Please try again.</p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: List Item                                                   */}
      {/* ================================================================= */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowListModal(false)}>
          <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-primary-400">List Item for Sale</h3>
              <button onClick={() => setShowListModal(false)} className="text-parchment-500 hover:text-parchment-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Item selector */}
              <div>
                <label className="text-parchment-500 text-xs mb-1 block">Select Item</label>
                <select
                  value={listItemId}
                  onChange={(e) => setListItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
                >
                  <option value="">Choose from inventory...</option>
                  {inventory?.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.name} ({item.rarity}) x{item.quantity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price per unit */}
              <div>
                <label className="text-parchment-500 text-xs mb-1 block">Price per Unit</label>
                <div className="relative">
                  <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                  <input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full pl-9 pr-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-parchment-500 text-xs mb-1 block">
                  Quantity {selectedInventoryItem ? `(max: ${selectedInventoryItem.quantity})` : ''}
                </label>
                <input
                  type="number"
                  value={listQty}
                  onChange={(e) => setListQty(e.target.value)}
                  min="1"
                  max={selectedInventoryItem?.quantity ?? undefined}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
                />
              </div>

              {/* Preview */}
              {listPriceNum > 0 && listQtyNum > 0 && (
                <div className="bg-dark-500 border border-dark-50 rounded p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-parchment-500">Total Sale Price</span>
                    <GoldAmount amount={listTotal} className="text-parchment-200" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-parchment-500">Estimated Tax (10%)</span>
                    <GoldAmount amount={listTax} className="text-parchment-500" />
                  </div>
                  <div className="flex justify-between text-xs border-t border-dark-50 pt-1.5 font-semibold">
                    <span className="text-parchment-300">You Receive</span>
                    <GoldAmount amount={listTotal - listTax} className="text-primary-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowListModal(false)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleList}
                disabled={listMutation.isPending || !listItemId || listPriceNum <= 0 || listQtyNum <= 0}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {listMutation.isPending ? 'Listing...' : 'List for Sale'}
              </button>
            </div>
            {listMutation.isError && (
              <p className="text-blood-light text-xs mt-3 text-center">Failed to list item. Please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
