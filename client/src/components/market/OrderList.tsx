import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { RealmButton } from '../ui/RealmButton';
import { RealmBadge } from '../ui/RealmBadge';
import { RealmSkeleton } from '../ui/RealmSkeleton';
import GoldAmount from '../shared/GoldAmount';
import RollBreakdown from './RollBreakdown';
import api from '../../services/api';

interface OrderListing {
  id: string;
  price: number;
  itemName: string;
  seller: { id: string; name: string };
}

interface BuyOrder {
  id: string;
  bidPrice: number;
  status: string;
  placedAt: string;
  resolvedAt: string | null;
  priorityScore: number | null;
  rollResult: number | null;
  rollBreakdown: {
    raw: number;
    modifiers: Array<{ source: string; value: number }>;
    total: number;
  } | null;
  listing: OrderListing;
}

interface MyOrdersResponse {
  orders: BuyOrder[];
}

export default function OrderList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MyOrdersResponse>({
    queryKey: ['market', 'my-orders'],
    queryFn: async () => (await api.get('/market/my-orders')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return (await api.delete(`/market/orders/${orderId}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['characters', 'current'] });
    },
  });

  const orders = data?.orders ?? [];
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const resolvedOrders = orders.filter((o) => o.status !== 'pending');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <RealmSkeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
        <p className="text-realm-text-muted mb-2">No buy orders placed.</p>
        <p className="text-realm-text-muted/60 text-sm">
          Browse the market and place orders on items you want.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-display text-realm-text-secondary mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-realm-gold-400" />
            Pending Orders ({pendingOrders.length})
          </h3>
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-realm-border text-left">
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Item</th>
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Seller</th>
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Ask Price</th>
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Your Bid</th>
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Placed</th>
                  <th className="px-4 py-3 text-realm-text-muted text-xs font-display"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-realm-border/50">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-realm-bg-600/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-realm-text-primary font-semibold">
                      {order.listing.itemName}
                    </td>
                    <td className="px-4 py-3 text-xs text-realm-text-muted">
                      {order.listing.seller.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <GoldAmount amount={order.listing.price} className="text-realm-text-secondary" />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <GoldAmount amount={order.bidPrice} className="text-realm-gold-400" />
                    </td>
                    <td className="px-4 py-3 text-xs text-realm-text-muted">
                      {new Date(order.placedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <RealmButton
                        variant="danger"
                        size="sm"
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </RealmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolved orders */}
      {resolvedOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-display text-realm-text-secondary mb-3">
            Resolved Orders ({resolvedOrders.length})
          </h3>
          <div className="space-y-2">
            {resolvedOrders.map((order) => {
              const isWon = order.status === 'won' || order.status === 'fulfilled';
              const isLost = order.status === 'lost' || order.status === 'outbid';
              const isCancelled = order.status === 'cancelled';

              return (
                <div
                  key={order.id}
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
                        {order.listing.itemName}
                      </span>
                      {isWon && (
                        <RealmBadge variant="uncommon">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Won
                          </span>
                        </RealmBadge>
                      )}
                      {isLost && (
                        <span className="inline-flex items-center gap-1 font-display text-xs uppercase tracking-wider px-2 py-0.5 rounded-sm border border-realm-danger/50 text-realm-danger">
                          <XCircle className="w-3 h-3" />
                          Lost
                        </span>
                      )}
                      {isCancelled && (
                        <RealmBadge variant="default">Cancelled</RealmBadge>
                      )}
                    </div>
                    <GoldAmount amount={order.bidPrice} className="text-realm-text-secondary text-sm" />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-realm-text-muted">
                    <span>Seller: {order.listing.seller.name}</span>
                    {order.resolvedAt && (
                      <span>
                        Resolved: {new Date(order.resolvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Roll breakdown for resolved */}
                  {order.rollBreakdown && (
                    <div className="mt-2 pt-2 border-t border-realm-border/50">
                      <RollBreakdown rollBreakdown={order.rollBreakdown} />
                    </div>
                  )}

                  {/* Refund notice for lost orders */}
                  {isLost && (
                    <p className="text-realm-text-muted/70 text-[10px] mt-2">
                      Your bid of {order.bidPrice}g has been refunded.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
