import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  BarChart3,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react';
import { useTradeEvents } from '../hooks/useTradeEvents';
import CaravanManager from '../components/trade/CaravanManager';
import PriceCompare from '../components/trade/PriceCompare';
import BestTrades from '../components/trade/BestTrades';
import MerchantDashboard from '../components/trade/MerchantDashboard';
import AmbushEvent from '../components/trade/AmbushEvent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = 'caravans' | 'prices' | 'best-trades' | 'merchant';

const TABS: Array<{ key: Tab; label: string; icon: typeof Truck }> = [
  { key: 'caravans', label: 'Caravans', icon: Truck },
  { key: 'prices', label: 'Market Prices', icon: BarChart3 },
  { key: 'best-trades', label: 'Best Trades', icon: TrendingUp },
  { key: 'merchant', label: 'Merchant Stats', icon: ShoppingCart },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TradePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('caravans');
  const { ambushedCaravanId, clearAmbush } = useTradeEvents();

  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">Trade</h1>
              <p className="text-realm-text-muted text-sm mt-1">Manage caravans, compare prices, and grow your merchant empire</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/market')}
                className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Go to Market
              </button>
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

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex border-b border-realm-border mb-6 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors whitespace-nowrap
                ${activeTab === key
                  ? 'border-realm-gold-400 text-realm-gold-400'
                  : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'caravans' && <CaravanManager />}
        {activeTab === 'prices' && <PriceCompare />}
        {activeTab === 'best-trades' && (
          <BestTrades
            onStartTrade={() => setActiveTab('caravans')}
          />
        )}
        {activeTab === 'merchant' && <MerchantDashboard />}
      </div>

      {/* Ambush modal from socket events */}
      {ambushedCaravanId && (
        <AmbushEvent
          caravanId={ambushedCaravanId}
          onClose={clearAmbush}
        />
      )}
    </div>
  );
}
