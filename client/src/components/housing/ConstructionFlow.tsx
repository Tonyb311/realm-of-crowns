import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Package,
  Loader2,
  AlertCircle,
  Clock,
  Hammer,
} from 'lucide-react';
import api from '../../services/api';
import { buildingTypeLabel } from './BuildingCard';
import ConstructionProgress from './ConstructionProgress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MaterialRequirement {
  itemName: string;
  quantity: number;
}

interface BuildingTypeOption {
  type: string;
  label: string;
  materials: MaterialRequirement[];
  constructionTimeHours: number;
}

interface ConstructionFlowProps {
  townId: string;
  onClose: () => void;
  /** If provided, skip step 1 and go directly to material deposit for an existing building */
  existingBuildingId?: string;
}

// ---------------------------------------------------------------------------
// Known building types
// ---------------------------------------------------------------------------
const ALL_BUILDING_TYPES = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE',
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
  'STABLE', 'WAREHOUSE', 'BANK', 'INN', 'MARKET_STALL',
  'FARM', 'RANCH', 'MINE',
];

type Step = 'select' | 'materials' | 'deposit' | 'building' | 'done';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ConstructionFlow({ townId, onClose, existingBuildingId }: ConstructionFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(existingBuildingId ? 'materials' : 'select');
  const [selectedType, setSelectedType] = useState<string>('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingId, setBuildingId] = useState(existingBuildingId ?? '');
  const [error, setError] = useState('');

  // Fetch inventory for checking materials
  const { data: character } = useQuery<{ inventory: { templateName: string; quantity: number }[] }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const inventoryByName: Record<string, number> = {};
  for (const item of character?.inventory ?? []) {
    inventoryByName[item.templateName] = (inventoryByName[item.templateName] ?? 0) + item.quantity;
  }

  // Fetch construction status for existing building
  const { data: constructionData, refetch: refetchConstruction } = useQuery({
    queryKey: ['construction', 'status', buildingId],
    queryFn: async () => {
      const res = await api.get(`/buildings/construction-status?buildingId=${buildingId}`);
      return res.data;
    },
    enabled: !!buildingId && step !== 'select',
  });

  // Request permit mutation
  const requestPermitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/buildings/request-permit', {
        townId,
        buildingType: selectedType,
        name: buildingName,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setBuildingId(data.building.id);
      setStep('materials');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to request building permit');
    },
  });

  // Deposit materials mutation
  const depositMutation = useMutation({
    mutationFn: async (materials: { itemName: string; quantity: number }[]) => {
      const res = await api.post('/buildings/deposit-materials', {
        buildingId,
        materials,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      refetchConstruction();
      if (data.readyToStartConstruction) {
        setStep('building');
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to deposit materials');
    },
  });

  // Start construction mutation
  const startConstructionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/buildings/start-construction', { buildingId });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      refetchConstruction();
      setStep('done');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Failed to start construction');
    },
  });

  // Complete construction mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/buildings/complete-construction', { buildingId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', 'town'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Construction not yet complete');
    },
  });

  // Deposit all available materials at once
  function handleDepositAll() {
    if (!constructionData?.construction) return;
    const mats: { itemName: string; quantity: number }[] = [];
    for (const mat of constructionData.construction.materialProgress) {
      const stillNeeded = mat.required - mat.deposited;
      if (stillNeeded <= 0) continue;
      const available = inventoryByName[mat.itemName] ?? 0;
      const toDeposit = Math.min(stillNeeded, available);
      if (toDeposit > 0) {
        mats.push({ itemName: mat.itemName, quantity: toDeposit });
      }
    }
    if (mats.length === 0) {
      setError('You do not have any of the required materials to deposit.');
      return;
    }
    depositMutation.mutate(mats);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative bg-dark-400 border border-dark-50 rounded-lg max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50">
          <h3 className="font-display text-lg text-primary-400">
            {step === 'select' && 'Choose Building Type'}
            {step === 'materials' && 'Deposit Materials'}
            {step === 'deposit' && 'Deposit Materials'}
            {step === 'building' && 'Start Construction'}
            {step === 'done' && 'Under Construction'}
          </h3>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Select building type */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {ALL_BUILDING_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-3 text-left rounded border text-sm transition-colors
                      ${selectedType === type
                        ? 'border-primary-400 bg-primary-400/10 text-primary-400'
                        : 'border-dark-50 bg-dark-500 text-parchment-300 hover:border-dark-50/80'}`}
                  >
                    {buildingTypeLabel(type)}
                  </button>
                ))}
              </div>

              {selectedType && (
                <div>
                  <label className="block text-xs text-parchment-500 mb-1">Building Name</label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder={`My ${buildingTypeLabel(selectedType)}`}
                    maxLength={100}
                    className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-sm text-parchment-200 placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
                  />
                </div>
              )}

              <button
                onClick={() => requestPermitMutation.mutate()}
                disabled={!selectedType || !buildingName.trim() || requestPermitMutation.isPending}
                className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {requestPermitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Requesting Permit...</>
                ) : (
                  <>Request Building Permit <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Materials deposit */}
          {(step === 'materials' || step === 'deposit') && constructionData?.construction && (
            <div className="space-y-4">
              <ConstructionProgress
                status={constructionData.construction.status}
                targetLevel={constructionData.construction.targetLevel}
                materialProgress={constructionData.construction.materialProgress}
                timeProgress={constructionData.construction.timeProgress}
              />

              {constructionData.construction.status === 'PENDING' && (
                <>
                  {/* Inventory check per material */}
                  <div className="border border-dark-50 rounded p-3">
                    <h4 className="text-xs font-display text-parchment-500 uppercase tracking-wider mb-2">
                      Your Inventory
                    </h4>
                    {constructionData.construction.materialProgress.map((mat: any) => {
                      const have = inventoryByName[mat.itemName] ?? 0;
                      const stillNeeded = mat.required - mat.deposited;
                      const enough = have >= stillNeeded;
                      return (
                        <div key={mat.itemName} className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-parchment-300">{mat.itemName}</span>
                          <span className={enough ? 'text-green-400' : 'text-red-400'}>
                            Have {have} / Need {stillNeeded > 0 ? stillNeeded : 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleDepositAll}
                    disabled={depositMutation.isPending}
                    className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {depositMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Depositing...</>
                    ) : (
                      <><Package className="w-4 h-4" /> Deposit Available Materials</>
                    )}
                  </button>
                </>
              )}

              {/* All deposited, offer to start construction */}
              {constructionData.construction.status === 'PENDING' &&
                constructionData.construction.materialProgress.every((m: any) => m.deposited >= m.required) && (
                <button
                  onClick={() => startConstructionMutation.mutate()}
                  disabled={startConstructionMutation.isPending}
                  className="w-full py-2.5 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {startConstructionMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                  ) : (
                    <><Hammer className="w-4 h-4" /> Start Construction</>
                  )}
                </button>
              )}

              {/* In progress, offer complete if timer done */}
              {constructionData.construction.status === 'IN_PROGRESS' &&
                constructionData.construction.timeProgress?.isComplete && (
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="w-full py-2.5 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {completeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Complete Construction</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step: Building started */}
          {step === 'building' && (
            <div className="space-y-4">
              <ConstructionProgress
                status={constructionData?.construction?.status ?? 'PENDING'}
                targetLevel={constructionData?.construction?.targetLevel ?? 1}
                materialProgress={constructionData?.construction?.materialProgress ?? []}
                timeProgress={constructionData?.construction?.timeProgress ?? null}
              />
              <button
                onClick={() => startConstructionMutation.mutate()}
                disabled={startConstructionMutation.isPending}
                className="w-full py-2.5 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {startConstructionMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                ) : (
                  <><Hammer className="w-4 h-4" /> Start Construction</>
                )}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <Clock className="w-12 h-12 text-primary-400 mx-auto" />
              </motion.div>
              <div>
                <h4 className="font-display text-lg text-parchment-200">Construction Started!</h4>
                <p className="text-sm text-parchment-500 mt-1">
                  Your building is now under construction. Check back when the timer completes.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
