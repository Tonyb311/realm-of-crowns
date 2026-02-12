import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  ChevronLeft,
  ChevronRight,
  Package,
  TrendingUp,
  X,
} from 'lucide-react';
import api from '../services/api';
import GoldAmount from '../components/shared/GoldAmount';
import { RARITY_TEXT_COLORS } from '../constants';
import MarketFilters from '../components/market/MarketFilters';
import ListingCard, { RarityBadge, type MarketListing } from '../components/market/ListingCard';
import PriceChart, { type PriceHistoryPoint } from '../components/market/PriceChart';
import SellForm from '../components/market/SellForm';
import MyListings from '../components/market/MyListings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  quantity: number;
  description?: string;
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

type SortField = 'price_asc' | 'price_desc' | 'newest' | 'rarity';
type Tab = 'browse' | 'my-listings' | 'price-history';

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
    { key: 'my-listings', label: 'My Listings', icon: Package },
    { key: 'price-history', label: 'Price History', icon: TrendingUp },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Marketplace</h1>
                <p className="text-realm-text-muted text-sm">Trade goods with fellow adventurers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-realm-bg-700 border border-realm-border rounded px-4 py-2 flex items-center gap-2">
                <span className="text-realm-text-muted text-xs">Your Gold:</span>
                <GoldAmount amount={gold} className="text-realm-gold-400 font-display text-sm" />
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
        {/* TAB 1: Browse */}
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
                  <div key={i} className="h-48 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
                ))}
              </div>
            ) : !browseData?.listings?.length ? (
              <div className="text-center py-20">
                <Store className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                <p className="text-realm-text-muted">No listings found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {browseData.listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onSelect={setSelectedListing}
                      onBuy={setBuyConfirm}
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

        {/* TAB 2: My Listings */}
        {activeTab === 'my-listings' && (
          <MyListings
            listings={myListings}
            isLoading={myListingsLoading}
            onListItem={() => setShowListModal(true)}
            onCancel={(id) => cancelMutation.mutate(id)}
            cancelPending={cancelMutation.isPending}
          />
        )}

        {/* TAB 3: Price History */}
        {activeTab === 'price-history' && (
          <div>
            <h2 className="text-xl font-display text-realm-text-primary mb-6">Price History</h2>

            <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6">
              {/* Item selector */}
              <div className="mb-6">
                <label className="text-realm-text-muted text-xs mb-1 block">Select Item</label>
                <select
                  value={historyItemId}
                  onChange={(e) => setHistoryItemId(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-400/50 focus:outline-none"
                >
                  <option value="">Choose an item...</option>
                  {itemOptions?.map((item) => (
                    <option key={item.itemId} value={item.itemId}>{item.name}</option>
                  ))}
                </select>
              </div>

              {!historyItemId ? (
                <div className="text-center py-16">
                  <TrendingUp className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                  <p className="text-realm-text-muted">Select an item to view price trends.</p>
                </div>
              ) : historyLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex gap-6">
                    <div className="bg-realm-bg-900 border border-realm-border rounded px-4 py-3 w-40 h-16" />
                    <div className="bg-realm-bg-900 border border-realm-border rounded px-4 py-3 w-40 h-16" />
                  </div>
                  <div className="bg-realm-bg-800 rounded h-64" />
                </div>
              ) : priceHistory ? (
                <div>
                  {/* Stats */}
                  <div className="flex gap-6 mb-6">
                    <div className="bg-realm-bg-900 border border-realm-border rounded px-4 py-3">
                      <p className="text-realm-text-muted text-xs">Average Price (30d)</p>
                      <GoldAmount
                        amount={Math.round(priceHistory.averagePrice)}
                        className="text-realm-gold-400 font-display text-lg"
                      />
                    </div>
                    <div className="bg-realm-bg-900 border border-realm-border rounded px-4 py-3">
                      <p className="text-realm-text-muted text-xs">Total Volume (30d)</p>
                      <p className="text-realm-text-primary font-display text-lg">{priceHistory.totalVolume.toLocaleString()}</p>
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

      {/* MODAL: Item Details Popup */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedListing(null)}>
          <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className={`text-xl font-display ${RARITY_TEXT_COLORS[selectedListing.rarity] ?? 'text-realm-text-primary'}`}>
                {selectedListing.itemName}
              </h3>
              <button onClick={() => setSelectedListing(null)} className="text-realm-text-muted hover:text-realm-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <RarityBadge rarity={selectedListing.rarity} />
                <span className="text-realm-text-muted text-xs capitalize">{selectedListing.itemType}</span>
              </div>
              {selectedListing.description && (
                <p className="text-realm-text-secondary text-sm leading-relaxed">{selectedListing.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-realm-text-muted text-xs">Price</p>
                  <GoldAmount amount={selectedListing.price} className="text-realm-gold-400 font-semibold" />
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Quantity</p>
                  <p className="text-realm-text-primary">{selectedListing.quantity}</p>
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Seller</p>
                  <p className="text-realm-text-primary">{selectedListing.sellerName}</p>
                </div>
                <div>
                  <p className="text-realm-text-muted text-xs">Listed</p>
                  <p className="text-realm-text-primary">{new Date(selectedListing.listedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setBuyConfirm(selectedListing); setSelectedListing(null); }}
              className="w-full py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display rounded hover:bg-realm-gold-400 transition-colors"
            >
              Buy This Item
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Buy Confirmation */}
      {buyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBuyConfirm(null)}>
          <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display text-realm-gold-400 mb-4">Confirm Purchase</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-muted">Item</span>
                <span className={`font-semibold ${RARITY_TEXT_COLORS[buyConfirm.rarity] ?? 'text-realm-text-primary'}`}>{buyConfirm.itemName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-muted">Price</span>
                <GoldAmount amount={buyConfirm.price} className="text-realm-text-primary" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-muted">Tax ({Math.round(taxRate * 100)}%)</span>
                <GoldAmount amount={Math.ceil(buyConfirm.price * taxRate)} className="text-realm-text-primary" />
              </div>
              <div className="border-t border-realm-border pt-2 flex justify-between text-sm font-semibold">
                <span className="text-realm-text-secondary">Total</span>
                <GoldAmount
                  amount={buyConfirm.price + Math.ceil(buyConfirm.price * taxRate)}
                  className="text-realm-gold-400"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-realm-text-muted">Your Gold</span>
                <GoldAmount amount={gold} className="text-realm-text-primary" />
              </div>
              {gold < buyConfirm.price + Math.ceil(buyConfirm.price * taxRate) && (
                <p className="text-realm-danger text-xs">You do not have enough gold for this purchase.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBuyConfirm(null)}
                className="flex-1 py-2 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => buyMutation.mutate(buyConfirm.id)}
                disabled={buyMutation.isPending || gold < buyConfirm.price + Math.ceil(buyConfirm.price * taxRate)}
                className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buyMutation.isPending ? 'Buying...' : 'Confirm'}
              </button>
            </div>
            {buyMutation.isError && (
              <p className="text-realm-danger text-xs mt-3 text-center">Purchase failed. Please try again.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: List Item */}
      {showListModal && (
        <SellForm
          inventory={inventory}
          listItemId={listItemId}
          onListItemIdChange={setListItemId}
          listPrice={listPrice}
          onListPriceChange={setListPrice}
          listQty={listQty}
          onListQtyChange={setListQty}
          listTotal={listTotal}
          listTax={listTax}
          selectedInventoryItem={selectedInventoryItem}
          listPriceNum={listPriceNum}
          listQtyNum={listQtyNum}
          isPending={listMutation.isPending}
          isError={listMutation.isError}
          onSubmit={handleList}
          onClose={() => setShowListModal(false)}
        />
      )}
    </div>
  );
}
