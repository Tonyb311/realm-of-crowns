import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Swords,
  Map,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import ActionTimer from '../components/daily-actions/ActionTimer';
import ActionLockInPanel from '../components/daily-actions/ActionLockInPanel';
import CombatParameterPanel from '../components/daily-actions/CombatParameterPanel';
import DailyReportView from '../components/daily-report/DailyReportView';
import ReportHistoryPanel from '../components/daily-report/ReportHistoryPanel';
import FoodInventoryPanel from '../components/food/FoodInventoryPanel';
import FoodPreferencePanel from '../components/food/FoodPreferencePanel';
import HungerStatusIndicator from '../components/food/HungerStatusIndicator';
import NodeMapView from '../components/travel/NodeMapView';
import TravelPlanner from '../components/travel/TravelPlanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SidebarTab = 'food' | 'combat' | 'travel';

interface CharacterHunger {
  hungerState: 'FED' | 'HUNGRY' | 'STARVING' | 'INCAPACITATED';
  daysSinceLastMeal: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyDashboard() {
  const queryClient = useQueryClient();
  const [showReport, setShowReport] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('food');

  // Character data for hunger status
  const { data: character } = useQuery<CharacterHunger>({
    queryKey: ['character', 'hunger'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return {
        hungerState: res.data.hungerState ?? 'FED',
        daysSinceLastMeal: res.data.daysSinceLastMeal ?? 0,
      };
    },
  });

  // Check for new report on mount
  const { data: reportCheck } = useQuery<{ report: { dismissed: boolean } | null }>({
    queryKey: ['reports', 'latest'],
    queryFn: async () => {
      const res = await api.get('/reports/latest');
      return res.data;
    },
  });

  // Show report modal if there's a new undismissed report
  useEffect(() => {
    if (reportCheck?.report && !reportCheck.report.dismissed) {
      setShowReport(true);
    }
  }, [reportCheck]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onReportReady = () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowReport(true);
      setIsProcessing(false);
    };

    const onActionLockedIn = () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'current'] });
    };

    const onTickComplete = () => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['food'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['travel'] });
    };

    const onTickProcessing = () => {
      setIsProcessing(true);
    };

    socket.on('daily-report:ready', onReportReady);
    socket.on('action:locked-in', onActionLockedIn);
    socket.on('tick:complete', onTickComplete);
    socket.on('tick:processing', onTickProcessing);

    return () => {
      socket.off('daily-report:ready', onReportReady);
      socket.off('action:locked-in', onActionLockedIn);
      socket.off('tick:complete', onTickComplete);
      socket.off('tick:processing', onTickProcessing);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-dark-500 pt-12 pb-16">
      {/* Header bar */}
      <div className="px-6 py-3 bg-dark-400 border-b border-dark-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-primary-400" />
          <h1 className="font-display text-xl text-primary-400">Daily Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {character && (
            <HungerStatusIndicator
              hungerState={character.hungerState}
              daysSinceLastMeal={character.daysSinceLastMeal}
            />
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="px-6 py-3">
        <ActionTimer isProcessing={isProcessing} />
      </div>

      {/* Main layout */}
      <div className="px-6 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <ActionLockInPanel />

            {/* Report history */}
            <ReportHistoryPanel />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Sidebar tabs */}
            <div className="flex border-b border-dark-50">
              {([
                { key: 'food' as SidebarTab, label: 'Food', icon: null },
                { key: 'combat' as SidebarTab, label: 'Combat', icon: Swords },
                { key: 'travel' as SidebarTab, label: 'Travel', icon: Map },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSidebarTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-display border-b-2 transition-colors
                    ${sidebarTab === key
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-parchment-500 hover:text-parchment-300'}`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {sidebarTab === 'food' && (
                <motion.div
                  key="food"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <FoodInventoryPanel />
                  <FoodPreferencePanel />
                </motion.div>
              )}

              {sidebarTab === 'combat' && (
                <motion.div
                  key="combat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CombatParameterPanel />
                </motion.div>
              )}

              {sidebarTab === 'travel' && (
                <motion.div
                  key="travel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <NodeMapView />
                  <TravelPlanner />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Daily Report Modal */}
      <AnimatePresence>
        {showReport && (
          <DailyReportView
            asModal
            onDismiss={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
