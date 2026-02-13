import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  ClipboardList,
  TrendingUp,
  X,
  Lock,
} from 'lucide-react';
import api from '../services/api';
import GoldAmount from '../components/shared/GoldAmount';
import { RARITY_TEXT_COLORS } from '../constants';
import MarketFilters from '../components/market/MarketFilters';
import ListingCard, { RarityBadge, type AuctionListing } from '../components/market/ListingCard';
import PriceChart from '../components/market/PriceChart';
import SellForm from '../components/market/SellForm';
import MyListings from '../components/market/MyListings';
import OrderList from '../components/market/OrderList';
import AuctionTimer from '../components/market/AuctionTimer';
import BidModal from '../components/market/BidModal';
import RollBreakdown from '../components/market/RollBreakdown';
import { RealmBadge } from '../components/ui/RealmBadge';
import { RealmSkeleton } from '../components/ui/RealmSkeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CharacterData {
  id: string;
  name: string;
  gold: number;
  escrowedGold?: number;
  currentTownId: string | null;
  currentTownName?: string;
  professions?: Array<{ name: string }>;
}

interface BrowseResponse {
  listings: AuctionListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PriceHistoryResponse {
  itemName: string;
  transactions: Array<{ salePrice: number; soldAt: string; quantity: number }>;
}

interface AuctionResult {
  id: string;
  itemName: string;
  bidPrice: number;
  status: string;
  resolvedAt: string;
  rollBreakdown: {
    raw: number;
    modifiers: Array<{ source: string; value: number }>;
    total: number;
  } | null;
}

interface MarketTrend {
  itemName: string;
  averagePrice: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

interface ResultsResponse {
  results: AuctionResult[];
  marketTrends: MarketTrend[] | null;
}

type SortField = 'price_asc' | 'price_desc' | 'newest' | 'rarity';
type Tab = 'browse' | 'sell' | 'my-orders' | 'my-listings' | 'results';

const PAGE_SIZE = 12;

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
  const [selectedListing, setSelectedListing] = useState<AuctionListing | null>(null);
  const [bidListing, setBidListing] = useState<AuctionListing | null>(null);

  // -- Sell state --
  const [showSellForm, setShowSellForm] = useState(false);

  // -- Price History state --
  const [historyItemTemplateId, setHistoryItemTemplateId] = useState('');

  // -- Success toast --
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  const { data: character } = useQuery<CharacterData>({
    queryKey: ['characters', 'current'],
    queryFn: async () => (await api.get('/characters/current')).data,
  });

  const gold = character?.gold ?? 0;
  const escrowedGold = character?.escrowedGold ?? 0;
  const townName = character?.currentTownName ?? 'Local';
  const isMerchant =
    character?.professions?.some((p) => p.name.toLowerCase() === 'merchant') ?? false;

  const browseParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    };
    if (searchText) params.search = searchText;
    if (filterType !== 'All') params.type = filterType;
    if (filterRarity !== 'All') params.rarity = filterRarity;
    if (priceMin) params.minPrice = priceMin;
    if (priceMax) params.maxPrice = priceMax;
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
    data: priceHistory,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery<PriceHistoryResponse>({
    queryKey: ['market', 'price-history', historyItemTemplateId],
    queryFn: async () =>
      (
        await api.get('/market/price-history', {
          params: { itemTemplateId: historyItemTemplateId },
        })
      ).data,
    enabled: activeTab === 'results' && isMerchant && !!historyItemTemplateId,
  });

  const {
    data: resultsData,
    isLoading: resultsLoading,
  } = useQuery<ResultsResponse>({
    queryKey: ['market', 'results'],
    queryFn: async () => (await api.get('/market/results')).data,
    enabled: activeTab === 'results',
  });

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const totalPages = browseData?.totalPages ?? 1;

  // Filter state setters that also reset page
  const handleSearchChange = useCallback((v: string) => { setSearchText(v); setPage(1); }, []);
  const handleFilterTypeChange = useCallback((v: string) => { setFilterType(v); setPage(1); }, []);
  const handleFilterRarityChange = useCallback((v: string) => { setFilterRarity(v); setPage(1); }, []);
  const handlePriceMinChange = useCallback((v: string) => { setPriceMin(v); setPage(1); }, []);
  const handlePriceMaxChange = useCallback((v: string) => { setPriceMax(v); setPage(1); }, []);

  // ---------------------------------------------------------------------------
  // Tab config
  // ---------------------------------------------------------------------------
  const tabs: { key: Tab; label: string; icon: typeof Store }[] = [
    { key: 'browse', label: 'Browse', icon: Store },
    { key: 'sell', label: 'Sell', icon: Package },
    { key: 'my-orders', label: 'My Orders', icon: ShoppingCart },
    { key: 'my-listings', label: 'My Listings', icon: ClipboardList },
    { key: 'results', label: 'Results', icon: TrendingUp },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="pt-12">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-realm-bg-700 border border-realm-gold-400/30 rounded-lg px-4 py-3 shadow-lg animate-fade-in">
          <p className="text-realm-gold-400 text-sm font-display">{toast}</p>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">
                  {townName} Market
                </h1>
                <p className="text-realm-text-muted text-sm">
                  Batch auction marketplace -- place orders and compete for items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <AuctionTimer />
              <div className="bg-realm-bg-700 border border-realm-border rounded px-4 py-2 flex items-center gap-2">
                <span className="text-realm-text-muted text-xs">Gold:</span>
                <GoldAmount amount={gold} className="text-realm-gold-400 font-display text-sm" />
                {escrowedGold > 0 && (
                  <span className="text-realm-text-muted text-xs">
                    ({escrowedGold}g in escrow)
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-realm-border bg-realm-bg-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-realm-gold-400 text-realm-gold-400'
                      : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-text-muted/30'
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
        {/* ================================================================
            TAB 1: Browse
            ================================================================ */}
        {activeTab === 'browse' && (
          <div>
            <MarketFilters
              searchText={searchText}
              onSearchChange={handleSearchChange}
              filterType={filterType}
              onFilterTypeChange={handleFilterTypeChange}
              filterRarity={filterRarity}
              onFilterRarityChange={handleFilterRarityChange}
              priceMin={priceMin}
              onPriceMinChange={handlePriceMinChange}
              priceMax={priceMax}
              onPriceMaxChange={handlePriceMaxChange}
              sort={sort}
              onSortChange={setSort}
            />

            {/* Listings grid */}
            {browseLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <RealmSkeleton
                    key={i}
                    className="h-48 w-full"
                  />
                ))}
              </div>
            ) : !browseData?.listings?.length ? (
              <div className="text-center py-20">
                <Store className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                <p className="text-realm-text-muted">
                  No listings found matching your criteria.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {browseData.listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onSelect={setSelectedListing}
                      onPlaceOrder={setBidListing}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-realm-text-secondary text-sm font-display">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 2: Sell
            ================================================================ */}
        {activeTab === 'sell' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display text-realm-text-primary">Sell Items</h2>
                <p className="text-realm-text-muted text-sm mt-1">
                  List items from your inventory. Buyers will place orders and compete
                  in auction cycles.
                </p>
              </div>
            </div>
            {/* Inline sell form -- opens as a modal for consistency with existing patterns */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowSellForm(true)}
                className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 hover:border-realm-gold-400/40 transition-colors cursor-pointer text-center max-w-md w-full"
              >
                <Package className="w-12 h-12 text-realm-gold-400/60 mx-auto mb-4" />
                <p className="text-realm-text-primary font-display text-lg mb-2">
                  List an Item for Sale
                </p>
                <p className="text-realm-text-muted text-sm">
                  Select an item from your inventory, set your asking price, and wait for
                  buyers to place orders.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3: My Orders
            ================================================================ */}
        {activeTab === 'my-orders' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-display text-realm-text-primary">Your Buy Orders</h2>
              <p className="text-realm-text-muted text-sm mt-1">
                Track your pending bids and view resolved auction results.
              </p>
            </div>
            <OrderList />
          </div>
        )}

        {/* ================================================================
            TAB 4: My Listings
            ================================================================ */}
        {activeTab === 'my-listings' && (
          <MyListings onListItem={() => setShowSellForm(true)} />
        )}

        {/* ================================================================
            TAB 5: Results
            ================================================================ */}
        {activeTab === 'results' && (
          <div>
            <h2 className="text-xl font-display text-realm-text-primary mb-6">
              Auction Results
            </h2>

            {resultsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <RealmSkeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !resultsData?.results?.length ? (
              <div className="text-center py-16">
                <TrendingUp className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                <p className="text-realm-text-muted">
                  No auction results yet. Place orders to see your history here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                {resultsData.results.map((result) => {
                  const isWon =
                    result.status === 'won' || result.status === 'fulfilled';
                  const isLost =
                    result.status === 'lost' || result.status === 'outbid';

                  return (
                    <div
                      key={result.id}
                      className={`bg-realm-bg-700 border rounded-lg p-4 ${
                        isWon
                          ? 'border-realm-success/30'
                          : isLost
                            ? 'border-realm-danger/30'
                            : 'border-realm-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-realm-text-primary text-sm font-semibold">
                            {result.itemName}
                          </span>
                          {isWon && (
                            <RealmBadge variant="uncommon">Won</RealmBadge>
                          )}
                          {isLost && (
                            <span className="inline-flex items-center gap-1 font-display text-xs uppercase tracking-wider px-2 py-0.5 rounded-sm border border-realm-danger/50 text-realm-danger">
                              Lost
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <GoldAmount
                            amount={result.bidPrice}
                            className="text-realm-text-secondary text-sm"
                          />
                          <p className="text-realm-text-muted text-[10px]">
                            {new Date(result.resolvedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {result.rollBreakdown && (
                        <div className="pt-2 border-t border-realm-border/50">
                          <RollBreakdown rollBreakdown={result.rollBreakdown} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Merchant-only market trends */}
            {isMerchant && resultsData?.marketTrends && resultsData.marketTrends.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-realm-gold-400" />
                  Market Trends
                  <RealmBadge variant="legendary">Merchant</RealmBadge>
                </h3>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-realm-border text-left">
                        <th className="px-4 py-3 text-realm-text-muted text-xs font-display">
                          Item
                        </th>
                        <th className="px-4 py-3 text-realm-text-muted text-xs font-display">
                          Avg Price
                        </th>
                        <th className="px-4 py-3 text-realm-text-muted text-xs font-display">
                          Volume
                        </th>
                        <th className="px-4 py-3 text-realm-text-muted text-xs font-display">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-realm-border/50">
                      {resultsData.marketTrends.map((trend, i) => (
                        <tr key={i} className="hover:bg-realm-bg-600/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-realm-text-primary font-semibold">
                            {trend.itemName}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <GoldAmount
                              amount={Math.round(trend.averagePrice)}
                              className="text-realm-gold-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-realm-text-secondary">
                            {trend.volume}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={
                                trend.trend === 'up'
                                  ? 'text-realm-success'
                                  : trend.trend === 'down'
                                    ? 'text-realm-danger'
                                    : 'text-realm-text-muted'
                              }
                            >
                              {trend.trend === 'up'
                                ? 'Rising'
                                : trend.trend === 'down'
                                  ? 'Falling'
                                  : 'Stable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Merchant-only price history */}
            {isMerchant && (
              <div className="mt-8">
                <h3 className="text-lg font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  Price History
                  <RealmBadge variant="legendary">Merchant</RealmBadge>
                </h3>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6">
                  <div className="mb-4">
                    <label className="text-realm-text-muted text-xs mb-1 block">
                      Item Template ID
                    </label>
                    <input
                      type="text"
                      value={historyItemTemplateId}
                      onChange={(e) => setHistoryItemTemplateId(e.target.value)}
                      placeholder="Enter item template ID..."
                      className="w-full max-w-sm px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none placeholder:text-realm-text-muted/50"
                    />
                  </div>

                  {!historyItemTemplateId ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                      <p className="text-realm-text-muted text-sm">
                        Enter an item template ID to view price history.
                      </p>
                    </div>
                  ) : historyLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <RealmSkeleton className="h-64 w-full" />
                    </div>
                  ) : historyError ? (
                    <div className="text-center py-12">
                      <p className="text-realm-danger text-sm">
                        Could not load price history. Merchant profession required.
                      </p>
                    </div>
                  ) : priceHistory ? (
                    <div>
                      <p className="text-realm-text-primary font-display text-sm mb-3">
                        {priceHistory.itemName}
                      </p>
                      {priceHistory.transactions.length === 0 ? (
                        <p className="text-realm-text-muted text-sm text-center py-8">
                          No transactions recorded for this item.
                        </p>
                      ) : (
                        <PriceChart
                          data={priceHistory.transactions.map((t) => ({
                            date: t.soldAt,
                            avgPrice: t.salePrice,
                            volume: t.quantity,
                          }))}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {!isMerchant && (
              <div className="mt-8 bg-realm-bg-700 border border-realm-border rounded-lg p-6 text-center">
                <Lock className="w-8 h-8 text-realm-text-muted/40 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">
                  Market trends and price history are exclusive to the{' '}
                  <span className="text-realm-gold-400">Merchant</span> profession.
                </p>
                <p className="text-realm-text-muted/60 text-xs mt-1">
                  Learn the Merchant profession to unlock advanced market intelligence.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================
          MODAL: Item Details Popup
          ================================================================ */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedListing(null)}
        >
          <div
            className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3
                className={`text-xl font-display ${
                  RARITY_TEXT_COLORS[selectedListing.item.rarity] ??
                  'text-realm-text-primary'
                }`}
              >
                {selectedListing.item.name}
              </h3>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-realm-text-muted hover:text-realm-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <RarityBadge rarity={selectedListing.item.rarity} />
                <span className="text-realm-text-muted text-xs capitalize">
                  {selectedListing.item.type}
                </span>
              </div>
              {selectedListing.item.description && (
                <p className="text-realm-text-secondary text-sm leading-relaxed">
                  {selectedListing.item.description}
                </p>
              )}
              {selectedListing.item.stats &&
                Object.keys(selectedListing.item.stats).length > 0 && (
                  <div className="bg-realm-bg-900 border border-realm-border rounded p-3">
                    <p className="text-realm-text-muted text-xs mb-2">Stats</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(selectedListing.item.stats).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-realm-text-muted capitalize">{key}</span>
                          <span className="text-realm-text-primary">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-realm-text-muted text-xs">Asking Price</p>
                  <GoldAmount
                    amount={selectedListing.price}
                    className="text-realm-gold-400 font-semibold"
                  />
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Quantity</p>
                  <p className="text-realm-text-primary">{selectedListing.quantity}</p>
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Seller</p>
                  <p className="text-realm-text-primary">
                    {selectedListing.seller.name}
                  </p>
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Listed</p>
                  <p className="text-realm-text-primary">
                    {new Date(selectedListing.listedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setBidListing(selectedListing);
                setSelectedListing(null);
              }}
              className="w-full py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display rounded hover:bg-realm-gold-400 transition-colors"
            >
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: Bid (Place Buy Order)
          ================================================================ */}
      {bidListing && (
        <BidModal
          listing={bidListing}
          onClose={() => setBidListing(null)}
          onSuccess={() => {
            setBidListing(null);
            showToast('Buy order placed successfully! Gold held in escrow.');
          }}
        />
      )}

      {/* ================================================================
          MODAL: Sell Form
          ================================================================ */}
      {showSellForm && (
        <SellForm
          onClose={() => setShowSellForm(false)}
          onSuccess={() => {
            setShowSellForm(false);
            showToast('Item listed for sale!');
          }}
        />
      )}
    </div>
  );
}
