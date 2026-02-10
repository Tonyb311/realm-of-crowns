import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Cog,
  Sun,
  Moon,
  Waves,
  Feather,
  Skull,
  Wrench,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Shield,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SpecialMechanicHUDProps {
  race: string;
}

interface ChangelingStatus {
  currentAppearance: string;
  currentRace: string;
  isShifted: boolean;
  detected: boolean;
  detectionRisk: number;
}

interface ForgebornStatus {
  condition: number;
  maxCondition: number;
  maintenanceOverdue: boolean;
  lastMaintenance?: string;
  selfRepairAvailable: boolean;
}

interface NightborneStatus {
  inSunlight: boolean;
  penalty: string;
  currentTime: 'day' | 'night' | 'dawn' | 'dusk';
}

interface MerfolkStatus {
  nearWater: boolean;
  waterType?: string;
  speedModifier: number;
  inWaterZone: boolean;
}

interface FaefolkStatus {
  isFlying: boolean;
  canFly: boolean;
  heavyLoad: boolean;
  currentLoad: number;
  maxFlyingLoad: number;
}

interface RevenantStatus {
  deathPenaltyReduction: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Shared expand/collapse wrapper
// ---------------------------------------------------------------------------
function HUDWidget({
  children,
  icon: Icon,
  label,
  accentColor,
  pulse,
}: {
  children: React.ReactNode;
  icon: typeof Eye;
  label: string;
  accentColor: string;
  pulse?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-dark-400/90 backdrop-blur-sm border rounded-lg shadow-lg transition-all ${
        pulse ? `border-${accentColor}-500/60 animate-pulse` : `border-${accentColor}-500/30`
      }`}
      style={{ minWidth: 180 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2"
      >
        <Icon className={`w-4 h-4 text-${accentColor}-400`} />
        <span className={`text-xs font-display text-${accentColor}-300 flex-1 text-left`}>
          {label}
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-parchment-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-parchment-500" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-dark-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Changeling HUD
// ---------------------------------------------------------------------------
function ChangelingHUD() {
  const queryClient = useQueryClient();

  const { data } = useQuery<ChangelingStatus>({
    queryKey: ['special-mechanic', 'changeling'],
    queryFn: async () => (await api.get('/special-mechanics/changeling/status')).data,
    refetchInterval: 10000,
  });

  const revertMutation = useMutation({
    mutationFn: async () => (await api.post('/special-mechanics/changeling/revert')).data,
    onSuccess: () => {
      toast.success('Reverted to true form');
      queryClient.invalidateQueries({ queryKey: ['special-mechanic', 'changeling'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Revert failed'),
  });

  if (!data) return null;

  return (
    <HUDWidget icon={data.isShifted ? EyeOff : Eye} label={data.isShifted ? data.currentAppearance : 'True Form'} accentColor="purple">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-parchment-500">Appearance</span>
          <span className="text-parchment-200">{data.currentAppearance}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-parchment-500">Status</span>
          <span className={data.detected ? 'text-red-400' : 'text-green-400'}>
            {data.detected ? 'Detected' : 'Undetected'}
          </span>
        </div>
        {data.isShifted && (
          <button
            onClick={() => revertMutation.mutate()}
            disabled={revertMutation.isPending}
            className="w-full mt-1 px-2 py-1.5 text-[10px] font-display rounded border
              border-purple-500/40 text-purple-300 hover:bg-purple-900/30 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {revertMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
            ) : (
              'Revert to True Form'
            )}
          </button>
        )}
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Forgeborn HUD
// ---------------------------------------------------------------------------
function ForgebornHUD() {
  const queryClient = useQueryClient();

  const { data } = useQuery<ForgebornStatus>({
    queryKey: ['special-mechanic', 'forgeborn'],
    queryFn: async () => (await api.get('/special-mechanics/forgeborn/status')).data,
    refetchInterval: 15000,
  });

  const selfRepairMutation = useMutation({
    mutationFn: async () => (await api.post('/special-mechanics/forgeborn/self-repair')).data,
    onSuccess: (result) => {
      toast.success(result.message ?? 'Self-repair complete');
      queryClient.invalidateQueries({ queryKey: ['special-mechanic', 'forgeborn'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Repair failed'),
  });

  if (!data) return null;

  const condPct = data.maxCondition > 0 ? (data.condition / data.maxCondition) * 100 : 100;
  const barColor =
    condPct > 60 ? 'bg-green-500' : condPct > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <HUDWidget
      icon={Cog}
      label={`Condition ${Math.round(condPct)}%`}
      accentColor={condPct > 60 ? 'green' : condPct > 30 ? 'yellow' : 'red'}
      pulse={data.maintenanceOverdue}
    >
      <div className="space-y-2">
        {/* Condition bar */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-parchment-500">Condition</span>
            <span className="text-parchment-400">{data.condition}/{data.maxCondition}</span>
          </div>
          <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${condPct}%` }}
            />
          </div>
        </div>

        {data.maintenanceOverdue && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Maintenance overdue
          </div>
        )}

        {data.selfRepairAvailable && (
          <button
            onClick={() => selfRepairMutation.mutate()}
            disabled={selfRepairMutation.isPending}
            className="w-full px-2 py-1.5 text-[10px] font-display rounded border
              border-amber-500/40 text-amber-300 hover:bg-amber-900/30 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {selfRepairMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Wrench className="w-3 h-3" />
                Self-Repair
              </>
            )}
          </button>
        )}
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Nightborne HUD
// ---------------------------------------------------------------------------
function NightborneHUD() {
  const { data } = useQuery<NightborneStatus>({
    queryKey: ['special-mechanic', 'nightborne'],
    queryFn: async () => (await api.get('/special-mechanics/nightborne/status')).data,
    refetchInterval: 30000,
  });

  if (!data) return null;

  const isDay = data.currentTime === 'day';
  const TimeIcon = isDay ? Sun : Moon;

  return (
    <HUDWidget
      icon={TimeIcon}
      label={data.inSunlight ? 'Sunlight' : 'Shade'}
      accentColor={data.inSunlight ? 'amber' : 'blue'}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-parchment-500">Time</span>
          <span className="text-parchment-200 capitalize">{data.currentTime}</span>
        </div>
        {data.inSunlight && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-900/20 rounded px-2 py-1">
            <Sun className="w-3 h-3" />
            {data.penalty}
          </div>
        )}
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Merfolk HUD
// ---------------------------------------------------------------------------
function MerfolkHUD() {
  const { data } = useQuery<MerfolkStatus>({
    queryKey: ['special-mechanic', 'merfolk'],
    queryFn: async () => (await api.get('/special-mechanics/merfolk/status')).data,
    refetchInterval: 15000,
  });

  if (!data) return null;

  return (
    <HUDWidget
      icon={Waves}
      label={data.inWaterZone ? 'In Water' : 'On Land'}
      accentColor={data.inWaterZone ? 'cyan' : 'parchment'}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-parchment-500">Speed</span>
          <span className={data.speedModifier >= 0 ? 'text-green-400' : 'text-red-400'}>
            {data.speedModifier >= 0 ? '+' : ''}{data.speedModifier}%
          </span>
        </div>
        {data.waterType && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-parchment-500">Water</span>
            <span className="text-cyan-300 capitalize">{data.waterType}</span>
          </div>
        )}
        {data.inWaterZone && (
          <div className="h-1 rounded-full bg-cyan-500/30 overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400/60 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        )}
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Faefolk HUD
// ---------------------------------------------------------------------------
function FaefolkHUD() {
  const { data } = useQuery<FaefolkStatus>({
    queryKey: ['special-mechanic', 'faefolk'],
    queryFn: async () => (await api.get('/special-mechanics/faefolk/status')).data,
    refetchInterval: 15000,
  });

  if (!data) return null;

  return (
    <HUDWidget
      icon={Feather}
      label={data.isFlying ? 'Flying' : 'Grounded'}
      accentColor={data.isFlying ? 'sky' : 'parchment'}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-parchment-500">Flight</span>
          <span className={data.isFlying ? 'text-sky-400' : 'text-parchment-400'}>
            {data.isFlying ? 'Active' : data.canFly ? 'Ready' : 'Unavailable'}
          </span>
        </div>
        {data.heavyLoad && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-900/20 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3" />
            Heavy load - flight impaired
          </div>
        )}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-parchment-500">Load</span>
          <span className="text-parchment-400">
            {data.currentLoad}/{data.maxFlyingLoad}
          </span>
        </div>
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Revenant HUD
// ---------------------------------------------------------------------------
function RevenantHUD() {
  const { data } = useQuery<RevenantStatus>({
    queryKey: ['special-mechanic', 'revenant'],
    queryFn: async () => (await api.get('/special-mechanics/revenant/status')).data,
    refetchInterval: 60000,
  });

  if (!data) return null;

  return (
    <HUDWidget icon={Skull} label="Death Ward" accentColor="red">
      <div className="flex items-center gap-2 text-xs">
        <Shield className="w-3.5 h-3.5 text-green-400" />
        <span className="text-parchment-300">
          {data.deathPenaltyReduction}% Reduced Death Penalty
        </span>
      </div>
    </HUDWidget>
  );
}

// ---------------------------------------------------------------------------
// Race-to-component mapping
// ---------------------------------------------------------------------------
const RACE_HUDS: Record<string, React.ComponentType> = {
  changeling: ChangelingHUD,
  forgeborn: ForgebornHUD,
  nightborne: NightborneHUD,
  merfolk: MerfolkHUD,
  faefolk: FaefolkHUD,
  revenant: RevenantHUD,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SpecialMechanicHUD({ race }: SpecialMechanicHUDProps) {
  const normalizedRace = race.toLowerCase();
  const HUDComponent = RACE_HUDS[normalizedRace];

  if (!HUDComponent) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <HUDComponent />
    </div>
  );
}
