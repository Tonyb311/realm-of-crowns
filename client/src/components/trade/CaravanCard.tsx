import { useEffect, useState } from 'react';
import {
  Truck,
  MapPin,
  Shield,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CaravanData {
  id: string;
  caravanType: string;
  caravanName: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  cargo: Array<{ itemId: string; quantity: number; itemName: string; unitValue: number }>;
  totalItems: number;
  capacity: number;
  status: string;
  escort: string | null;
  insurance: string | null;
  departedAt: string | null;
  arrivesAt: string | null;
  progress: number;
}

interface CaravanCardProps {
  caravan: CaravanData;
  onCollect?: (caravanId: string) => void;
  onResolveAmbush?: (caravanId: string) => void;
  onClick?: (caravan: CaravanData) => void;
  isCollecting?: boolean;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  PENDING: { label: 'Loading', color: 'text-realm-gold-400', bgColor: 'bg-realm-gold-500/15', borderColor: 'border-realm-gold-500/30' },
  IN_PROGRESS: { label: 'In Transit', color: 'text-realm-teal-300', bgColor: 'bg-realm-teal-300/15', borderColor: 'border-realm-teal-300/30' },
  COMPLETED: { label: 'Arrived', color: 'text-realm-success', bgColor: 'bg-realm-success/15', borderColor: 'border-realm-success/30' },
  FAILED: { label: 'Ambushed!', color: 'text-realm-danger', bgColor: 'bg-realm-danger/15', borderColor: 'border-realm-danger/30' },
};

function formatEta(arrivesAt: string): string {
  const diff = new Date(arrivesAt).getTime() - Date.now();
  if (diff <= 0) return 'Arriving...';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function cargoValueTotal(cargo: CaravanData['cargo']): number {
  return cargo.reduce((sum, c) => sum + c.unitValue * c.quantity, 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CaravanCard({ caravan, onCollect, onResolveAmbush, onClick, isCollecting }: CaravanCardProps) {
  const statusCfg = STATUS_CONFIG[caravan.status] ?? STATUS_CONFIG.PENDING;
  const [liveProgress, setLiveProgress] = useState(caravan.progress);

  // Live progress ticker for in-transit caravans
  useEffect(() => {
    if (caravan.status !== 'IN_PROGRESS' || !caravan.departedAt || !caravan.arrivesAt) return;
    const interval = setInterval(() => {
      const totalMs = new Date(caravan.arrivesAt!).getTime() - new Date(caravan.departedAt!).getTime();
      const elapsedMs = Date.now() - new Date(caravan.departedAt!).getTime();
      setLiveProgress(Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
    }, 5000);
    return () => clearInterval(interval);
  }, [caravan.status, caravan.departedAt, caravan.arrivesAt]);

  const isArrived = caravan.status === 'IN_PROGRESS' && caravan.arrivesAt && new Date(caravan.arrivesAt) <= new Date();
  const totalValue = cargoValueTotal(caravan.cargo);

  return (
    <div
      className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 transition-all hover:border-realm-gold-500/30 group cursor-pointer"
      onClick={() => onClick?.(caravan)}
    >
      {/* Header: Route + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
          <span className="font-display text-realm-text-primary text-sm truncate">
            {caravan.from.name}
          </span>
          <span className="text-realm-text-muted text-xs">→</span>
          <span className="font-display text-realm-text-primary text-sm truncate">
            {caravan.to.name}
          </span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-display ${statusCfg.bgColor} ${statusCfg.color} border ${statusCfg.borderColor} rounded-full flex-shrink-0`}>
          {caravan.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
          {caravan.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
          {statusCfg.label}
        </span>
      </div>

      {/* Caravan type + meta */}
      <div className="flex items-center gap-3 text-[11px] text-realm-text-muted mb-3">
        <span>{caravan.caravanName}</span>
        {caravan.escort && (
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {caravan.escort.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Progress bar for in-transit */}
      {caravan.status === 'IN_PROGRESS' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-realm-text-muted mb-1">
            <span>{liveProgress}%</span>
            {caravan.arrivesAt && !isArrived && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA {formatEta(caravan.arrivesAt)}
              </span>
            )}
            {isArrived && (
              <span className="text-realm-success font-display">Ready to collect!</span>
            )}
          </div>
          <div className="w-full h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isArrived ? 'bg-realm-success' : 'bg-realm-gold-500'}`}
              style={{ width: `${liveProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cargo summary */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-realm-text-muted">
          <Package className="w-3 h-3" />
          {caravan.totalItems}/{caravan.capacity} items
          <span className="text-realm-text-muted/60 ml-1">({totalValue}g value)</span>
        </span>
      </div>

      {/* Action buttons */}
      {isArrived && onCollect && (
        <button
          onClick={(e) => { e.stopPropagation(); onCollect(caravan.id); }}
          disabled={isCollecting}
          className="mt-3 w-full px-4 py-2 bg-realm-success text-realm-text-primary font-display text-sm rounded hover:bg-realm-success/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCollecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          Collect Cargo
        </button>
      )}

      {caravan.status === 'FAILED' && onResolveAmbush && (
        <button
          onClick={(e) => { e.stopPropagation(); onResolveAmbush(caravan.id); }}
          className="mt-3 w-full px-4 py-2 bg-realm-danger text-realm-text-primary font-display text-sm rounded hover:bg-realm-danger/80 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Resolve Ambush
        </button>
      )}
    </div>
  );
}
