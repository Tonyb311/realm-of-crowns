import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pickaxe,
  Hammer,
  Handshake,
  Loader2,
  AlertTriangle,
  BookOpen,
  User,
  Lock,
} from 'lucide-react';
import api from '../services/api';
import { useCharacter } from '../hooks/useCharacter';
import ProfessionCard from '../components/professions/ProfessionCard';
import ProfessionDetail from '../components/professions/ProfessionDetail';
import LearnProfessionModal from '../components/professions/LearnProfessionModal';
import { PROFESSION_UNLOCK_LEVEL } from '@shared/data/progression/xp-curve';
import type { ProfessionCategory } from '@shared/data/professions/types';
import type { ProfessionCardData } from '../components/professions/ProfessionCard';

// ---------------------------------------------------------------------------
// Types from API
// ---------------------------------------------------------------------------
interface MyProfession {
  professionType: string;
  level: number;
  tier: string;
  xp: number;
  xpToNextLevel: number;
  category: string;
  description: string;
  racialBonuses?: string[];
}

interface AvailableProfession {
  type: string;
  name: string;
  category: ProfessionCategory;
  description: string;
  primaryStat: string;
  status: 'learned' | 'available' | 'locked' | 'inactive';
  lockReason?: string;
  racialBonuses?: string[];
  outputProducts?: string[];
  townTypeAffinity?: string[];
  level?: number;
  tier?: string;
  xp?: number;
  xpToNextLevel?: number;
  limits?: {
    totalUsed: number;
    totalMax: number;
    categoryLimits: { category: string; used: number; max: number }[];
  };
}

interface AvailableResponse {
  professions: AvailableProfession[];
  limits: {
    totalUsed: number;
    totalMax: number;
    categoryLimits: { category: string; used: number; max: number }[];
  };
}

// ---------------------------------------------------------------------------
// Category tab config
// ---------------------------------------------------------------------------
type ViewMode = 'browse' | 'mine';
type CategoryTab = 'GATHERING' | 'CRAFTING' | 'SERVICE';

const CATEGORY_TABS: { key: CategoryTab; label: string; icon: typeof Pickaxe }[] = [
  { key: 'GATHERING', label: 'Gathering', icon: Pickaxe },
  { key: 'CRAFTING', label: 'Crafting', icon: Hammer },
  { key: 'SERVICE', label: 'Service', icon: Handshake },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProfessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('GATHERING');
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [learnTarget, setLearnTarget] = useState<AvailableProfession | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<string | null>(null);
  const [learnError, setLearnError] = useState<string | null>(null);

  // Character data for level gating
  const { data: character } = useCharacter<{ level: number }>();
  const belowProfessionLevel = (character?.level ?? 0) < PROFESSION_UNLOCK_LEVEL;

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------
  const { data: myProfessions, isLoading: myLoading } = useQuery<MyProfession[]>({
    queryKey: ['professions', 'mine'],
    queryFn: async () => {
      const res = await api.get('/professions/mine');
      return res.data.professions ?? res.data;
    },
  });

  const { data: availableData, isLoading: availableLoading } = useQuery<AvailableResponse>({
    queryKey: ['professions', 'available'],
    queryFn: async () => {
      const res = await api.get('/professions/available');
      const raw = res.data;
      // Normalize backend shape (maxActive/currentActive/categories object)
      // to frontend shape (totalUsed/totalMax/categoryLimits array)
      const rawLimits = raw?.limits;
      const cats = rawLimits?.categories ?? rawLimits?.categoryLimits ?? {};
      const categoryLimits = Array.isArray(cats)
        ? cats
        : Object.entries(cats).map(([category, v]: [string, any]) => ({
            category,
            used: v?.current ?? v?.used ?? 0,
            max: v?.max ?? 2,
          }));
      return {
        professions: raw?.professions ?? [],
        limits: {
          totalUsed: rawLimits?.currentActive ?? rawLimits?.totalUsed ?? 0,
          totalMax: rawLimits?.maxActive ?? rawLimits?.totalMax ?? 3,
          categoryLimits,
        },
      };
    },
  });

  const allProfessions = availableData?.professions ?? [];
  const limits = availableData?.limits ?? {
    totalUsed: myProfessions?.length ?? 0,
    totalMax: 3,
    categoryLimits: [
      { category: 'GATHERING', used: 0, max: 2 },
      { category: 'CRAFTING', used: 0, max: 2 },
      { category: 'SERVICE', used: 0, max: 1 },
    ],
  };

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------
  const learnMutation = useMutation({
    mutationFn: async (professionType: string) => {
      const res = await api.post('/professions/learn', { professionType });
      return res.data;
    },
    onSuccess: () => {
      setLearnTarget(null);
      setLearnError(null);
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
    onError: (err: any) => {
      setLearnError(err.response?.data?.message ?? err.message ?? 'Failed to learn profession');
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async (professionType: string) => {
      const res = await api.post('/professions/abandon', { professionType });
      return res.data;
    },
    onSuccess: () => {
      setAbandonTarget(null);
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    },
  });

  // -----------------------------------------------------------------------
  // Filter professions by category tab
  // -----------------------------------------------------------------------
  const filteredProfessions = allProfessions.filter(
    (p) => p.category === categoryTab
  );

  // -----------------------------------------------------------------------
  // Convert to card data
  // -----------------------------------------------------------------------
  function toCardData(p: AvailableProfession): ProfessionCardData {
    return {
      professionType: p.type,
      name: p.name,
      category: p.category,
      description: p.description,
      primaryStat: p.primaryStat,
      status: p.status,
      lockReason: p.lockReason,
      level: p.level,
      tier: p.tier as any,
      xp: p.xp,
      xpToNextLevel: p.xpToNextLevel,
      outputProducts: p.outputProducts,
      townTypeAffinity: p.townTypeAffinity,
      racialBonuses: p.racialBonuses,
    };
  }

  function myProfToCardData(p: MyProfession): ProfessionCardData {
    return {
      professionType: p.professionType,
      name: p.professionType.charAt(0) + p.professionType.slice(1).toLowerCase().replace(/_/g, ' '),
      category: p.category as ProfessionCategory,
      description: p.description,
      primaryStat: '',
      status: 'learned',
      level: p.level,
      tier: p.tier as any,
      xp: p.xp,
      xpToNextLevel: p.xpToNextLevel,
      racialBonuses: p.racialBonuses,
    };
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const isLoading = viewMode === 'browse' ? availableLoading : myLoading;

  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">Professions</h1>
              <p className="text-realm-text-muted text-sm mt-1">
                Learn and master up to 3 professions
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/crafting')}
                className="px-5 py-2 border border-realm-gold-400/60 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Workshop
              </button>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>

          {/* Slot indicator */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-realm-text-muted">Slots:</span>
              <div className="flex gap-1">
                {Array.from({ length: limits.totalMax }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-2 rounded-full ${
                      i < limits.totalUsed ? 'bg-realm-gold-500' : 'bg-realm-bg-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-realm-text-secondary">
                {limits.totalUsed}/{limits.totalMax}
              </span>
            </div>
            <div className="h-4 w-px bg-realm-border hidden sm:block" />
            {limits.categoryLimits.map((cl) => (
              <span key={cl.category} className="text-[10px] text-realm-text-muted capitalize">
                {cl.category.toLowerCase()}: {cl.used}/{cl.max}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Level gate banner */}
        {belowProfessionLevel && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-realm-gold-400/30 bg-realm-gold-400/5 px-5 py-3">
            <Lock className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
            <p className="text-sm text-realm-gold-400 font-display">
              Professions unlock at Level {PROFESSION_UNLOCK_LEVEL}.{' '}
              <span className="text-realm-text-muted font-sans">
                Gain XP through combat and quests to reach Level {PROFESSION_UNLOCK_LEVEL}.
              </span>
            </p>
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex border-b border-realm-border mb-6">
          <button
            onClick={() => setViewMode('browse')}
            className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
              viewMode === 'browse'
                ? 'border-realm-gold-400 text-realm-gold-400'
                : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Browse All
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
              viewMode === 'mine'
                ? 'border-realm-gold-400 text-realm-gold-400'
                : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'
            }`}
          >
            <User className="w-4 h-4" />
            My Professions
            {myProfessions && myProfessions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-realm-gold-400/15 text-realm-gold-400 text-[10px] rounded-full">
                {myProfessions.length}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
          </div>
        ) : viewMode === 'browse' ? (
          /* ----------------------------------------------------------------
           * Browse All mode
           * ---------------------------------------------------------------- */
          <div>
            {/* Category tabs */}
            <div className="flex gap-2 mb-6">
              {CATEGORY_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCategoryTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-display rounded-lg border transition-colors ${
                    categoryTab === key
                      ? 'bg-realm-gold-400/10 text-realm-gold-400 border-realm-gold-400/30'
                      : 'bg-realm-bg-700 text-realm-text-muted border-realm-border hover:border-realm-gold-400/20 hover:text-realm-text-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="text-[10px] opacity-60 ml-0.5">
                    ({allProfessions.filter((p) => p.category === key).length})
                  </span>
                </button>
              ))}
            </div>

            {/* Profession grid */}
            {filteredProfessions.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
                <Hammer className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">No professions in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfessions.map((prof) => (
                  <ProfessionCard
                    key={prof.type}
                    profession={toCardData(prof)}
                    onClick={() => setSelectedProfession(prof.type)}
                    onLearn={
                      prof.status === 'available' && !belowProfessionLevel
                        ? () => setLearnTarget(prof)
                        : undefined
                    }
                    levelLocked={belowProfessionLevel}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ----------------------------------------------------------------
           * My Professions mode
           * ---------------------------------------------------------------- */
          <div>
            {!myProfessions || myProfessions.length === 0 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
                <BookOpen className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">You haven't learned any professions yet.</p>
                <button
                  onClick={() => setViewMode('browse')}
                  className="mt-4 px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
                >
                  Browse Professions
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProfessions.map((prof) => {
                  // Try to get the full data from available list
                  const fullData = allProfessions.find(
                    (p) => p.type === prof.professionType
                  );
                  const cardData = fullData
                    ? toCardData(fullData)
                    : myProfToCardData(prof);

                  return (
                    <ProfessionCard
                      key={prof.professionType}
                      profession={cardData}
                      onClick={() => setSelectedProfession(prof.professionType)}
                      onAbandon={() => setAbandonTarget(prof.professionType)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedProfession && (
        <ProfessionDetail
          professionType={selectedProfession}
          onClose={() => setSelectedProfession(null)}
          isLearned={allProfessions.find((p) => p.type === selectedProfession)?.status === 'learned'}
          isAvailable={allProfessions.find((p) => p.type === selectedProfession)?.status === 'available' && !belowProfessionLevel}
          onLearn={
            allProfessions.find((p) => p.type === selectedProfession)?.status === 'available' && !belowProfessionLevel
              ? () => {
                  const prof = allProfessions.find((p) => p.type === selectedProfession);
                  if (prof) {
                    setSelectedProfession(null);
                    setLearnTarget(prof);
                  }
                }
              : undefined
          }
          onAbandon={
            allProfessions.find((p) => p.type === selectedProfession)?.status === 'learned'
              ? () => {
                  setSelectedProfession(null);
                  setAbandonTarget(selectedProfession);
                }
              : undefined
          }
        />
      )}

      {/* Learn confirmation modal */}
      {learnTarget && (
        <LearnProfessionModal
          professionName={learnTarget.name}
          professionType={learnTarget.type}
          description={learnTarget.description}
          slotsUsed={limits.totalUsed}
          slotsMax={limits.totalMax}
          categoryLimits={limits.categoryLimits}
          onConfirm={() => learnMutation.mutate(learnTarget.type)}
          onCancel={() => { setLearnTarget(null); setLearnError(null); }}
          isLoading={learnMutation.isPending}
          error={learnError}
        />
      )}

      {/* Abandon confirmation modal */}
      {abandonTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAbandonTarget(null)} />
          <div className="relative bg-realm-bg-800 border border-realm-border rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-realm-danger flex-shrink-0" />
              <div>
                <h3 className="font-display text-lg text-realm-danger">Abandon Profession?</h3>
                <p className="text-sm text-realm-text-secondary mt-1">
                  You will lose all progress, levels, and XP for this profession. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => abandonMutation.mutate(abandonTarget)}
                disabled={abandonMutation.isPending}
                className="flex-1 py-2.5 bg-realm-danger text-realm-text-primary font-display text-sm rounded hover:bg-realm-danger/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {abandonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {abandonMutation.isPending ? 'Abandoning...' : 'Abandon'}
              </button>
              <button
                onClick={() => setAbandonTarget(null)}
                disabled={abandonMutation.isPending}
                className="flex-1 py-2.5 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
