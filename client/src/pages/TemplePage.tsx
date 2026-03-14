import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Church, Shield, Scale, Flame, Eye, HeartHandshake, BrickWall, Gavel,
  Smile, Handshake, Crown, EyeOff, BookOpen, Users, Star, AlertTriangle, X, Coins, Vote, Sparkles, Heart, Scroll, Landmark,
  TrendingUp, TrendingDown, Minus, Skull,
} from 'lucide-react';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, PageHeader } from '../components/ui/realm-index';
import { SHRINE_CONSECRATION_COST, GOD_METRIC_PREVIEW } from '@shared/data/town-metrics-config';
import { GOD_BUFFS, BUFF_LABELS, getPersonalReligionBuffs, getDominantChurchTownEffects } from '@shared/data/god-buffs';
import { REPUTATION_TIERS } from '@shared/data/reputation-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface God {
  id: string;
  name: string;
  title: string;
  domain: string;
  philosophy: string;
  churchName: string;
  churchDescription: string;
  racialLean: string;
  iconName: string | null;
  colorHex: string | null;
  sortOrder: number;
}

interface ChapterInfo {
  id: string;
  godId: string;
  godName: string;
  godTitle: string;
  godDomain: string;
  godPhilosophy: string;
  godIconName: string | null;
  godColorHex: string | null;
  churchName: string;
  memberCount: number;
  percentage: number;
  tier: string;
  isDominant: boolean;
  isShrine: boolean;
  highPriestId: string | null;
  highPriestName: string | null;
  treasury: number;
  election: {
    id: string;
    phase: string;
    candidateCount: number;
    endDate: string;
  } | null;
}

interface TownTempleResponse {
  townId: string;
  totalResidents: number;
  patronGodId: string | null;
  chapters: ChapterInfo[];
  dominant: ChapterInfo | null;
}

interface MyFaithResponse {
  patronGod: God | null;
  homeChapter: {
    memberCount: number;
    tier: string;
    isDominant: boolean;
    percentage: number;
    treasury: number;
  } | null;
  cooldownDaysRemaining: number;
  titheRate: number;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, typeof Shield> = {
  shield: Shield,
  scale: Scale,
  flame: Flame,
  eye: Eye,
  'heart-handshake': HeartHandshake,
  'brick-wall': BrickWall,
  gavel: Gavel,
  smile: Smile,
  handshake: Handshake,
  crown: Crown,
  'eye-off': EyeOff,
  'book-open': BookOpen,
};

function GodIcon({ iconName, colorHex, size = 'w-5 h-5' }: { iconName?: string | null; colorHex?: string | null; size?: string }) {
  const IconComponent = ICON_MAP[iconName ?? ''] ?? Star;
  return <IconComponent className={size} style={{ color: colorHex ?? '#C4A35A' }} />;
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------
const TIER_STYLES: Record<string, string> = {
  MINORITY: 'text-realm-text-muted border-realm-text-muted/30 bg-realm-text-muted/10',
  CHAPTER: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  ESTABLISHED: 'text-realm-purple-300 border-realm-purple-300/30 bg-realm-purple-300/10',
  DOMINANT: 'text-realm-gold-400 border-realm-gold-500/30 bg-realm-gold-500/10',
};

function ChurchTierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.MINORITY;
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${style}`}>
      {tier}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tithe rate label
// ---------------------------------------------------------------------------
function getTitheLabel(rate: number): string {
  if (rate === 0) return 'No tithing';
  if (rate <= 5) return 'Modest contribution';
  if (rate <= 10) return 'Standard devotion';
  if (rate <= 15) return 'Generous offering';
  return 'Zealous devotion';
}

// ---------------------------------------------------------------------------
// Tithe Controls
// ---------------------------------------------------------------------------
function TitheControls({
  currentRate, localRate, onRateChange, onSave, isPending, error,
}: {
  currentRate: number;
  localRate: number | null;
  onRateChange: (rate: number | null) => void;
  onSave: (rate: number) => void;
  isPending: boolean;
  error: string | null;
}) {
  const displayRate = localRate ?? currentRate;
  const hasChanged = localRate !== null && localRate !== currentRate;

  return (
    <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
          Tithing
        </span>
        <span className="text-[11px] text-realm-text-muted">{getTitheLabel(displayRate)}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-realm-text-muted w-6 text-right">0%</span>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={displayRate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-realm-bg-600 rounded-full appearance-none cursor-pointer accent-realm-gold-500"
        />
        <span className="text-[11px] text-realm-text-muted w-8">20%</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-realm-text-secondary">
          {displayRate}% of daily income
        </span>
        {hasChanged && (
          <RealmButton
            variant="primary"
            size="sm"
            onClick={() => onSave(displayRate)}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </RealmButton>
        )}
      </div>

      {error && (
        <p className="text-xs text-realm-danger">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TemplePage() {
  const queryClient = useQueryClient();
  const [showGodModal, setShowGodModal] = useState(false);
  const [confirmGod, setConfirmGod] = useState<God | null>(null);
  const [confirmAtheism, setConfirmAtheism] = useState(false);
  const [titheRate, setTitheRate] = useState<number | null>(null); // local edit state

  // Fetch character for current town
  const { data: character } = useQuery<{
    id: string;
    name: string;
    currentTownId: string | null;
    homeTownId: string | null;
    patronGodId: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch my faith
  const { data: myFaith } = useQuery<MyFaithResponse>({
    queryKey: ['temple', 'my-faith'],
    queryFn: async () => (await api.get('/temple/my-faith')).data,
  });

  // Fetch temple status for current town
  const { data: templeData } = useQuery<TownTempleResponse>({
    queryKey: ['temple', 'town', townId],
    queryFn: async () => (await api.get(`/temple/town/${townId}`)).data,
    enabled: !!townId,
  });

  // Fetch all gods (for selection modal)
  const { data: godsData } = useQuery<{ gods: God[] }>({
    queryKey: ['temple', 'gods'],
    queryFn: async () => (await api.get('/temple/gods')).data,
    enabled: showGodModal,
  });

  // Choose patron mutation
  const chooseMutation = useMutation({
    mutationFn: async (godId: string | null) => {
      const res = await api.post('/temple/choose-patron', { godId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      setShowGodModal(false);
      setConfirmGod(null);
      setConfirmAtheism(false);
    },
  });

  // Tithe mutation
  const titheMutation = useMutation({
    mutationFn: async (rate: number) => {
      const res = await api.post('/temple/set-tithe', { rate });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', 'my-faith'] });
      setTitheRate(null); // clear local edit state
    },
  });

  // Nominate for High Priest mutation
  const nominateMutation = useMutation({
    mutationFn: async (electionId: string) => {
      const res = await api.post('/elections/nominate', { electionId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });

  // Consecrate shrine mutation
  const consecrateMutation = useMutation({
    mutationFn: async (tId: string) => {
      const res = await api.post('/temple/consecrate', { townId: tId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
    },
  });

  // Deconsecrate shrine mutation
  const [confirmDeconsecrate, setConfirmDeconsecrate] = useState(false);
  const deconsecrateMutation = useMutation({
    mutationFn: async (tId: string) => {
      const res = await api.post('/temple/deconsecrate', { townId: tId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      setConfirmDeconsecrate(false);
    },
  });

  // Healing House mutation (Kethara shrine)
  const healingHouseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/temple/healing-house');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  // Tariff mutation (Vareth HP shrine)
  const [localTariff, setLocalTariff] = useState<number | null>(null);
  const tariffMutation = useMutation({
    mutationFn: async ({ tId, rate }: { tId: string; rate: number }) => {
      const res = await api.post('/temple/set-tariff', { townId: tId, rate });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      setLocalTariff(null);
    },
  });

  // Veradine economic policy (HP shrine)
  const [policyTaxRate, setPolicyTaxRate] = useState<number>(10);
  const [confirmPolicy, setConfirmPolicy] = useState(false);

  const townName = town?.name ?? 'this town';
  const chapters = templeData?.chapters ?? [];
  const dominant = templeData?.dominant;
  const patronGod = myFaith?.patronGod;
  const cooldown = myFaith?.cooldownDaysRemaining ?? 0;
  const allGods = godsData?.gods ?? [];

  const isVeradineHP = chapters.some(ch => ch.godId === 'veradine' && ch.isDominant && ch.isShrine && ch.highPriestId === character?.id);

  const { data: policyStatus } = useQuery<{
    available: boolean;
    cooldownDaysLeft: number;
    lastUsed: string | null;
    recentLog: Array<{ type: string; description: string; by: string; at: string }>;
  }>({
    queryKey: ['temple', 'economic-policy-status', townId],
    queryFn: async () => (await api.get(`/temple/economic-policy-status/${townId}`)).data,
    enabled: !!townId && isVeradineHP,
  });

  const policyMutation = useMutation({
    mutationFn: async ({ tId, policyType, policyValue }: { tId: string; policyType: string; policyValue: unknown }) => {
      const res = await api.post('/temple/propose-economic-policy', { townId: tId, policyType, policyValue });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      queryClient.invalidateQueries({ queryKey: ['governance'] });
      setConfirmPolicy(false);
    },
  });

  // Valtheris: reputation + diplomatic summit
  const isValtheris = patronGod?.id === 'valtheris';
  const isValtherisHP = chapters.some(ch => ch.godId === 'valtheris' && ch.isDominant && ch.isShrine && ch.highPriestId === character?.id);
  const [showReputation, setShowReputation] = useState(false);

  const { data: reputationData } = useQuery<{
    reputations: Array<{
      race: string; score: number; tier: string; tierLabel: string; tierColor: string;
    }>;
  }>({
    queryKey: ['temple', 'reputation'],
    queryFn: async () => (await api.get('/temple/reputation')).data,
    enabled: showReputation && isValtheris,
  });

  const { data: summitStatus } = useQuery<{
    active: boolean; endsAt: string | null; startedBy: string | null;
  }>({
    queryKey: ['temple', 'summit-status', townId],
    queryFn: async () => (await api.get(`/temple/summit-status/${townId}`)).data,
    enabled: !!townId,
  });

  const summitMutation = useMutation({
    mutationFn: async (tId: string) => {
      const res = await api.post('/temple/diplomatic-summit', { townId: tId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
    },
  });

  // Tessivane: price trends + cross-town prices
  const [showPriceTrends, setShowPriceTrends] = useState(false);
  const [showCrossTownPrices, setShowCrossTownPrices] = useState(false);

  const isTessivane = patronGod?.id === 'tessivane';
  const tessivaneChapterTier = myFaith?.homeChapter?.tier ?? 'MINORITY';
  const hasPriceTrendAccess = isTessivane && tessivaneChapterTier !== 'MINORITY';
  const hasCrossTownAccess = isTessivane && (tessivaneChapterTier === 'ESTABLISHED' || tessivaneChapterTier === 'DOMINANT');
  const hasTessivaneShrine = chapters.some(ch => ch.godId === 'tessivane' && ch.isDominant && ch.isShrine);

  const { data: priceTrends } = useQuery<{
    items: Array<{
      templateId: string; itemName: string; currentAvgPrice: number;
      previousAvgPrice: number; trend: string; percentChange: number; recentVolume: number;
    }>;
  }>({
    queryKey: ['temple', 'price-trends', townId],
    queryFn: async () => (await api.get(`/temple/price-trends/${townId}`)).data,
    enabled: !!townId && showPriceTrends && hasPriceTrendAccess,
  });

  const { data: crossTownPrices } = useQuery<{
    items: Array<{
      templateId: string; itemName: string;
      prices: Array<{ townId: string; townName: string; avgPrice: number }>;
    }>;
  }>({
    queryKey: ['temple', 'cross-town-prices'],
    queryFn: async () => (await api.get('/temple/cross-town-prices')).data,
    enabled: showCrossTownPrices && hasCrossTownAccess,
  });

  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Temple" icon={<Church className="w-8 h-8 text-realm-gold-400" />} />
        <RealmPanel title="Temple">
          <p className="text-xs text-realm-text-muted">You must be in a town to visit the temple.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Temple — ${townName}`} icon={<Church className="w-8 h-8 text-realm-gold-400" />} />

      {/* Dominant buff banner */}
      {dominant && (
        <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <GodIcon iconName={dominant.godIconName} colorHex={dominant.godColorHex} />
            <span className="text-sm font-display text-realm-gold-400">
              This town is blessed by {dominant.godName}
            </span>
          </div>
          <p className="text-xs text-realm-text-secondary">
            The {dominant.churchName} holds dominance here — {dominant.godDomain.toLowerCase()}.
          </p>
        </div>
      )}

      {/* Your Faith section */}
      <RealmPanel title="Your Faith">
        {patronGod ? (
          <div className="space-y-3">
            <div
              className="rounded-lg p-4 border"
              style={{
                borderColor: `${patronGod.colorHex}40`,
                backgroundColor: `${patronGod.colorHex}08`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <GodIcon iconName={patronGod.iconName} colorHex={patronGod.colorHex} size="w-6 h-6" />
                <div>
                  <span className="text-sm font-display text-realm-text-primary">{patronGod.name}</span>
                  <span className="text-xs text-realm-text-muted ml-2">{patronGod.title}</span>
                </div>
              </div>
              <p className="text-xs text-realm-text-secondary mb-1">{patronGod.churchName}</p>
              <p className="text-[11px] text-realm-text-muted mb-1">{patronGod.domain}</p>
              <p className="text-[11px] text-realm-text-muted italic">{patronGod.churchDescription}</p>

              {myFaith?.homeChapter && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Users className="w-3 h-3 text-realm-text-muted" />
                    <span className="text-realm-text-secondary">
                      {myFaith.homeChapter.memberCount} followers in your home town ({myFaith.homeChapter.percentage}%)
                    </span>
                    <ChurchTierBadge tier={myFaith.homeChapter.tier} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Coins className="w-3 h-3 text-realm-gold-400" />
                    <span className="text-realm-text-secondary">
                      Church treasury: {myFaith.homeChapter.treasury.toLocaleString()}g
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tithe Controls */}
            <TitheControls
              currentRate={myFaith?.titheRate ?? 10}
              localRate={titheRate}
              onRateChange={setTitheRate}
              onSave={(rate) => titheMutation.mutate(rate)}
              isPending={titheMutation.isPending}
              error={titheMutation.isError ? ((titheMutation.error as any)?.response?.data?.error || 'Failed to update tithe rate.') : null}
            />

            {/* Active Religion Buffs */}
            {patronGod && myFaith?.homeChapter && (() => {
              const personalBuffs = getPersonalReligionBuffs(patronGod.id, myFaith.homeChapter.tier);
              const townBuffs = dominant && GOD_BUFFS[dominant.godId]
                ? getDominantChurchTownEffects(dominant.godId, dominant.tier)
                : {};
              const hasBuffs = Object.keys(personalBuffs).length > 0 || Object.keys(townBuffs).length > 0;

              if (!hasBuffs) return null;

              return (
                <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                  <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-realm-gold-400" />
                    Active Religion Buffs
                  </span>
                  {Object.entries(personalBuffs).length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-realm-text-muted">Personal</span>
                      {Object.entries(personalBuffs).map(([key, val]) => {
                        const isReduction = key.includes('Reduction');
                        const isBoolean = key === 'priceTrendAccess' || key === 'crossTownPriceVisibility' || key === 'reducedConversionCooldown';
                        return (
                          <div key={key} className="flex items-center justify-between text-[11px]">
                            <span className="text-realm-text-secondary">{BUFF_LABELS[key] ?? key}</span>
                            <span className="text-realm-teal-300">
                              {isBoolean ? (key === 'reducedConversionCooldown' ? '5 days' : 'Unlocked') : `${isReduction ? '-' : '+'}${Math.round(val * 100)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {Object.entries(townBuffs).length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-realm-text-muted">Town-wide ({dominant!.godName} dominance)</span>
                      {Object.entries(townBuffs).map(([key, val]) => {
                        const isReduction = key.includes('Reduction');
                        const isBoolean = key === 'priceTrendAccess' || key === 'crossTownPriceVisibility' || key === 'reducedConversionCooldown';
                        return (
                          <div key={key} className="flex items-center justify-between text-[11px]">
                            <span className="text-realm-text-secondary">{BUFF_LABELS[key] ?? key}</span>
                            <span className="text-realm-teal-300">
                              {isBoolean ? 'Unlocked' : `${isReduction ? '-' : '+'}${Math.round(val * 100)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Healing House (Kethara shrine) */}
            {patronGod?.id === 'kethara' && chapters.some(ch => ch.godId === 'kethara' && ch.isShrine) && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  Healing House
                </span>
                <p className="text-[11px] text-realm-text-muted">
                  Visit the shrine's Healing House to restore your health to full. Once per day.
                </p>
                <RealmButton
                  variant="primary"
                  size="sm"
                  onClick={() => healingHouseMutation.mutate()}
                  disabled={healingHouseMutation.isPending}
                >
                  {healingHouseMutation.isPending ? 'Healing...' : 'Visit Healing House'}
                </RealmButton>
                {healingHouseMutation.isSuccess && (
                  <p className="text-[11px] text-realm-success">
                    {healingHouseMutation.data.message}
                  </p>
                )}
                {healingHouseMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(healingHouseMutation.error as any)?.response?.data?.error || 'Failed to use Healing House'}
                  </p>
                )}
              </div>
            )}

            {/* Vareth Tariff Controls (HP of Vareth with dominant shrine) */}
            {patronGod?.id === 'vareth' && chapters.some(ch => ch.godId === 'vareth' && ch.isDominant && ch.isShrine && ch.highPriestId === character?.id) && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-realm-gold-400" />
                  Tariff Control
                </span>
                <p className="text-[11px] text-realm-text-muted">
                  Set the visitor market surcharge rate for non-residents.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-realm-text-muted w-8 text-right">10%</span>
                  <input
                    type="range"
                    min={10}
                    max={25}
                    step={1}
                    value={localTariff ?? 10}
                    onChange={(e) => setLocalTariff(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-realm-bg-600 rounded-full appearance-none cursor-pointer accent-realm-gold-500"
                  />
                  <span className="text-[11px] text-realm-text-muted w-8">25%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-realm-text-secondary">
                    {localTariff ?? 10}% surcharge on visitor purchases
                  </span>
                  {localTariff !== null && (
                    <RealmButton
                      variant="primary"
                      size="sm"
                      onClick={() => tariffMutation.mutate({ tId: templeData!.townId, rate: localTariff / 100 })}
                      disabled={tariffMutation.isPending}
                    >
                      {tariffMutation.isPending ? 'Setting...' : 'Set Tariff'}
                    </RealmButton>
                  )}
                </div>
                {tariffMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(tariffMutation.error as any)?.response?.data?.error || 'Failed to set tariff'}
                  </p>
                )}
              </div>
            )}

            {/* Veradine Economic Policy (HP of Veradine with dominant shrine) */}
            {isVeradineHP && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-realm-gold-400" />
                  Economic Policy Bypass
                </span>
                <p className="text-[11px] text-realm-text-muted">
                  As High Priest of the Conclave, you may enact economic policies that bypass the normal law process. Once per 30 days.
                </p>

                {policyStatus && !policyStatus.available && (
                  <div className="flex items-center gap-1.5 text-[11px] text-realm-warning">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Policy bypass on cooldown — {policyStatus.cooldownDaysLeft} day{policyStatus.cooldownDaysLeft !== 1 ? 's' : ''} remaining</span>
                  </div>
                )}

                {policyStatus?.available && !confirmPolicy && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-realm-text-muted mb-1 block">Set Town Tax Rate</label>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-realm-text-muted w-6 text-right">5%</span>
                        <input
                          type="range"
                          min={5}
                          max={25}
                          step={1}
                          value={policyTaxRate}
                          onChange={(e) => setPolicyTaxRate(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-realm-bg-600 rounded-full appearance-none cursor-pointer accent-realm-gold-500"
                        />
                        <span className="text-[11px] text-realm-text-muted w-8">25%</span>
                      </div>
                      <span className="text-xs text-realm-text-secondary">{policyTaxRate}% tax rate</span>
                    </div>
                    <RealmButton
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmPolicy(true)}
                    >
                      Propose Tax Rate Change
                    </RealmButton>
                  </div>
                )}

                {confirmPolicy && (
                  <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg p-3 space-y-2">
                    <p className="text-[11px] text-realm-warning">
                      This will set the town tax rate to {policyTaxRate}%, bypassing the normal law process. This action is logged publicly and can only be used once per 30 days.
                    </p>
                    <div className="flex gap-2">
                      <RealmButton
                        variant="primary"
                        size="sm"
                        onClick={() => policyMutation.mutate({
                          tId: templeData!.townId,
                          policyType: 'tax_rate',
                          policyValue: policyTaxRate / 100,
                        })}
                        disabled={policyMutation.isPending}
                      >
                        {policyMutation.isPending ? 'Enacting...' : 'Confirm Policy'}
                      </RealmButton>
                      <RealmButton variant="secondary" size="sm" onClick={() => setConfirmPolicy(false)}>
                        Cancel
                      </RealmButton>
                    </div>
                  </div>
                )}

                {policyMutation.isSuccess && (
                  <p className="text-[11px] text-realm-success">{policyMutation.data.message}</p>
                )}
                {policyMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(policyMutation.error as any)?.response?.data?.error || 'Failed to enact policy'}
                  </p>
                )}

                {policyStatus?.recentLog && policyStatus.recentLog.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-realm-bg-600">
                    <span className="text-[10px] uppercase tracking-wider text-realm-text-muted">Recent Policy Actions</span>
                    {policyStatus.recentLog.map((entry, i) => (
                      <div key={i} className="text-[10px] text-realm-text-muted mt-0.5">
                        {entry.description} — {entry.by} ({new Date(entry.at).toLocaleDateString()})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tyrvex Prophecy (HP of Tyrvex with shrine) */}
            {patronGod?.id === 'tyrvex' && chapters.some(ch => ch.godId === 'tyrvex' && ch.isShrine && ch.highPriestId === character?.id) && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Scroll className="w-3.5 h-3.5 text-realm-purple-300" />
                  Prophecy
                </span>
                <p className="text-[11px] text-realm-text-muted italic">
                  The Crucible's scholars sense no disturbances in the barrier... for now.
                </p>
              </div>
            )}

            {/* Tessivane: Price Trends (CHAPTER+) */}
            {hasPriceTrendAccess && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-realm-teal-300" />
                    Price Trends
                  </span>
                  <RealmButton variant="secondary" size="sm" onClick={() => setShowPriceTrends(!showPriceTrends)}>
                    {showPriceTrends ? 'Hide' : 'View'}
                  </RealmButton>
                </div>
                {showPriceTrends && priceTrends && (
                  <div className="space-y-1 mt-2">
                    {priceTrends.items.length === 0 ? (
                      <p className="text-[11px] text-realm-text-muted">No sufficient trade data in this town yet.</p>
                    ) : (
                      <div className="text-[11px]">
                        <div className="flex items-center gap-2 text-[10px] text-realm-text-muted pb-1 border-b border-realm-bg-600">
                          <span className="flex-1">Item</span>
                          <span className="w-14 text-right">Price</span>
                          <span className="w-8 text-center">Trend</span>
                          <span className="w-10 text-right">Change</span>
                        </div>
                        {priceTrends.items.slice(0, 20).map(item => (
                          <div key={item.templateId} className="flex items-center gap-2 py-0.5">
                            <span className="flex-1 text-realm-text-secondary truncate">{item.itemName}</span>
                            <span className="w-14 text-right text-realm-gold-400">{item.currentAvgPrice}g</span>
                            <span className="w-8 text-center">
                              {item.trend === 'RISING' && <TrendingUp className="w-3 h-3 text-green-400 inline" />}
                              {item.trend === 'FALLING' && <TrendingDown className="w-3 h-3 text-red-400 inline" />}
                              {item.trend === 'STABLE' && <Minus className="w-3 h-3 text-realm-text-muted inline" />}
                            </span>
                            <span className={`w-10 text-right ${item.percentChange > 0 ? 'text-green-400' : item.percentChange < 0 ? 'text-red-400' : 'text-realm-text-muted'}`}>
                              {item.percentChange > 0 ? '+' : ''}{item.percentChange}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tessivane: Cross-Town Prices (ESTABLISHED+) */}
            {hasCrossTownAccess && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-realm-gold-400" />
                    Cross-Town Prices
                  </span>
                  <RealmButton variant="secondary" size="sm" onClick={() => setShowCrossTownPrices(!showCrossTownPrices)}>
                    {showCrossTownPrices ? 'Hide' : 'View'}
                  </RealmButton>
                </div>
                {showCrossTownPrices && crossTownPrices && (
                  <div className="space-y-2 mt-2">
                    {crossTownPrices.items.length === 0 ? (
                      <p className="text-[11px] text-realm-text-muted">No cross-town trade data available.</p>
                    ) : crossTownPrices.items.slice(0, 15).map(item => (
                      <div key={item.templateId} className="text-[11px]">
                        <span className="text-realm-text-secondary font-display text-[10px]">{item.itemName}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {item.prices.map(p => {
                            const isLowest = p.avgPrice === Math.min(...item.prices.map(pp => pp.avgPrice));
                            const isHighest = p.avgPrice === Math.max(...item.prices.map(pp => pp.avgPrice));
                            return (
                              <span key={p.townId} className={`${isLowest ? 'text-green-400' : isHighest ? 'text-red-400' : 'text-realm-text-muted'}`}>
                                {p.townName}: {p.avgPrice}g
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tessivane: Black Market link (shrine active in town) */}
            {hasTessivaneShrine && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-realm-purple-300" />
                  Black Market
                </span>
                <p className="text-[11px] text-realm-text-muted">
                  The Fellowship of the Silver Tongue operates a shadow market here. Zero fees — and zero protections. 5% of deals go south.
                </p>
                <RealmButton
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.hash = '#black-market'}
                >
                  Enter Black Market
                </RealmButton>
              </div>
            )}

            {/* Valtheris: Racial Reputation */}
            {isValtheris && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-realm-gold-400" />
                    Racial Reputation
                  </span>
                  <RealmButton variant="secondary" size="sm" onClick={() => setShowReputation(!showReputation)}>
                    {showReputation ? 'Hide' : 'View'}
                  </RealmButton>
                </div>
                {showReputation && reputationData && (
                  <div className="space-y-1 mt-2">
                    {reputationData.reputations.length === 0 ? (
                      <p className="text-[11px] text-realm-text-muted">You are Neutral with all races. Trade and interact with other races to build standing.</p>
                    ) : (
                      reputationData.reputations.map(rep => {
                        const tier = REPUTATION_TIERS.find(t => t.id === rep.tier) ?? REPUTATION_TIERS[2];
                        const nextTier = REPUTATION_TIERS.find(t => t.min > rep.score);
                        const prevTier = [...REPUTATION_TIERS].reverse().find(t => t.max < rep.score);
                        const rangeMin = prevTier ? prevTier.max : tier.min;
                        const rangeMax = nextTier ? nextTier.min : tier.max;
                        const progress = rangeMax > rangeMin ? Math.max(0, Math.min(100, ((rep.score - rangeMin) / (rangeMax - rangeMin)) * 100)) : 100;
                        return (
                          <div key={rep.race} className="flex items-center gap-2 py-0.5">
                            <span className="text-[11px] text-realm-text-secondary capitalize w-20 truncate">{rep.race}</span>
                            <div className="flex-1 h-1.5 bg-realm-bg-600 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, backgroundColor: rep.tierColor }}
                              />
                            </div>
                            <span
                              className="text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border w-20 text-center"
                              style={{ color: rep.tierColor, borderColor: `${rep.tierColor}40`, backgroundColor: `${rep.tierColor}10` }}
                            >
                              {rep.tierLabel}
                            </span>
                            <span className="text-[10px] text-realm-text-muted w-10 text-right">{rep.score}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Valtheris: Diplomatic Summit (HP with shrine) */}
            {isValtherisHP && (
              <div className="rounded-lg border border-realm-bg-600 bg-realm-bg-800 p-3 space-y-2">
                <span className="text-xs font-display text-realm-text-primary flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-realm-gold-400" />
                  Diplomatic Summit
                </span>
                <p className="text-[11px] text-realm-text-muted">
                  Host a diplomatic summit to boost reputation gains for all characters in this town and adjacent towns for 7 days. Cost: 200g from church treasury.
                </p>
                {summitStatus?.active ? (
                  <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-realm-gold-400">
                      Summit active — ends {new Date(summitStatus.endsAt!).toLocaleDateString()}
                    </p>
                    {summitStatus.startedBy && (
                      <p className="text-[10px] text-realm-text-muted">Hosted by {summitStatus.startedBy}</p>
                    )}
                  </div>
                ) : (
                  <RealmButton
                    variant="primary"
                    size="sm"
                    onClick={() => summitMutation.mutate(templeData!.townId)}
                    disabled={summitMutation.isPending}
                  >
                    {summitMutation.isPending ? 'Hosting...' : 'Host Diplomatic Summit (200g)'}
                  </RealmButton>
                )}
                {summitMutation.isSuccess && (
                  <p className="text-[11px] text-realm-success">{summitMutation.data.message}</p>
                )}
                {summitMutation.isError && (
                  <p className="text-[11px] text-realm-danger">
                    {(summitMutation.error as any)?.response?.data?.error || 'Failed to host summit'}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <RealmButton
                variant="secondary"
                size="sm"
                onClick={() => setShowGodModal(true)}
                disabled={cooldown > 0}
              >
                Change Faith
              </RealmButton>
              {cooldown > 0 && (
                <span className="text-[11px] text-realm-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {cooldown} day{cooldown > 1 ? 's' : ''} until you can switch
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Church className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted mb-1">You have not chosen a patron god.</p>
            <p className="text-xs text-realm-text-muted mb-4">
              Visit the temple to pledge your faith to one of the Twelve.
            </p>
            <RealmButton variant="primary" onClick={() => setShowGodModal(true)}>
              Choose Your Path
            </RealmButton>
          </div>
        )}
      </RealmPanel>

      {/* Church Standings */}
      <RealmPanel title="Church Standings">
        {chapters.length === 0 ? (
          <div className="text-center py-6">
            <Church className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted">No churches have been established in {townName} yet.</p>
            <p className="text-xs text-realm-text-muted mt-1">Be the first to bring faith to this town.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`rounded-lg p-4 border transition-colors ${
                  ch.isDominant
                    ? 'border-realm-gold-500/40 bg-realm-gold-500/5'
                    : 'border-realm-bg-600 bg-realm-bg-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <GodIcon iconName={ch.godIconName} colorHex={ch.godColorHex} />
                      <span className="text-sm font-display text-realm-text-primary">{ch.godName}</span>
                      <span className="text-xs text-realm-text-muted">{ch.godTitle}</span>
                      <ChurchTierBadge tier={ch.tier} />
                      {ch.isDominant && (
                        <RealmBadge variant="legendary">DOMINANT</RealmBadge>
                      )}
                      {ch.isShrine && (
                        <span className="text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border text-amber-300 border-amber-300/30 bg-amber-300/10 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" /> Shrine
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-realm-text-secondary mb-1">{ch.churchName}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-realm-text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ch.memberCount} follower{ch.memberCount !== 1 ? 's' : ''} ({ch.percentage}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-realm-gold-400" />
                        {ch.treasury.toLocaleString()}g
                      </span>
                      {ch.highPriestName && (
                        <span>High Priest: {ch.highPriestName}</span>
                      )}
                      {!ch.highPriestName && ch.tier === 'MINORITY' && (
                        <span className="italic">No High Priest</span>
                      )}
                    </div>

                    {/* Election info */}
                    {ch.election && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm border ${
                          ch.election.phase === 'NOMINATIONS'
                            ? 'bg-realm-teal-300/10 text-realm-teal-300 border-realm-teal-300/30'
                            : 'bg-realm-success/10 text-realm-success border-realm-success/30'
                        }`}>
                          <Vote className="w-3 h-3 inline mr-1" />
                          {ch.election.phase === 'NOMINATIONS' ? 'Nominations Open' : 'Voting'}
                        </span>
                        <span className="text-[10px] text-realm-text-muted">
                          {ch.election.candidateCount} candidate{ch.election.candidateCount !== 1 ? 's' : ''}
                        </span>
                        {ch.election.phase === 'NOMINATIONS' && character?.patronGodId === ch.godId && character?.homeTownId === templeData?.townId && (
                          <button
                            onClick={() => nominateMutation.mutate(ch.election!.id)}
                            disabled={nominateMutation.isPending}
                            className="text-[10px] text-realm-teal-300 hover:text-realm-teal-200 font-display uppercase"
                          >
                            {nominateMutation.isPending ? 'Nominating...' : 'Nominate Yourself'}
                          </button>
                        )}
                      </div>
                    )}
                    {!ch.highPriestName && !ch.election && ch.tier !== 'MINORITY' && (
                      <p className="mt-1 text-[10px] text-realm-text-muted italic">Awaiting election</p>
                    )}

                    {/* Shrine controls (dominant chapters only) */}
                    {ch.isDominant && character?.id === ch.highPriestId && (
                      <div className="mt-2 pt-2 border-t border-realm-bg-600">
                        {!ch.isShrine ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <RealmButton
                              variant="primary"
                              size="sm"
                              onClick={() => consecrateMutation.mutate(templeData!.townId)}
                              disabled={consecrateMutation.isPending || ch.treasury < SHRINE_CONSECRATION_COST}
                            >
                              {consecrateMutation.isPending ? 'Consecrating...' : 'Consecrate Shrine'}
                            </RealmButton>
                            <span className="text-[10px] text-realm-text-muted">
                              Cost: {SHRINE_CONSECRATION_COST}g from treasury (have: {ch.treasury.toLocaleString()}g)
                            </span>
                            {consecrateMutation.isError && (
                              <span className="text-[10px] text-realm-danger">
                                {(consecrateMutation.error as any)?.response?.data?.error || 'Failed'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            {!confirmDeconsecrate ? (
                              <button
                                onClick={() => setConfirmDeconsecrate(true)}
                                className="text-[10px] text-realm-text-muted hover:text-realm-danger font-display uppercase"
                              >
                                Deconsecrate Shrine
                              </button>
                            ) : (
                              <>
                                <span className="text-[10px] text-realm-warning">Are you sure? No refund.</span>
                                <RealmButton
                                  variant="danger"
                                  size="sm"
                                  onClick={() => deconsecrateMutation.mutate(templeData!.townId)}
                                  disabled={deconsecrateMutation.isPending}
                                >
                                  {deconsecrateMutation.isPending ? 'Removing...' : 'Confirm'}
                                </RealmButton>
                                <button
                                  onClick={() => setConfirmDeconsecrate(false)}
                                  className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dominant god metric preview */}
                    {ch.isDominant && GOD_METRIC_PREVIEW[ch.godId] && (
                      <div className="mt-2 pt-2 border-t border-realm-bg-600">
                        <p className="text-[10px] text-realm-text-muted flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-realm-gold-400" />
                          <span>
                            Dominance effect: <span className="text-realm-text-secondary">{GOD_METRIC_PREVIEW[ch.godId]}</span>
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  {character?.patronGodId === ch.godId && (
                    <span className="text-[10px] text-realm-gold-400 font-display">YOUR FAITH</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </RealmPanel>

      {/* God Selection Modal */}
      {showGodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-realm-bg-900 border border-realm-bg-600 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-realm-bg-900 border-b border-realm-bg-600 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-display text-realm-text-primary">
                {confirmGod ? 'Confirm Your Choice' : confirmAtheism ? 'Renounce Faith?' : 'Choose Your Patron God'}
              </h3>
              <button
                onClick={() => { setShowGodModal(false); setConfirmGod(null); setConfirmAtheism(false); }}
                className="text-realm-text-muted hover:text-realm-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Confirmation view */}
              {confirmGod && (
                <div className="space-y-4">
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      borderColor: `${confirmGod.colorHex}40`,
                      backgroundColor: `${confirmGod.colorHex}08`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <GodIcon iconName={confirmGod.iconName} colorHex={confirmGod.colorHex} size="w-6 h-6" />
                      <div>
                        <span className="text-sm font-display text-realm-text-primary">{confirmGod.name}</span>
                        <span className="text-xs text-realm-text-muted ml-2">{confirmGod.title}</span>
                      </div>
                    </div>
                    <p className="text-xs text-realm-text-secondary">{confirmGod.churchName}</p>
                    <p className="text-[11px] text-realm-text-muted mt-1">{confirmGod.domain}</p>
                    <p className="text-[11px] text-realm-text-muted mt-1 italic">{confirmGod.churchDescription}</p>
                  </div>

                  {patronGod && (
                    <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg px-4 py-3">
                      <p className="text-xs text-realm-warning flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Switching from {patronGod.name} to {confirmGod.name} will lock your faith for 7 days.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <RealmButton
                      variant="primary"
                      className="flex-1"
                      onClick={() => chooseMutation.mutate(confirmGod.id)}
                      disabled={chooseMutation.isPending}
                    >
                      {chooseMutation.isPending ? 'Pledging...' : `Follow ${confirmGod.name}`}
                    </RealmButton>
                    <RealmButton
                      variant="secondary"
                      onClick={() => setConfirmGod(null)}
                    >
                      Back
                    </RealmButton>
                  </div>

                  {chooseMutation.isError && (
                    <p className="text-xs text-realm-danger">
                      {(chooseMutation.error as any)?.response?.data?.error || 'Failed to change faith.'}
                    </p>
                  )}
                </div>
              )}

              {/* Atheism confirmation */}
              {confirmAtheism && !confirmGod && (
                <div className="space-y-4">
                  <p className="text-xs text-realm-text-secondary">
                    You will renounce your faith and become godless. You can always choose a new patron later without cooldown.
                  </p>
                  <div className="flex gap-2">
                    <RealmButton
                      variant="primary"
                      className="flex-1"
                      onClick={() => chooseMutation.mutate(null)}
                      disabled={chooseMutation.isPending}
                    >
                      {chooseMutation.isPending ? 'Renouncing...' : 'Renounce Faith'}
                    </RealmButton>
                    <RealmButton
                      variant="secondary"
                      onClick={() => setConfirmAtheism(false)}
                    >
                      Back
                    </RealmButton>
                  </div>
                </div>
              )}

              {/* God list */}
              {!confirmGod && !confirmAtheism && (
                <>
                  {allGods.map((god) => {
                    const isCurrentGod = character?.patronGodId === god.id;
                    // Find this god's chapter in the current town
                    const townChapter = chapters.find(ch => ch.godId === god.id);

                    return (
                      <div
                        key={god.id}
                        className={`rounded-lg p-4 border transition-colors ${
                          isCurrentGod
                            ? 'border-realm-gold-500/40 bg-realm-gold-500/5'
                            : 'border-realm-bg-600 bg-realm-bg-800 hover:border-realm-bg-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <GodIcon iconName={god.iconName} colorHex={god.colorHex} />
                              <span className="text-sm font-display text-realm-text-primary">{god.name}</span>
                              <span className="text-xs text-realm-text-muted">{god.title}</span>
                            </div>
                            <p className="text-[11px] text-realm-text-secondary mb-0.5">{god.churchName}</p>
                            <p className="text-[11px] text-realm-text-muted mb-0.5">{god.domain}</p>
                            <p className="text-[10px] text-realm-text-muted">
                              <span className="text-realm-text-secondary">Favored by:</span> {god.racialLean}
                            </p>
                            {townChapter && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-realm-text-muted">
                                <Users className="w-3 h-3" />
                                <span>{townChapter.memberCount} in this town</span>
                                <ChurchTierBadge tier={townChapter.tier} />
                              </div>
                            )}
                          </div>
                          <div>
                            {isCurrentGod ? (
                              <span className="text-[10px] text-realm-gold-400 font-display">CURRENT</span>
                            ) : (
                              <RealmButton
                                variant="secondary"
                                size="sm"
                                onClick={() => setConfirmGod(god)}
                                disabled={cooldown > 0 && !!patronGod}
                              >
                                Select
                              </RealmButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Atheism option */}
                  {patronGod && (
                    <div className="border-t border-realm-bg-600 pt-3 mt-3">
                      <button
                        onClick={() => setConfirmAtheism(true)}
                        className="text-xs text-realm-text-muted hover:text-realm-text-secondary transition-colors"
                      >
                        Renounce all faith (become godless)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
