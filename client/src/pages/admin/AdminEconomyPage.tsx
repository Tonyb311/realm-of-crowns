import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Store,
  CircleDollarSign,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Listing {
  id: string;
  sellerName: string;
  itemName: string;
  price: number;
  quantity: number;
  townName: string;
  listedAt: string;
}

interface Transaction {
  id: string;
  buyerName: string;
  sellerName: string;
  itemName: string;
  price: number;
  quantity: number;
  createdAt: string;
}

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

interface EconomyOverview {
  goldCirculation: number;
  listingCount: number;
  totalListingValue: number;
  transactionsLast30Days: number;
  transactionVolume: { date: string; count: number; value: number }[];
}

type Tab = 'listings' | 'transactions' | 'overview';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

const TABS: { key: Tab; label: string; icon: typeof Store }[] = [
  { key: 'listings', label: 'Active Listings', icon: Store },
  { key: 'transactions', label: 'Transactions', icon: TrendingUp },
  { key: 'overview', label: 'Overview', icon: BarChart3 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminEconomyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [listingsPage, setListingsPage] = useState(1);
  const [txPage, setTxPage] = useState(1);

  // Active listings query
  const {
    data: listingsData,
    isLoading: listingsLoading,
    isError: listingsError,
    error: listingsErr,
    refetch: listingsRefetch,
  } = useQuery<ListingsResponse>({
    queryKey: ['admin', 'economy', 'listings', listingsPage],
    queryFn: async () => {
      const raw = (await api.get('/admin/economy/listings', { params: { page: String(listingsPage), pageSize: String(PAGE_SIZE) } })).data;
      // Backend returns { data: [...] } with nested seller/item objects
      const arr: any[] = raw?.listings ?? raw?.data ?? [];
      return {
        listings: arr.map((l: any) => ({
          id: l.id,
          sellerName: l.sellerName ?? l.seller?.name ?? '',
          itemName: l.itemName ?? l.item?.template?.name ?? l.item?.name ?? '',
          price: l.price ?? 0,
          quantity: l.quantity ?? 0,
          townName: l.townName ?? l.town?.name ?? '',
          listedAt: l.listedAt ?? l.createdAt ?? '',
        })),
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        pageSize: raw?.pageSize ?? PAGE_SIZE,
      };
    },
    enabled: activeTab === 'listings',
  });

  // Transactions query
  const {
    data: txData,
    isLoading: txLoading,
    isError: txError,
    error: txErr,
    refetch: txRefetch,
  } = useQuery<TransactionsResponse>({
    queryKey: ['admin', 'economy', 'transactions', txPage],
    queryFn: async () => {
      const raw = (await api.get('/admin/economy/transactions', { params: { page: String(txPage), pageSize: String(PAGE_SIZE) } })).data;
      // Backend returns { data: [...] } with nested buyer/seller/item objects
      const arr: any[] = raw?.transactions ?? raw?.data ?? [];
      return {
        transactions: arr.map((tx: any) => ({
          id: tx.id,
          buyerName: tx.buyerName ?? tx.buyer?.name ?? '',
          sellerName: tx.sellerName ?? tx.seller?.name ?? '',
          itemName: tx.itemName ?? tx.item?.template?.name ?? tx.item?.name ?? '',
          price: tx.price ?? tx.totalPrice ?? tx.pricePerUnit ?? 0,
          quantity: tx.quantity ?? 0,
          createdAt: tx.createdAt ?? tx.timestamp ?? '',
        })),
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        pageSize: raw?.pageSize ?? PAGE_SIZE,
      };
    },
    enabled: activeTab === 'transactions',
  });

  // Overview query
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErr,
    refetch: overviewRefetch,
  } = useQuery<EconomyOverview>({
    queryKey: ['admin', 'economy', 'overview'],
    queryFn: async () => {
      // Backend endpoint is /summary not /overview; field names differ
      const raw = (await api.get('/admin/economy/summary')).data;
      return {
        goldCirculation: raw?.goldCirculation ?? raw?.totalGoldCirculation ?? 0,
        listingCount: raw?.listingCount ?? raw?.activeListingCount ?? 0,
        totalListingValue: raw?.totalListingValue ?? raw?.activeListingTotalValue ?? 0,
        transactionsLast30Days: raw?.transactionsLast30Days ?? raw?.transactionCount30d ?? 0,
        transactionVolume: Array.isArray(raw?.transactionVolume) ? raw.transactionVolume : [],
      };
    },
    enabled: activeTab === 'overview',
  });

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return (await api.delete(`/admin/economy/listings/${listingId}`)).data;
    },
    onSuccess: () => {
      toast.success('Listing removed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'economy', 'listings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove listing');
    },
  });

  const listingsTotalPages = listingsData ? Math.ceil(listingsData.total / PAGE_SIZE) : 1;
  const txTotalPages = txData ? Math.ceil(txData.total / PAGE_SIZE) : 1;

  return (
    <div>
      <h1 className="text-2xl font-display text-realm-gold-400 mb-6">Economy Management</h1>

      {/* Tabs */}
      <div className="border-b border-realm-border mb-6">
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
                  isActive
                    ? 'border-realm-gold-500 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-border/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Listings Tab */}
      {activeTab === 'listings' && (
        <div>
          {listingsLoading ? (
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden animate-pulse">
              <div className="border-b border-realm-border px-4 py-3 flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 border-b border-realm-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (<div key={j} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
                </div>
              ))}
            </div>
          ) : listingsError ? (
            <ErrorMessage error={listingsErr} onRetry={listingsRefetch} />
          ) : !listingsData?.listings?.length ? (
            <div className="text-center py-20">
              <Store className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
              <p className="text-realm-text-muted">No active listings.</p>
            </div>
          ) : (
            <>
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-realm-border text-left">
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Seller</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Item</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Price</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Qty</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Town</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Listed</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-realm-border/50">
                    {listingsData.listings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-realm-bg-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{listing.sellerName}</td>
                        <td className="px-4 py-3 text-sm text-realm-text-primary font-semibold">{listing.itemName}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1 text-realm-gold-400">
                            <CircleDollarSign className="w-3 h-3" />
                            {listing.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{listing.quantity}</td>
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{listing.townName}</td>
                        <td className="px-4 py-3 text-xs text-realm-text-muted">
                          {new Date(listing.listedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteMutation.mutate(listing.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-blood-light/70 hover:text-blood-light border border-blood-dark/30 rounded hover:bg-blood-dark/10 transition-colors disabled:opacity-50"
                            title="Remove listing"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {listingsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    disabled={listingsPage <= 1}
                    onClick={() => setListingsPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-realm-text-secondary text-sm font-display">
                    Page {listingsPage} of {listingsTotalPages}
                  </span>
                  <button
                    disabled={listingsPage >= listingsTotalPages}
                    onClick={() => setListingsPage((p) => Math.min(listingsTotalPages, p + 1))}
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

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          {txLoading ? (
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden animate-pulse">
              <div className="border-b border-realm-border px-4 py-3 flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 border-b border-realm-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (<div key={j} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
                </div>
              ))}
            </div>
          ) : txError ? (
            <ErrorMessage error={txErr} onRetry={txRefetch} />
          ) : !txData?.transactions?.length ? (
            <div className="text-center py-20">
              <TrendingUp className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
              <p className="text-realm-text-muted">No transactions found.</p>
            </div>
          ) : (
            <>
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-realm-border text-left">
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Buyer</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Seller</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Item</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Price</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Qty</th>
                      <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-realm-border/50">
                    {txData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-realm-bg-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{tx.buyerName}</td>
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{tx.sellerName}</td>
                        <td className="px-4 py-3 text-sm text-realm-text-primary font-semibold">{tx.itemName}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1 text-realm-gold-400">
                            <CircleDollarSign className="w-3 h-3" />
                            {tx.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-realm-text-secondary">{tx.quantity}</td>
                        <td className="px-4 py-3 text-xs text-realm-text-muted">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {txTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-realm-text-secondary text-sm font-display">
                    Page {txPage} of {txTotalPages}
                  </span>
                  <button
                    disabled={txPage >= txTotalPages}
                    onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {overviewLoading ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="w-2/5 h-5 bg-realm-bg-800 rounded" />
                      <div className="w-16 h-4 bg-realm-bg-800 rounded" />
                    </div>
                    <div className="w-full h-3 bg-realm-bg-800 rounded" />
                    <div className="w-4/5 h-3 bg-realm-bg-800 rounded" />
                  </div>
                ))}
              </div>
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-80 animate-pulse" />
            </div>
          ) : overviewError ? (
            <ErrorMessage error={overviewErr} onRetry={overviewRefetch} />
          ) : overview ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDollarSign className="w-4 h-4 text-realm-gold-400" />
                    <span className="text-realm-text-muted text-xs">Gold in Circulation</span>
                  </div>
                  <p className="text-2xl font-display text-realm-text-primary">
                    {overview.goldCirculation.toLocaleString()}
                  </p>
                </div>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-realm-gold-400" />
                    <span className="text-realm-text-muted text-xs">Active Listings</span>
                  </div>
                  <p className="text-2xl font-display text-realm-text-primary">
                    {overview.listingCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-realm-gold-400" />
                    <span className="text-realm-text-muted text-xs">Total Listing Value</span>
                  </div>
                  <p className="text-2xl font-display text-realm-text-primary">
                    {overview.totalListingValue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-realm-gold-400" />
                    <span className="text-realm-text-muted text-xs">Transactions (30d)</span>
                  </div>
                  <p className="text-2xl font-display text-realm-text-primary">
                    {overview.transactionsLast30Days.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Transaction volume chart */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h2 className="font-display text-realm-text-primary text-lg mb-4">Transaction Volume (30 Days)</h2>
                {overview.transactionVolume && overview.transactionVolume.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={overview.transactionVolume}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,154,128,0.1)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#A89A80', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                        tickFormatter={(val: string) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: '#A89A80', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A2E',
                          border: '1px solid rgba(168,154,128,0.3)',
                          borderRadius: '8px',
                          color: '#D4C5A9',
                          fontSize: '12px',
                        }}
                        labelFormatter={(val: string) => new Date(val).toLocaleDateString()}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#C9A461"
                        strokeWidth={2}
                        dot={{ fill: '#C9A461', r: 3 }}
                        name="Transactions"
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#6B8E6B"
                        strokeWidth={2}
                        dot={{ fill: '#6B8E6B', r: 3 }}
                        name="Gold Value"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-realm-text-muted text-sm">
                    No transaction data available
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
