import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark,
  Crown,
  Shield,
  Users,
  ScrollText,
  Loader2,
  Vote,
  Gavel,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Gem,
  Star,
  ChevronDown,
  Heart,
  TrendingUp,
  Activity,
  Hammer,
  Zap,
  Route,
  Clock,
  Check,
  X,
  Scale,
  Plus,
  Trash2,
  Megaphone,
  Pin,
  Eye,
  BookOpen,
  Handshake,
  Send,
} from 'lucide-react';
import api from '../services/api';
import GoldAmount from '../components/shared/GoldAmount';
import CountdownTimer from '../components/shared/CountdownTimer';
import { RealmModal } from '../components/ui/RealmModal';
import { PageHeader } from '../components/ui/realm-index';
import { buildingTypeLabel } from '@shared/data/building-labels';
import { METRIC_LABELS, type TownMetricType } from '@shared/data/town-metrics-config';
import { PROJECT_TYPES, EMERGENCY_SPENDING_TYPES, SHERIFF_PATROL_CONFIG, PROJECT_CATEGORIES, UPGRADE_TYPES, DEGRADATION_THRESHOLD_DAYS, type ProjectType, type EmergencySpendingType, type UpgradeType } from '@shared/data/town-projects-config';
import { TRADE_POLICY_CONFIG, TOWN_LAW_TYPES } from '@shared/data/trade-policy-config';
import { PROCLAMATION_CONFIG } from '@shared/data/proclamation-config';
import { TREATY_TYPES, MAX_ACTIVE_TREATIES, CANCEL_NOTICE_DAYS, RENEWAL_WINDOW_DAYS, MIN_TREATY_DURATION, MAX_TREATY_DURATION, DEFAULT_TREATY_DURATION, MIN_TARIFF_REDUCTION, MAX_TARIFF_REDUCTION, MIN_RESOURCE_SHARING_GOLD, MAX_RESOURCE_SHARING_GOLD, type TownTreatyType } from '@shared/data/treaty-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlayerCharacter {
  id: string;
  name: string;
  gold: number;
  currentTownId: string | null;
  homeTownId: string | null;
  homeTownName: string | null;
}

interface RelocationPreview {
  canRelocate: boolean;
  cost: number;
  cooldownDays: number;
  currentHomeTown: { id: string; name: string } | null;
  targetTown: { id: string; name: string };
  losses: {
    storageItems: { itemTemplateId: string; itemName: string; quantity: number }[];
    assets: { id: string; spotType: string; tier: number; professionType: string | null }[];
    livestock: { id: string; animalType: string; name: string }[];
    buildings: { id: string; type: string; name: string; level: number }[];
  };
  warnings: string[];
}

interface RelocationResult {
  success: boolean;
  newHomeTown: { id: string; name: string };
  goldRemaining: number;
  newHouse: { id: string; name: string } | null;
}

interface TownInfo {
  id: string;
  name: string;
  population: number;
  treasury: number;
  taxRate: number;
  mayor: { id: string; name: string; level: number } | null;
  policy: {
    taxRate?: number;
    sheriff?: { id: string; name: string; level: number } | null;
    sheriffId?: string | null;
  } | null;
  council: {
    id: string;
    role: string;
    character: { id: string; name: string; level: number };
    appointedAt: string;
  }[];
  buildingPermits: boolean;
  tradePolicy: Record<string, unknown>;
  features: { availableBuildings?: string[]; specialty?: string; prosperityLevel?: number } | null;
  resources: { resourceType: string; abundance: number }[];
  buildingCapacity: { used: number; total: number };
}

interface Citizen {
  id: string;
  name: string;
  level: number;
  race: string;
  professions: string[];
}

interface CitizensResponse {
  totalCount: number;
  page: number;
  limit: number;
  citizens: Citizen[];
}

interface Election {
  id: string;
  type: 'MAYOR' | 'RULER' | 'HIGH_PRIEST';
  phase: 'NOMINATIONS' | 'VOTING' | 'COMPLETED';
  termNumber: number;
  startDate: string;
  endDate: string;
  town: { id: string; name: string } | null;
  kingdom: { id: string; name: string } | null;
  godId: string | null;
  god: { id: string; name: string; iconName: string | null; colorHex: string | null; churchName: string } | null;
  candidateCount: number;
  voteCount: number;
  candidates: {
    characterId: string;
    name: string;
    level: number;
    race: string;
    platform: string;
    nominatedAt: string;
  }[];
}

interface TownMetric {
  metricType: TownMetricType;
  label: string;
  description: string;
  baseValue: number;
  modifier: number;
  projectModifier: number;
  effectiveValue: number;
  lastUpdatedBy: string | null;
  isActive: boolean;
}

interface TownProject {
  id: string;
  townId: string;
  projectType: string;
  status: string;
  commissionedBy: { id: string; name: string } | null;
  targetRoute: { id: string; name: string; fromTownId: string; toTownId: string } | null;
  cost: number;
  startedAt: string;
  completesAt: string;
  completedAt: string | null;
  config: typeof PROJECT_TYPES[ProjectType] | null;
}

interface AdjacentRoute {
  id: string;
  name: string;
  fromTownId: string;
  toTownId: string;
  nodeCount: number;
}

interface SheriffStatus {
  sheriff: { id: string; name: string } | null;
  budget: number;
  budgetUsed: number;
  patrols: { routeId: string; expiresAt: string; dangerReduction: number; source: string }[];
}

interface TownUpgrade {
  id: string;
  townId: string;
  upgradeType: string;
  tier: number;
  status: string;
  dailyMaintenance: number;
  degradingDays: number;
  name: string;
  description: string;
  effects: Record<string, number>;
  nextTier: { tier: number; cost: number; maintenance: number; effects: Record<string, number> } | null;
}

interface UpgradesResponse {
  upgrades: TownUpgrade[];
  available: { upgradeType: string; name: string; description: string; tier1Cost: number; tier1Maintenance: number; tier1Effects: Record<string, number> }[];
  totalMaintenance: number;
}

interface PriceCeiling {
  id: string;
  townId: string;
  itemTemplateId: string;
  maxPrice: number;
  setById: string;
  createdAt: string;
  itemName: string;
}

interface TownLaw {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  townId: string;
  proposedById: string;
  proposedByName: string;
  createdAt: string;
}

interface Proclamation {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isUrgent: boolean;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  author: { id: string; name: string };
}

interface TravelLogEntry {
  id: string;
  characterName: string;
  characterRace: string;
  action: string;
  fromTown: string | null;
  toTown: string | null;
  occurredAt: string;
}

interface TownTreaty {
  id: string;
  treatyType: string;
  typeName: string;
  typeDescription: string;
  partnerTown: { id: string; name: string };
  proposedBy: { id: string; name: string } | null;
  terms: Record<string, unknown>;
  status: string;
  duration: number;
  townAVotesFor: number;
  townAVotesAgainst: number;
  townBVotesFor: number;
  townBVotesAgainst: number;
  ratificationEndsAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  cancelNoticeUntil: string | null;
  createdAt: string;
  isIncoming: boolean;
  renewalApprovedBy: string[];
}

interface TreatiesResponse {
  active: TownTreaty[];
  pending: TownTreaty[];
  proposed: TownTreaty[];
  past: TownTreaty[];
  activeCount: number;
  maxTreaties: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METRIC_ICONS: Record<string, typeof Shield> = {
  DEFENSES: Shield,
  PUBLIC_HEALTH: Heart,
  LAW_ENFORCEMENT: Gavel,
  MARKET_EFFICIENCY: TrendingUp,
  ELECTION_INTEGRITY: Vote,
};

function getMetricColor(value: number): string {
  if (value > 60) return 'bg-realm-success';
  if (value >= 30) return 'bg-amber-400';
  return 'bg-realm-danger';
}

function getMetricTextColor(value: number): string {
  if (value > 60) return 'text-realm-success';
  if (value >= 30) return 'text-amber-400';
  return 'text-realm-danger';
}

function formatEffectLabel(key: string): string {
  const labels: Record<string, string> = {
    allMetricsBonus: 'All Metrics',
    gatheringYieldPercent: 'Gathering Yield',
    craftingQualityPercent: 'Crafting Quality',
    buildingSlots: 'Building Slots',
    travelTimeReduction: 'Travel Speed',
    roadDangerReduction: 'Road Safety',
  };
  return labels[key] ?? key;
}

function formatEffectValue(key: string, val: number): string {
  if (key.includes('Percent') || key.includes('Reduction')) {
    return `+${(val * 100).toFixed(0)}%`;
  }
  return `+${val}`;
}

const PHASE_COLORS: Record<string, string> = {
  NOMINATIONS: 'bg-realm-teal-300/10 text-realm-teal-300 border-realm-teal-300/30',
  VOTING: 'bg-realm-success/10 text-realm-success border-realm-success/30',
  COMPLETED: 'bg-realm-text-muted/10 text-realm-text-muted border-realm-text-muted/30',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TownHallPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRelocateModal, setShowRelocateModal] = useState(false);
  const [relocatePreview, setRelocatePreview] = useState<RelocationPreview | null>(null);
  const [relocateError, setRelocateError] = useState<string | null>(null);
  const [relocateSuccess, setRelocateSuccess] = useState<RelocationResult | null>(null);

  const { data: character, isLoading: charLoading } = useQuery<PlayerCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;
  const isHomeTown = !!townId && townId === character?.homeTownId;

  const { data: townData, isLoading: townLoading } = useQuery<{ town: TownInfo }>({
    queryKey: ['governance', 'town-info', townId],
    queryFn: async () => (await api.get(`/governance/town-info/${townId}`)).data,
    enabled: !!townId,
  });

  const { data: electionsData, isLoading: electionsLoading } = useQuery<{ elections: Election[] }>({
    queryKey: ['elections', 'current'],
    queryFn: async () => (await api.get('/elections/current')).data,
    enabled: !!townId,
  });

  const [citizenPage, setCitizenPage] = useState(1);
  const { data: citizensData, isLoading: citizensLoading } = useQuery<CitizensResponse>({
    queryKey: ['towns', townId, 'citizens', citizenPage],
    queryFn: async () => (await api.get(`/towns/${townId}/citizens?page=${citizenPage}&limit=20`)).data,
    enabled: !!townId,
  });

  // Town metrics
  const { data: metricsData } = useQuery<{ metrics: TownMetric[] }>({
    queryKey: ['town-metrics', townId],
    queryFn: async () => (await api.get(`/town-metrics/${townId}`)).data,
    enabled: !!townId,
  });

  // Referendums
  const { data: referendumsData } = useQuery<Array<{
    id: string; question: string; policyType: string; policyValue: any; status: string;
    votesFor: number; votesAgainst: number; startedAt: string; endsAt: string;
    proposedBy: { id: string; name: string } | null;
  }>>({
    queryKey: ['temple', 'referendums', townId],
    queryFn: async () => (await api.get(`/temple/referendums/${townId}`)).data,
    enabled: !!townId,
  });

  const voteRefMutation = useMutation({
    mutationFn: async (data: { referendumId: string; vote: boolean }) => {
      return (await api.post('/temple/vote-referendum', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', 'referendums'] });
    },
  });

  // Martial law status
  const { data: martialLawStatus } = useQuery<{
    active: boolean; endsAt: string | null; declaredBy: string | null;
  }>({
    queryKey: ['temple', 'martial-law-status', townId],
    queryFn: async () => (await api.get(`/temple/martial-law-status/${townId}`)).data,
    enabled: !!townId,
  });

  // Town projects
  const { data: projectsData } = useQuery<{ projects: TownProject[] }>({
    queryKey: ['governance', 'projects', townId],
    queryFn: async () => (await api.get(`/governance/projects/${townId}`)).data,
    enabled: !!townId,
  });

  // Adjacent routes (for project/patrol route selection)
  const { data: routesData } = useQuery<{ routes: AdjacentRoute[] }>({
    queryKey: ['travel', 'routes', townId],
    queryFn: async () => (await api.get('/travel/routes')).data,
    enabled: !!townId,
  });

  // Sheriff status
  const { data: sheriffData } = useQuery<SheriffStatus>({
    queryKey: ['governance', 'sheriff-status', townId],
    queryFn: async () => (await api.get(`/governance/sheriff-status/${townId}`)).data,
    enabled: !!townId,
  });

  // Project commission modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProjectType, setSelectedProjectType] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  const commissionMutation = useMutation({
    mutationFn: async (data: { townId: string; projectType: string; targetRouteId?: string }) => {
      return (await api.post('/governance/commission-project', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      setShowProjectModal(false);
      setSelectedProjectType(null);
      setSelectedRouteId('');
    },
  });

  const cancelProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return (await api.post('/governance/cancel-project', { projectId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'projects'] });
    },
  });

  // Emergency spending
  const [emergencyMetric, setEmergencyMetric] = useState<string>('');
  const emergencyMutation = useMutation({
    mutationFn: async (data: { townId: string; spendingType: string; targetMetric?: string }) => {
      return (await api.post('/governance/emergency-spending', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      queryClient.invalidateQueries({ queryKey: ['town-metrics'] });
    },
  });

  // Sheriff patrol
  const [patrolRouteId, setPatrolRouteId] = useState<string>('');
  const patrolMutation = useMutation({
    mutationFn: async (data: { townId: string; routeId: string }) => {
      return (await api.post('/governance/sheriff-patrol', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'sheriff-status'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
    },
  });

  // Sheriff budget
  const [budgetValue, setBudgetValue] = useState<number>(SHERIFF_PATROL_CONFIG.defaultDailyBudget);
  const setBudgetMutation = useMutation({
    mutationFn: async (data: { townId: string; budget: number }) => {
      return (await api.post('/governance/set-sheriff-budget', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'sheriff-status'] });
    },
  });

  // Town upgrades
  const { data: upgradesData } = useQuery<UpgradesResponse>({
    queryKey: ['governance', 'upgrades', townId],
    queryFn: async () => (await api.get(`/governance/upgrades/${townId}`)).data,
    enabled: !!townId,
  });

  const purchaseUpgradeMutation = useMutation({
    mutationFn: async (data: { townId: string; upgradeType: string }) => {
      return (await api.post('/governance/purchase-upgrade', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'upgrades'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      queryClient.invalidateQueries({ queryKey: ['town-metrics'] });
    },
  });

  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState<string | null>(null);
  const downgradeUpgradeMutation = useMutation({
    mutationFn: async (data: { townId: string; upgradeType: string }) => {
      return (await api.post('/governance/downgrade-upgrade', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'upgrades'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      queryClient.invalidateQueries({ queryKey: ['town-metrics'] });
      setShowDowngradeConfirm(null);
    },
  });

  // -------------------------------------------------------------------------
  // Trade Policy + Town Laws
  // -------------------------------------------------------------------------
  const { data: priceCeilingsData } = useQuery<{ ceilings: PriceCeiling[] }>({
    queryKey: ['governance', 'price-ceilings', townId],
    queryFn: async () => (await api.get(`/governance/price-ceilings/${townId}`)).data,
    enabled: !!townId,
  });

  const { data: townLawsData } = useQuery<{ laws: TownLaw[] }>({
    queryKey: ['governance', 'town-laws', townId],
    queryFn: async () => (await api.get(`/governance/town-laws/${townId}`)).data,
    enabled: !!townId,
  });

  // Proclamations
  const { data: proclamationsData } = useQuery<{ proclamations: Proclamation[] }>({
    queryKey: ['governance', 'proclamations', townId],
    queryFn: async () => (await api.get(`/governance/proclamations/${townId}`)).data,
    enabled: !!townId,
  });

  // Travel logs (sheriff only — silently fails for non-sheriff)
  const { data: travelLogsData } = useQuery<{ logs: TravelLogEntry[] }>({
    queryKey: ['governance', 'travel-logs', townId],
    queryFn: async () => (await api.get(`/governance/travel-logs/${townId}`)).data,
    enabled: !!townId,
    retry: false,
  });

  // Proclamation form state
  const [procTitle, setProcTitle] = useState('');
  const [procContent, setProcContent] = useState('');
  const [procUrgent, setProcUrgent] = useState(false);
  const [showTravelLogs, setShowTravelLogs] = useState(false);

  // Sheriff moderation state
  const [moderatePostId, setModeratePostId] = useState('');
  const [moderateReason, setModerateReason] = useState('');
  const [bountyTitle, setBountyTitle] = useState('');
  const [bountyDesc, setBountyDesc] = useState('');
  const [bountyReward, setBountyReward] = useState('');
  const [bountyDays, setBountyDays] = useState('3');

  const issueProclamationMutation = useMutation({
    mutationFn: async (data: { townId: string; title: string; content: string; isUrgent: boolean }) => {
      return (await api.post('/governance/issue-proclamation', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proclamations'] });
      setProcTitle('');
      setProcContent('');
      setProcUrgent(false);
    },
  });

  const pinProclamationMutation = useMutation({
    mutationFn: async (data: { proclamationId: string }) => {
      return (await api.post('/governance/pin-proclamation', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proclamations'] });
    },
  });

  const sheriffModerateMutation = useMutation({
    mutationFn: async (data: { townId: string; postId: string; reason: string }) => {
      return (await api.post('/governance/sheriff-moderate-post', data)).data;
    },
    onSuccess: () => {
      setModeratePostId('');
      setModerateReason('');
    },
  });

  const sheriffBountyMutation = useMutation({
    mutationFn: async (data: { townId: string; title: string; description: string; reward: number; durationDays: number }) => {
      return (await api.post('/governance/sheriff-post-bounty', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'sheriff-status'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      setBountyTitle('');
      setBountyDesc('');
      setBountyReward('');
      setBountyDays('3');
    },
  });

  // -------------------------------------------------------------------------
  // Treaties
  // -------------------------------------------------------------------------
  const { data: treatiesData } = useQuery<TreatiesResponse>({
    queryKey: ['treaties', townId],
    queryFn: async () => (await api.get(`/treaties/town/${townId}`)).data,
    enabled: !!townId,
  });

  const { data: allTownsData } = useQuery<{ towns: { id: string; name: string }[] }>({
    queryKey: ['world', 'towns-list'],
    queryFn: async () => (await api.get('/world/towns')).data,
    enabled: !!townId,
  });

  const [showTreatyForm, setShowTreatyForm] = useState(false);
  const [treatyPartnerTownId, setTreatyPartnerTownId] = useState('');
  const [treatyType, setTreatyType] = useState<TownTreatyType>('TRADE_AGREEMENT');
  const [treatyDuration, setTreatyDuration] = useState(DEFAULT_TREATY_DURATION);
  const [treatyTariffReduction, setTreatyTariffReduction] = useState(50);
  const [treatyGoldPerDay, setTreatyGoldPerDay] = useState('50');
  const [treatyDirection, setTreatyDirection] = useState<'A_TO_B' | 'B_TO_A'>('A_TO_B');

  const proposeTreatyMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.post('/treaties/propose', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treaties'] });
      setShowTreatyForm(false);
      setTreatyPartnerTownId('');
    },
  });

  const respondTreatyMutation = useMutation({
    mutationFn: async (data: { treatyId: string; response: 'ACCEPT' | 'REJECT' }) => (await api.post('/treaties/respond', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treaties'] }),
  });

  const voteTreatyMutation = useMutation({
    mutationFn: async (data: { treatyId: string; vote: boolean }) => (await api.post('/treaties/vote', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treaties'] }),
  });

  const cancelTreatyMutation = useMutation({
    mutationFn: async (data: { treatyId: string }) => (await api.post('/treaties/cancel', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treaties'] }),
  });

  const renewTreatyMutation = useMutation({
    mutationFn: async (data: { treatyId: string }) => (await api.post('/treaties/renew', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treaties'] }),
  });

  // Trade policy form state
  const [tariffSlider, setTariffSlider] = useState<number>(0);
  const [tariffInitialized, setTariffInitialized] = useState(false);
  const [minListingPrice, setMinListingPrice] = useState<string>('');
  const [maxListingQty, setMaxListingQty] = useState<string>('');
  const [ceilingItemId, setCeilingItemId] = useState<string>('');
  const [ceilingMaxPrice, setCeilingMaxPrice] = useState<string>('');

  // Town law form state
  const [lawTitle, setLawTitle] = useState('');
  const [lawDescription, setLawDescription] = useState('');
  const [lawType, setLawType] = useState<string>(TOWN_LAW_TYPES[0]);
  const [showRepealedLaws, setShowRepealedLaws] = useState(false);
  const [confirmRepealId, setConfirmRepealId] = useState<string | null>(null);

  const setTariffMutation = useMutation({
    mutationFn: async (data: { townId: string; secularTariffRate: number }) => {
      return (await api.post('/governance/set-secular-tariff', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
    },
  });

  const setMarketRulesMutation = useMutation({
    mutationFn: async (data: { townId: string; minListingPrice?: number; maxListingQuantity?: number }) => {
      return (await api.post('/governance/set-market-rules', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
    },
  });

  const addPriceCeilingMutation = useMutation({
    mutationFn: async (data: { townId: string; itemTemplateId: string; maxPrice: number }) => {
      return (await api.post('/governance/set-price-ceiling', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'price-ceilings'] });
      setCeilingItemId('');
      setCeilingMaxPrice('');
    },
  });

  const removePriceCeilingMutation = useMutation({
    mutationFn: async (data: { townId: string; itemTemplateId: string }) => {
      return (await api.delete('/governance/remove-price-ceiling', { data })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'price-ceilings'] });
    },
  });

  const enactLawMutation = useMutation({
    mutationFn: async (data: { townId: string; title: string; description: string; lawType: string }) => {
      return (await api.post('/governance/enact-town-law', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-laws'] });
      setLawTitle('');
      setLawDescription('');
      setLawType(TOWN_LAW_TYPES[0]);
    },
  });

  const repealLawMutation = useMutation({
    mutationFn: async (data: { lawId: string }) => {
      return (await api.post('/governance/repeal-town-law', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-laws'] });
      setConfirmRepealId(null);
    },
  });

  // -------------------------------------------------------------------------
  // Relocation mutations
  // -------------------------------------------------------------------------
  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/relocate/preview', { targetTownId: townId });
      return res.data as RelocationPreview;
    },
    onSuccess: (data) => {
      setRelocatePreview(data);
      setRelocateError(null);
      setShowRelocateModal(true);
    },
    onError: (err: any) => {
      setRelocateError(err?.response?.data?.error ?? 'Failed to preview relocation.');
      setRelocatePreview(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/relocate/confirm', { targetTownId: townId });
      return res.data as RelocationResult;
    },
    onSuccess: (data) => {
      setRelocateSuccess(data);
      setShowRelocateModal(false);
      setRelocatePreview(null);
      // Invalidate all relevant queries so the UI reflects the new home
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['governance'] });
    },
    onError: (err: any) => {
      setRelocateError(err?.response?.data?.error ?? 'Relocation failed.');
    },
  });

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------
  if (charLoading) {
    return (
      <div className="pt-12 space-y-6 max-w-7xl mx-auto px-4 py-8">
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
      </div>
    );
  }

  if (!character || !townId) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Landmark className="w-16 h-16 text-realm-text-muted/30 mb-6" />
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">No Town</h2>
        <p className="text-realm-text-secondary mb-6">You must be in a town to visit the Town Hall.</p>
        <button
          onClick={() => navigate('/town')}
          className="px-8 py-3 border border-realm-gold-500 text-realm-gold-400 font-display text-lg rounded-sm hover:bg-realm-bg-700 transition-colors"
        >
          Back to Town
        </button>
      </div>
    );
  }

  const town = townData?.town;
  const elections = electionsData?.elections ?? [];
  const isMayor = town?.mayor?.id === character.id;
  const isSheriff = town?.policy?.sheriffId === character.id;
  const activeProjects = (projectsData?.projects ?? []).filter(p => p.status === 'IN_PROGRESS');
  const recentCompleted = (projectsData?.projects ?? []).filter(p => p.status === 'COMPLETED').slice(0, 5);
  const adjacentRoutes = (routesData?.routes ?? []) as AdjacentRoute[];

  // Trade policy derived values (after town is available)
  const currentTariff = typeof town?.tradePolicy?.secularTariffRate === 'number'
    ? (town.tradePolicy.secularTariffRate as number) : 0;
  if (!tariffInitialized && town) {
    setTariffSlider(Math.round(currentTariff * 100));
    setTariffInitialized(true);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader
            title="Town Hall"
            icon={<Landmark className="w-8 h-8 text-realm-gold-400" />}
            subtitle={town?.name ?? 'Loading...'}
            actions={
              <>
                {isMayor && (
                  <button
                    onClick={() => navigate('/governance')}
                    className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors"
                  >
                    Governance Panel
                  </button>
                )}
                <button
                  onClick={() => navigate('/elections')}
                  className="px-5 py-2 border border-realm-gold-500/60 text-realm-gold-400 font-display text-sm rounded-sm hover:bg-realm-bg-700 transition-colors"
                >
                  Elections
                </button>
                <button
                  onClick={() => navigate('/town')}
                  className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-700 transition-colors"
                >
                  Back to Town
                </button>
              </>
            }
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {townLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            </div>
          </div>
        ) : !town ? (
          <div className="text-center py-20">
            <Landmark className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
            <p className="text-realm-text-muted">Failed to load town information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column -- Mayor & Officials */}
            <div className="space-y-6">
              {/* Mayor card */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Mayor
                </h3>
                {town.mayor ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-realm-gold-500/30 bg-realm-gold-500/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-realm-gold-400" />
                    </div>
                    <div>
                      <p className="text-realm-text-primary font-semibold">{town.mayor.name}</p>
                      <p className="text-realm-text-muted text-xs">Level {town.mayor.level}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-realm-text-muted text-sm">No mayor elected yet.</p>
                )}
              </div>

              {/* Sheriff */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Sheriff
                </h3>
                {town.policy?.sheriff ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border-2 border-realm-border bg-realm-border/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-realm-text-secondary" />
                    </div>
                    <div>
                      <p className="text-realm-text-primary font-semibold text-sm">{town.policy.sheriff.name}</p>
                      <p className="text-realm-text-muted text-xs">Level {town.policy.sheriff.level}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-realm-text-muted text-sm">No sheriff appointed.</p>
                )}
              </div>

              {/* Council Members */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Town Council
                </h3>
                {(town.council ?? []).length === 0 ? (
                  <p className="text-realm-text-muted text-sm">No council members appointed.</p>
                ) : (
                  <div className="space-y-2">
                    {(town.council ?? []).map((cm) => (
                      <div key={cm.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-realm-text-primary text-sm font-semibold">{cm.character.name}</p>
                          <p className="text-realm-text-muted text-[10px] capitalize">{cm.role}</p>
                        </div>
                        <span className="text-realm-text-muted text-xs">Lv. {cm.character.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Middle + Right columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Treasury & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Town Treasury</h3>
                  <GoldAmount amount={town.treasury ?? 0} className="text-realm-gold-400 font-display text-2xl" />
                </div>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Tax Rate</h3>
                  <p className="text-realm-gold-400 font-display text-2xl">
                    {Math.round((town.taxRate ?? 0.10) * 100)}%
                  </p>
                </div>
              </div>

              {/* Elections */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-realm-gold-400" />
                  Elections
                </h2>
                {martialLawStatus?.active && (
                  <div className="bg-red-600/15 border border-red-500/40 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-display text-red-400 uppercase font-bold">Martial Law</p>
                      <p className="text-xs text-red-300/70">
                        Elections suspended until {new Date(martialLawStatus.endsAt!).toLocaleDateString()}
                        {martialLawStatus.declaredBy && ` — Declared by ${martialLawStatus.declaredBy}`}
                      </p>
                    </div>
                  </div>
                )}
                {electionsLoading ? (
                  <div className="flex items-center gap-2 text-realm-text-muted text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading elections...
                  </div>
                ) : elections.length === 0 ? (
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 text-center">
                    <Gavel className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                    <p className="text-realm-text-muted text-sm">No active or upcoming elections.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {elections.map((election) => (
                      <div
                        key={election.id}
                        className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 hover:border-realm-gold-500/40 transition-colors cursor-pointer"
                        onClick={() => navigate('/elections')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-realm-text-primary text-sm">
                              {election.type === 'MAYOR' ? 'Mayoral' : election.type === 'HIGH_PRIEST' ? `High Priest — ${election.god?.name ?? 'Unknown'}` : 'Ruler'} Election
                            </h4>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm border ${PHASE_COLORS[election.phase] ?? ''}`}>
                              {election.phase}
                            </span>
                          </div>
                          <CountdownTimer endDate={election.endDate} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-realm-text-muted">
                          <span>Term #{election.termNumber}</span>
                          <span>{election.candidateCount} candidate{election.candidateCount !== 1 ? 's' : ''}</span>
                          <span>{election.voteCount} vote{election.voteCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Referendums */}
              {referendumsData && referendumsData.length > 0 && (
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-realm-teal-400" />
                    Referendums
                  </h2>
                  <div className="space-y-3">
                    {referendumsData.map((r) => {
                      const isActive = r.status === 'VOTING';
                      const timeLeft = isActive ? Math.max(0, Math.ceil((new Date(r.endsAt).getTime() - Date.now()) / (1000 * 60 * 60))) : 0;
                      return (
                        <div key={r.id} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-display text-realm-text-primary text-sm">{r.question}</h4>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm border ${
                              r.status === 'PASSED' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                              r.status === 'FAILED' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                              'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-realm-text-muted mb-2">
                            <span>Proposed by {r.proposedBy?.name ?? 'Unknown'}</span>
                            <span>{r.policyType.replace('_', ' ')}</span>
                            {isActive && <span>{timeLeft}h remaining</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-400">For: {r.votesFor}</span>
                            <span className="text-red-400">Against: {r.votesAgainst}</span>
                          </div>
                          {isActive && character?.homeTownId === townId && (
                            <div className="flex gap-2 mt-3">
                              <button
                                className="px-3 py-1.5 text-xs font-display border border-green-500/50 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                                onClick={() => voteRefMutation.mutate({ referendumId: r.id, vote: true })}
                                disabled={voteRefMutation.isPending}
                              >
                                Vote For
                              </button>
                              <button
                                className="px-3 py-1.5 text-xs font-display border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors"
                                onClick={() => voteRefMutation.mutate({ referendumId: r.id, vote: false })}
                                disabled={voteRefMutation.isPending}
                              >
                                Vote Against
                              </button>
                            </div>
                          )}
                          {voteRefMutation.isError && (
                            <p className="text-[11px] text-red-400 mt-1">{(voteRefMutation.error as any)?.response?.data?.error || 'Failed to vote'}</p>
                          )}
                          {voteRefMutation.isSuccess && (
                            <p className="text-[11px] text-green-400 mt-1">{voteRefMutation.data.message}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Town Info */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-realm-gold-400" />
                  Town Details
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-realm-text-muted text-xs">Population</dt>
                      <dd className="text-realm-text-primary font-semibold">{(town.population ?? 0).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Treasury</dt>
                      <dd><GoldAmount amount={town.treasury ?? 0} className="text-realm-text-primary font-semibold" /></dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Tax Rate</dt>
                      <dd className="text-realm-text-primary font-semibold">{Math.round((town.taxRate ?? 0.10) * 100)}%</dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Officials</dt>
                      <dd className="text-realm-text-primary font-semibold">{(town.council ?? []).length + (town.mayor ? 1 : 0) + (town.policy?.sheriff ? 1 : 0)}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              {/* Town Health (Metrics) */}
              {metricsData?.metrics && metricsData.metrics.length > 0 && (
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-realm-gold-400" />
                    Town Health
                  </h2>
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-3">
                    {metricsData.metrics.map(m => {
                      const MetricIcon = METRIC_ICONS[m.metricType] ?? Shield;
                      const isComingSoon = !m.isActive;
                      return (
                        <div key={m.metricType} className={isComingSoon ? 'opacity-40' : ''}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-realm-text-secondary flex items-center gap-1.5">
                              <MetricIcon className="w-3.5 h-3.5" />
                              {m.label}
                              {isComingSoon && (
                                <span className="text-[9px] text-realm-text-muted italic ml-1">Coming soon</span>
                              )}
                            </span>
                            <span className={`font-semibold ${isComingSoon ? 'text-realm-text-muted' : getMetricTextColor(m.effectiveValue)}`}>
                              {m.effectiveValue}/100
                            </span>
                          </div>
                          <div className="w-full h-2 bg-realm-bg-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isComingSoon ? 'bg-realm-text-muted/30' : getMetricColor(m.effectiveValue)}`}
                              style={{ width: `${m.effectiveValue}%` }}
                            />
                          </div>
                          {!isComingSoon && (m.modifier !== 0 || m.projectModifier !== 0) && (
                            <p className="text-[10px] text-realm-text-muted mt-0.5">
                              Base: {m.baseValue}
                              {m.modifier !== 0 && <> {m.modifier > 0 ? '+' : ''}{m.modifier} (Religion)</>}
                              {m.projectModifier !== 0 && <> {m.projectModifier > 0 ? '+' : ''}{m.projectModifier} (Projects)</>}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Town Policies */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-realm-gold-400" />
                  Town Policies
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-realm-text-muted text-xs mb-1">Building Permits</dt>
                      <dd className={`font-semibold text-sm ${town.buildingPermits ? 'text-realm-success' : 'text-realm-danger'}`}>
                        {town.buildingPermits ? 'Enabled' : 'Disabled'}
                      </dd>
                      <p className="text-[10px] text-realm-text-muted mt-0.5">
                        {town.buildingPermits ? 'Permits required to construct' : 'Building freely without permits'}
                      </p>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs mb-1">Trade Policy</dt>
                      <dd className="text-realm-text-secondary text-sm">
                        {town.tradePolicy && Object.keys(town.tradePolicy).length > 0
                          ? Object.entries(town.tradePolicy).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : 'No special trade restrictions'}
                      </dd>
                    </div>
                  </div>

                  {/* Building Capacity */}
                  {town.buildingCapacity && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-realm-text-muted">Building Capacity</span>
                        <span className="text-realm-text-secondary font-semibold">
                          {town.buildingCapacity.used} / {town.buildingCapacity.total} slots
                        </span>
                      </div>
                      <div className="w-full h-2 bg-realm-bg-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-realm-gold-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (town.buildingCapacity.used / town.buildingCapacity.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Available Buildings */}
                  {town.features?.availableBuildings && town.features.availableBuildings.length > 0 && (
                    <div>
                      <p className="text-realm-text-muted text-xs mb-2">
                        Available Building Types ({town.features.availableBuildings.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {town.features.availableBuildings.map(bt => (
                          <span key={bt} className="text-[10px] px-2 py-0.5 rounded-sm bg-realm-bg-800 border border-realm-border text-realm-text-secondary">
                            {buildingTypeLabel(bt)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Resources & Specialty */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Gem className="w-5 h-5 text-realm-gold-400" />
                  Resources &amp; Specialty
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-4">
                  {/* Specialty & Prosperity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-realm-text-muted text-xs mb-1">Town Specialty</p>
                      <p className="text-realm-text-primary font-display text-sm">
                        {town.features?.specialty ?? 'General'}
                      </p>
                    </div>
                    <div>
                      <p className="text-realm-text-muted text-xs mb-1">Prosperity</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < (town.features?.prosperityLevel ?? 0) ? 'text-realm-gold-400 fill-realm-gold-400' : 'text-realm-bg-500'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resource List */}
                  {town.resources && town.resources.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-realm-text-muted text-xs">Natural Resources</p>
                      {town.resources.map(r => (
                        <div key={r.resourceType} className="flex items-center gap-3">
                          <span className="text-xs text-realm-text-secondary w-28 flex-shrink-0">
                            {r.resourceType.charAt(0) + r.resourceType.slice(1).toLowerCase().replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 h-2 bg-realm-bg-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                r.abundance >= 70 ? 'bg-realm-success' :
                                r.abundance >= 40 ? 'bg-realm-gold-500' :
                                r.abundance >= 20 ? 'bg-realm-bronze' : 'bg-realm-danger'
                              }`}
                              style={{ width: `${r.abundance}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-realm-text-muted w-8 text-right">{r.abundance}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Citizen Registry */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-realm-gold-400" />
                  Citizens
                  {citizensData && (
                    <span className="text-sm font-normal text-realm-text-muted ml-1">
                      ({citizensData.totalCount} resident{citizensData.totalCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  {citizensLoading ? (
                    <div className="flex items-center gap-2 text-realm-text-muted text-sm py-4 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading citizens...
                    </div>
                  ) : !citizensData || citizensData.citizens.length === 0 ? (
                    <p className="text-realm-text-muted text-sm text-center py-4">No registered residents.</p>
                  ) : (
                    <div className="space-y-1">
                      {citizensData.citizens.map(c => {
                        const isMe = c.id === character?.id;
                        const isMayor = c.id === town.mayor?.id;
                        const isSheriff = c.id === town.policy?.sheriffId;
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between py-2 px-2 rounded-sm ${isMe ? 'bg-realm-gold-500/5 border border-realm-gold-500/20' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-sm font-semibold truncate ${isMe ? 'text-realm-gold-400' : 'text-realm-text-primary'}`}>
                                {c.name}
                              </span>
                              {isMayor && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 flex-shrink-0">Mayor</span>
                              )}
                              {isSheriff && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 flex-shrink-0">Sheriff</span>
                              )}
                              {isMe && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 flex-shrink-0">You</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-realm-text-muted flex-shrink-0">
                              {c.professions.length > 0 && (
                                <span className="hidden sm:inline">{c.professions.map(p => p.charAt(0) + p.slice(1).toLowerCase().replace(/_/g, ' ')).join(', ')}</span>
                              )}
                              <span>{c.race.charAt(0) + c.race.slice(1).toLowerCase()}</span>
                              <span className="font-semibold">Lv. {c.level}</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Load More */}
                      {citizensData.totalCount > citizenPage * citizensData.limit && (
                        <button
                          onClick={() => setCitizenPage(p => p + 1)}
                          className="w-full mt-3 py-2 text-xs text-realm-gold-400 hover:text-realm-gold-300 flex items-center justify-center gap-1 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          Load More ({citizensData.totalCount - citizenPage * citizensData.limit} remaining)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ============================================================ */}
              {/* Town Projects */}
              {/* ============================================================ */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Hammer className="w-5 h-5 text-realm-gold-400" />
                  Town Projects
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-4">
                  {/* Active Projects */}
                  {activeProjects.length > 0 ? (
                    <div className="space-y-3">
                      {activeProjects.map(p => {
                        const now = Date.now();
                        const start = new Date(p.startedAt).getTime();
                        const end = new Date(p.completesAt).getTime();
                        const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                        const daysRemaining = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
                        return (
                          <div key={p.id} className="bg-realm-bg-800 rounded-sm p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="text-sm font-semibold text-realm-text-primary">{p.config?.name ?? p.projectType}</span>
                                <span className="text-[10px] text-realm-text-muted ml-2">by {p.commissionedBy?.name ?? 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-realm-text-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {daysRemaining}d remaining
                                </span>
                                {isMayor && (
                                  <button
                                    onClick={() => cancelProjectMutation.mutate(p.id)}
                                    disabled={cancelProjectMutation.isPending}
                                    className="text-[10px] text-realm-danger hover:text-realm-danger/80"
                                    title="Cancel (no refund)"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] text-realm-text-muted mb-2">{p.config?.description}</p>
                            <div className="w-full h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
                              <div className="h-full bg-realm-gold-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-realm-text-muted text-sm">No active projects.</p>
                  )}

                  {/* Recent Completed */}
                  {recentCompleted.length > 0 && (
                    <div>
                      <p className="text-realm-text-muted text-xs mb-2">Recently Completed</p>
                      {recentCompleted.map(p => (
                        <div key={p.id} className="flex items-center gap-2 py-1">
                          <Check className="w-3 h-3 text-realm-success" />
                          <span className="text-xs text-realm-text-secondary">{p.config?.name ?? p.projectType}</span>
                          <span className="text-[10px] text-realm-text-muted">({p.config?.cost}g)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Commission Button (mayor only) */}
                  {isMayor && (
                    <button
                      onClick={() => setShowProjectModal(true)}
                      disabled={activeProjects.length >= 2}
                      className="w-full py-2.5 bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display text-sm rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {activeProjects.length >= 2 ? 'Max 2 Concurrent Projects' : 'Commission Project'}
                    </button>
                  )}
                </div>
              </section>

              {/* ============================================================ */}
              {/* Emergency Spending (mayor only) */}
              {/* ============================================================ */}
              {isMayor && (
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-realm-gold-400" />
                    Emergency Spending
                  </h2>
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-3">
                    {(Object.entries(EMERGENCY_SPENDING_TYPES) as [EmergencySpendingType, typeof EMERGENCY_SPENDING_TYPES[EmergencySpendingType]][]).map(([key, config]) => {
                      const needsMetric = 'requiresMetricSelection' in config && config.requiresMetricSelection;
                      return (
                        <div key={key} className="bg-realm-bg-800 rounded-sm p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-realm-text-primary">{config.name}</span>
                            <GoldAmount amount={config.cost} className="text-xs text-realm-gold-400" />
                          </div>
                          <p className="text-[10px] text-realm-text-muted mb-2">{config.description}</p>
                          {needsMetric && (
                            <select
                              value={emergencyMetric}
                              onChange={e => setEmergencyMetric(e.target.value)}
                              className="w-full mb-2 px-2 py-1 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary"
                            >
                              <option value="">Select metric...</option>
                              {['DEFENSES', 'PUBLIC_HEALTH', 'LAW_ENFORCEMENT', 'MARKET_EFFICIENCY'].map(m => (
                                <option key={m} value={m}>{METRIC_LABELS[m as TownMetricType] ?? m}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => emergencyMutation.mutate({
                              townId: townId!,
                              spendingType: key,
                              ...(needsMetric && emergencyMetric ? { targetMetric: emergencyMetric } : {}),
                            })}
                            disabled={emergencyMutation.isPending || (needsMetric && !emergencyMetric) || (town?.treasury ?? 0) < config.cost}
                            className="w-full py-1.5 text-xs bg-realm-danger/10 border border-realm-danger/30 text-realm-danger font-display rounded-sm hover:bg-realm-danger/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Spend Now
                          </button>
                        </div>
                      );
                    })}
                    {emergencyMutation.isSuccess && (
                      <p className="text-xs text-realm-success">Emergency spending applied!</p>
                    )}
                    {emergencyMutation.isError && (
                      <p className="text-xs text-realm-danger">{(emergencyMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                    )}
                  </div>
                </section>
              )}

              {/* ============================================================ */}
              {/* Sheriff & Patrols */}
              {/* ============================================================ */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-realm-gold-400" />
                  Sheriff Patrols
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 space-y-4">
                  {sheriffData?.sheriff ? (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Sheriff</p>
                        <p className="text-xs text-realm-text-primary font-semibold truncate">{sheriffData.sheriff.name}</p>
                      </div>
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Daily Budget</p>
                        <p className="text-xs text-realm-gold-400 font-semibold">{sheriffData.budget}g</p>
                      </div>
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Used Today</p>
                        <p className="text-xs text-realm-text-secondary font-semibold">{sheriffData.budgetUsed}g</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-realm-text-muted text-sm">No sheriff appointed.</p>
                  )}

                  {/* Active Patrols */}
                  {sheriffData?.patrols && sheriffData.patrols.length > 0 && (
                    <div>
                      <p className="text-realm-text-muted text-xs mb-2">Active Patrols</p>
                      {sheriffData.patrols.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                          <span className="text-realm-text-secondary">
                            <Route className="w-3 h-3 inline mr-1" />
                            Route: {p.routeId === 'ALL_ADJACENT' ? 'All Adjacent' : p.routeId.slice(0, 8) + '...'}
                          </span>
                          <span className="text-realm-text-muted">
                            -{(p.dangerReduction * 100).toFixed(0)}% danger
                            <span className="ml-2">
                              expires {new Date(p.expiresAt).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sheriff: Deploy Patrol */}
                  {isSheriff && townId && (
                    <div className="border-t border-realm-border pt-3">
                      <p className="text-xs text-realm-text-muted mb-2">Deploy Patrol</p>
                      <select
                        value={patrolRouteId}
                        onChange={e => setPatrolRouteId(e.target.value)}
                        className="w-full mb-2 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary"
                      >
                        <option value="">Select route...</option>
                        {adjacentRoutes.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name || `Route ${r.id.slice(0, 8)}`} ({r.nodeCount} nodes, {r.nodeCount * SHERIFF_PATROL_CONFIG.costPerNode}g)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => patrolMutation.mutate({ townId, routeId: patrolRouteId })}
                        disabled={!patrolRouteId || patrolMutation.isPending}
                        className="w-full py-2 text-xs bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 font-display rounded-sm hover:bg-realm-teal-300/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Deploy Patrol
                      </button>
                      {patrolMutation.isError && (
                        <p className="text-xs text-realm-danger mt-1">{(patrolMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                      )}
                    </div>
                  )}

                  {/* Mayor: Set Sheriff Budget */}
                  {isMayor && sheriffData?.sheriff && townId && (
                    <div className="border-t border-realm-border pt-3">
                      <p className="text-xs text-realm-text-muted mb-2">Set Sheriff Daily Budget</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={SHERIFF_PATROL_CONFIG.minDailyBudget}
                          max={SHERIFF_PATROL_CONFIG.maxDailyBudget}
                          value={budgetValue}
                          onChange={e => setBudgetValue(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-realm-gold-400 w-10 text-right">{budgetValue}g</span>
                        <button
                          onClick={() => setBudgetMutation.mutate({ townId, budget: budgetValue })}
                          disabled={setBudgetMutation.isPending}
                          className="px-3 py-1 text-[10px] bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sheriff: Notice Board Moderation */}
                  {isSheriff && townId && (
                    <div className="border-t border-realm-border pt-3">
                      <p className="text-xs text-realm-text-muted mb-2 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Moderate Notice Board Post
                      </p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={moderatePostId}
                          onChange={e => setModeratePostId(e.target.value)}
                          placeholder="Post ID"
                          className="flex-1 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                        />
                        <input
                          type="text"
                          value={moderateReason}
                          onChange={e => setModerateReason(e.target.value)}
                          placeholder="Reason"
                          className="flex-1 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                        />
                        <button
                          onClick={() => sheriffModerateMutation.mutate({ townId, postId: moderatePostId, reason: moderateReason })}
                          disabled={sheriffModerateMutation.isPending || !moderatePostId || !moderateReason}
                          className="px-3 py-1.5 text-[10px] bg-realm-danger/10 border border-realm-danger/30 text-realm-danger rounded-sm hover:bg-realm-danger/20 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      {sheriffModerateMutation.isError && (
                        <p className="text-xs text-realm-danger">{(sheriffModerateMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                      )}
                      {sheriffModerateMutation.isSuccess && <p className="text-xs text-realm-success">Post moderated.</p>}
                    </div>
                  )}

                  {/* Sheriff: Official Bounty */}
                  {isSheriff && townId && (
                    <div className="border-t border-realm-border pt-3">
                      <p className="text-xs text-realm-text-muted mb-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Post Official Bounty
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" value={bountyTitle} onChange={e => setBountyTitle(e.target.value)} placeholder="Title" maxLength={100}
                          className="px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50" />
                        <input type="number" value={bountyReward} onChange={e => setBountyReward(e.target.value)} placeholder="Reward (gold)" min={10}
                          className="px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50" />
                      </div>
                      <input type="text" value={bountyDesc} onChange={e => setBountyDesc(e.target.value)} placeholder="Description" maxLength={500}
                        className="w-full mb-2 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50" />
                      <div className="flex items-center gap-2">
                        <select value={bountyDays} onChange={e => setBountyDays(e.target.value)}
                          className="px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary">
                          {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                        </select>
                        <button
                          onClick={() => sheriffBountyMutation.mutate({ townId, title: bountyTitle.trim(), description: bountyDesc.trim(), reward: Number(bountyReward), durationDays: Number(bountyDays) })}
                          disabled={sheriffBountyMutation.isPending || !bountyTitle.trim() || !bountyDesc.trim() || !bountyReward}
                          className="flex-1 py-1.5 text-[10px] bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 rounded-sm hover:bg-realm-gold-500/20 disabled:opacity-40"
                        >
                          {sheriffBountyMutation.isPending ? 'Posting...' : 'Post Bounty (from treasury)'}
                        </button>
                      </div>
                      {sheriffBountyMutation.isError && (
                        <p className="text-xs text-realm-danger mt-1">{(sheriffBountyMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                      )}
                    </div>
                  )}

                  {/* Sheriff: Travel Logs */}
                  {(isSheriff || travelLogsData) && townId && (
                    <div className="border-t border-realm-border pt-3">
                      <button
                        onClick={() => setShowTravelLogs(!showTravelLogs)}
                        className="flex items-center gap-1.5 text-xs text-realm-text-muted hover:text-realm-text-secondary transition-colors"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTravelLogs ? 'rotate-180' : ''}`} />
                        <Route className="w-3 h-3" /> Travel Logs (last 7 days)
                      </button>
                      {showTravelLogs && travelLogsData?.logs && (
                        <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5">
                          {travelLogsData.logs.length > 0 ? travelLogsData.logs.map(l => (
                            <div key={l.id} className="flex items-center justify-between bg-realm-bg-800/50 rounded-sm px-2 py-1 text-[10px]">
                              <span className="text-realm-text-secondary">
                                <span className={l.action === 'ARRIVED' ? 'text-realm-success' : 'text-amber-400'}>{l.action}</span>
                                {' '}{l.characterName} <span className="text-realm-text-muted">({l.characterRace})</span>
                              </span>
                              <span className="text-realm-text-muted">
                                {l.action === 'ARRIVED' && l.fromTown ? `from ${l.fromTown}` : ''}
                                {l.action === 'DEPARTED' && l.toTown ? `to ${l.toTown}` : ''}
                                {' · '}{new Date(l.occurredAt).toLocaleString()}
                              </span>
                            </div>
                          )) : (
                            <p className="text-[10px] text-realm-text-muted italic">No travel activity recorded.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ============================================================ */}
              {/* Town Upgrades (G2) */}
              {/* ============================================================ */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-realm-gold-400" />
                  Town Upgrades
                </h2>

                {/* Maintenance Summary */}
                {upgradesData && upgradesData.upgrades.length > 0 && (
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Daily Maintenance</p>
                        <p className="text-xs text-realm-gold-400 font-semibold">{upgradesData.totalMaintenance}g/day</p>
                      </div>
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Treasury</p>
                        <p className="text-xs text-realm-gold-400 font-semibold">{(town?.treasury ?? 0).toLocaleString()}g</p>
                      </div>
                      <div className="bg-realm-bg-800 rounded-sm p-2 text-center">
                        <p className="text-[10px] text-realm-text-muted">Runway</p>
                        {(() => {
                          const days = upgradesData.totalMaintenance > 0
                            ? Math.floor((town?.treasury ?? 0) / upgradesData.totalMaintenance)
                            : Infinity;
                          return (
                            <p className={`text-xs font-semibold ${days < 5 ? 'text-realm-danger' : days < 10 ? 'text-amber-400' : 'text-realm-success'}`}>
                              {days === Infinity ? '∞' : `${days} days`}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    {(() => {
                      const days = upgradesData.totalMaintenance > 0
                        ? Math.floor((town?.treasury ?? 0) / upgradesData.totalMaintenance)
                        : Infinity;
                      if (days < 5 && days !== Infinity) {
                        return (
                          <div className="mt-2 px-3 py-1.5 bg-realm-danger/10 border border-realm-danger/30 rounded-sm">
                            <p className="text-[11px] text-realm-danger flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Warning: Less than 5 days of maintenance runway! Upgrades will degrade if treasury runs out.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Upgrade Track Cards */}
                <div className="space-y-3">
                  {/* Active upgrades */}
                  {(upgradesData?.upgrades ?? []).map(upgrade => {
                    const tierDots = [1, 2, 3];
                    return (
                      <div key={upgrade.upgradeType} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-sm font-display text-realm-text-primary">{upgrade.name}</h3>
                            <p className="text-[11px] text-realm-text-muted">{upgrade.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {tierDots.map(t => (
                              <div
                                key={t}
                                className={`w-2.5 h-2.5 rounded-full border ${
                                  t <= upgrade.tier
                                    ? 'bg-realm-gold-400 border-realm-gold-500'
                                    : 'bg-realm-bg-900 border-realm-border'
                                }`}
                              />
                            ))}
                            <span className="text-[10px] text-realm-text-muted ml-1">Tier {upgrade.tier}</span>
                          </div>
                        </div>

                        {/* Status */}
                        {upgrade.status === 'DEGRADING' && (
                          <div className="mb-2 px-3 py-1.5 bg-realm-danger/10 border border-realm-danger/30 rounded-sm">
                            <p className="text-[11px] text-realm-danger flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              DEGRADING — {upgrade.degradingDays}/{DEGRADATION_THRESHOLD_DAYS} days until tier drop!
                            </p>
                          </div>
                        )}

                        {/* Effects */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(upgrade.effects).map(([key, val]) => (
                            <span key={key} className="text-[10px] bg-realm-bg-800 border border-realm-border rounded-sm px-2 py-0.5 text-realm-text-secondary">
                              {formatEffectLabel(key)}: {formatEffectValue(key, val as number)}
                            </span>
                          ))}
                        </div>

                        {/* Maintenance */}
                        <p className="text-[10px] text-realm-text-muted mb-3">
                          Maintenance: <span className="text-realm-gold-400">{upgrade.dailyMaintenance}g/day</span>
                        </p>

                        {/* Mayor Controls */}
                        {isMayor && townId && (
                          <div className="flex gap-2">
                            {/* Upgrade / Restore button */}
                            {upgrade.status === 'DEGRADING' ? (
                              <button
                                onClick={() => purchaseUpgradeMutation.mutate({ townId, upgradeType: upgrade.upgradeType })}
                                disabled={purchaseUpgradeMutation.isPending}
                                className="flex-1 py-1.5 text-[11px] bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 font-display rounded-sm hover:bg-realm-teal-300/20 transition-colors disabled:opacity-40"
                              >
                                Restore ({UPGRADE_TYPES[upgrade.upgradeType as UpgradeType]?.tiers[upgrade.tier as 1 | 2 | 3]?.cost ?? 0}g)
                              </button>
                            ) : upgrade.nextTier ? (
                              <button
                                onClick={() => purchaseUpgradeMutation.mutate({ townId, upgradeType: upgrade.upgradeType })}
                                disabled={purchaseUpgradeMutation.isPending}
                                className="flex-1 py-1.5 text-[11px] bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                              >
                                Upgrade to Tier {upgrade.nextTier.tier} ({upgrade.nextTier.cost}g)
                              </button>
                            ) : (
                              <span className="flex-1 py-1.5 text-[11px] text-realm-text-muted text-center">Max Tier</span>
                            )}

                            {/* Downgrade button */}
                            {showDowngradeConfirm === upgrade.upgradeType ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => downgradeUpgradeMutation.mutate({ townId, upgradeType: upgrade.upgradeType })}
                                  disabled={downgradeUpgradeMutation.isPending}
                                  className="px-2 py-1.5 text-[10px] bg-realm-danger/20 border border-realm-danger/40 text-realm-danger rounded-sm hover:bg-realm-danger/30"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setShowDowngradeConfirm(null)}
                                  className="px-2 py-1.5 text-[10px] border border-realm-border text-realm-text-muted rounded-sm hover:bg-realm-bg-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDowngradeConfirm(upgrade.upgradeType)}
                                className="px-3 py-1.5 text-[10px] border border-realm-danger/30 text-realm-danger/70 rounded-sm hover:bg-realm-danger/10 transition-colors"
                              >
                                {upgrade.tier <= 1 ? 'Remove' : 'Downgrade'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Mutation errors */}
                        {purchaseUpgradeMutation.isError && (
                          <p className="text-xs text-realm-danger mt-1">{(purchaseUpgradeMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                        )}
                        {downgradeUpgradeMutation.isError && (
                          <p className="text-xs text-realm-danger mt-1">{(downgradeUpgradeMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Available (not yet purchased) upgrades */}
                  {isMayor && townId && (upgradesData?.available ?? []).map(avail => (
                    <div key={avail.upgradeType} className="bg-realm-bg-700/50 border border-realm-border/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-display text-realm-text-secondary">{avail.name}</h3>
                          <p className="text-[11px] text-realm-text-muted">{avail.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map(t => (
                            <div key={t} className="w-2.5 h-2.5 rounded-full border bg-realm-bg-900 border-realm-border" />
                          ))}
                          <span className="text-[10px] text-realm-text-muted ml-1">Not purchased</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(avail.tier1Effects).map(([key, val]) => (
                          <span key={key} className="text-[10px] bg-realm-bg-800/50 border border-realm-border/50 rounded-sm px-2 py-0.5 text-realm-text-muted">
                            {formatEffectLabel(key)}: {formatEffectValue(key, val as number)}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => purchaseUpgradeMutation.mutate({ townId, upgradeType: avail.upgradeType })}
                        disabled={purchaseUpgradeMutation.isPending}
                        className="w-full py-2 text-xs bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                      >
                        Purchase Tier 1 ({avail.tier1Cost}g, {avail.tier1Maintenance}g/day)
                      </button>
                    </div>
                  ))}

                  {!upgradesData?.upgrades?.length && !isMayor && (
                    <div className="bg-realm-bg-700/50 border border-realm-border/50 rounded-lg p-4">
                      <p className="text-sm text-realm-text-muted text-center">No town upgrades purchased yet.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Proclamations — visible to all                                  */}
        {/* ================================================================ */}
        {town && (
          <div className="mt-10 border-t border-realm-border pt-8">
            <section>
              <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-realm-gold-400" />
                Proclamations
              </h2>

              {/* Pinned proclamation */}
              {(() => {
                const pinned = proclamationsData?.proclamations?.find(p => p.isPinned && !p.isExpired);
                const recent = (proclamationsData?.proclamations ?? []).filter(p => !p.isPinned);
                return (
                  <div className="space-y-3">
                    {pinned && (
                      <div className={`border rounded-lg p-4 ${pinned.isUrgent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-realm-bg-700 border-realm-gold-500/30'}`}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Pin className="w-3.5 h-3.5 text-realm-gold-400" />
                            <h3 className="text-sm font-display text-realm-text-primary">{pinned.title}</h3>
                            {pinned.isUrgent && <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-400 border border-amber-500/30">URGENT</span>}
                          </div>
                        </div>
                        <p className="text-xs text-realm-text-secondary whitespace-pre-wrap">{pinned.content}</p>
                        <p className="text-[10px] text-realm-text-muted/70 mt-2">
                          — {pinned.author.name}, {new Date(pinned.createdAt).toLocaleDateString()}
                          {pinned.expiresAt && ` · Expires ${new Date(pinned.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    )}

                    {recent.length > 0 && (
                      <div className="space-y-2">
                        {recent.slice(0, 5).map(p => (
                          <div key={p.id} className={`bg-realm-bg-700/50 border border-realm-border/50 rounded-lg p-3 ${p.isExpired ? 'opacity-50' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-display text-realm-text-secondary">{p.title}</h3>
                                {p.isUrgent && <span className="text-[9px] px-1 py-0.5 rounded-sm bg-amber-500/10 text-amber-400/70">URGENT</span>}
                                {p.isExpired && <span className="text-[9px] px-1 py-0.5 rounded-sm bg-realm-text-muted/10 text-realm-text-muted">EXPIRED</span>}
                              </div>
                              {isMayor && !p.isPinned && !p.isExpired && (
                                <button
                                  onClick={() => pinProclamationMutation.mutate({ proclamationId: p.id })}
                                  disabled={pinProclamationMutation.isPending}
                                  className="px-2 py-0.5 text-[10px] border border-realm-gold-500/30 text-realm-gold-400/70 rounded-sm hover:bg-realm-gold-500/10"
                                >
                                  Pin
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-realm-text-muted line-clamp-2">{p.content}</p>
                            <p className="text-[10px] text-realm-text-muted/60 mt-1">— {p.author.name}, {new Date(p.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!pinned && recent.length === 0 && (
                      <div className="bg-realm-bg-700/50 border border-realm-border/50 rounded-lg p-4">
                        <p className="text-sm text-realm-text-muted text-center">No proclamations issued yet.</p>
                      </div>
                    )}

                    {/* Mayor: Issue new proclamation */}
                    {isMayor && townId && (
                      <div className="bg-realm-bg-700 border border-realm-gold-500/20 rounded-lg p-4 mt-3">
                        <h3 className="text-sm font-display text-realm-gold-400 mb-3 flex items-center gap-2">
                          <Megaphone className="w-4 h-4" />
                          Issue Proclamation
                        </h3>
                        <div className="space-y-2 mb-3">
                          <input
                            type="text"
                            value={procTitle}
                            onChange={e => setProcTitle(e.target.value)}
                            placeholder="Proclamation title"
                            maxLength={PROCLAMATION_CONFIG.maxTitleLength}
                            className="w-full px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                          />
                          <textarea
                            value={procContent}
                            onChange={e => setProcContent(e.target.value)}
                            placeholder="Proclamation content"
                            maxLength={PROCLAMATION_CONFIG.maxContentLength}
                            rows={4}
                            className="w-full px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50 resize-none"
                          />
                          <label className="flex items-center gap-2 text-xs text-realm-text-muted">
                            <input
                              type="checkbox"
                              checked={procUrgent}
                              onChange={e => setProcUrgent(e.target.checked)}
                              className="rounded accent-amber-500"
                            />
                            Urgent (yellow banner, 3-day expiry, 7-day cooldown)
                          </label>
                        </div>
                        <button
                          onClick={() => issueProclamationMutation.mutate({ townId, title: procTitle.trim(), content: procContent.trim(), isUrgent: procUrgent })}
                          disabled={issueProclamationMutation.isPending || !procTitle.trim() || !procContent.trim()}
                          className="w-full py-2 text-xs bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                        >
                          {issueProclamationMutation.isPending ? 'Issuing...' : 'Issue Proclamation'}
                        </button>
                        {issueProclamationMutation.isError && (
                          <p className="text-xs text-realm-danger mt-1">{(issueProclamationMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* Diplomatic Treaties — visible to all                            */}
        {/* ================================================================ */}
        {town && townId && (
          <div className="mt-10 border-t border-realm-border pt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display text-realm-text-primary flex items-center gap-2">
                <Handshake className="w-5 h-5 text-realm-teal-300" />
                Diplomatic Treaties
              </h2>
              <span className="text-xs text-realm-text-muted">
                {treatiesData?.activeCount ?? 0}/{treatiesData?.maxTreaties ?? MAX_ACTIVE_TREATIES} active
              </span>
            </div>

            {/* Active treaties */}
            {(treatiesData?.active ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-display text-realm-text-secondary">Active Treaties</h3>
                {treatiesData!.active.map(t => {
                  const daysLeft = t.expiresAt ? Math.max(0, Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
                  const inRenewalWindow = daysLeft <= RENEWAL_WINDOW_DAYS;
                  const alreadyApprovedRenewal = t.renewalApprovedBy.includes(character?.id ?? '');
                  return (
                    <div key={t.id} className={`bg-realm-bg-700 border rounded-lg p-3 ${t.status === 'CANCELLING' ? 'border-realm-warning/40' : 'border-realm-teal-300/30'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-display text-realm-text-primary">{t.typeName}</span>
                          <span className="text-xs text-realm-text-muted ml-2">with {t.partnerTown.name}</span>
                          {t.status === 'CANCELLING' && (
                            <span className="ml-2 text-xs text-realm-warning">(Cancelling — {t.cancelNoticeUntil ? Math.max(0, Math.ceil((new Date(t.cancelNoticeUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0}d notice remaining)</span>
                          )}
                        </div>
                        <span className="text-xs text-realm-text-muted whitespace-nowrap">{daysLeft}d left</span>
                      </div>
                      {t.terms.tariffReduction != null && (
                        <p className="text-[11px] text-realm-text-muted mt-1">Tariff reduction: {Math.round(Number(t.terms.tariffReduction) * 100)}%</p>
                      )}
                      {t.terms.goldPerDay != null && (
                        <p className="text-[11px] text-realm-text-muted mt-1">Gold transfer: {String(t.terms.goldPerDay)}g/day ({String(t.terms.direction) === 'A_TO_B' ? '→' : '←'})</p>
                      )}
                      {isMayor && t.status === 'ACTIVE' && (
                        <div className="flex gap-2 mt-2">
                          {inRenewalWindow && !alreadyApprovedRenewal && (
                            <button
                              onClick={() => renewTreatyMutation.mutate({ treatyId: t.id })}
                              disabled={renewTreatyMutation.isPending}
                              className="px-2 py-1 text-[11px] bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 rounded-sm hover:bg-realm-teal-300/20 disabled:opacity-40"
                            >
                              Renew
                            </button>
                          )}
                          {alreadyApprovedRenewal && <span className="text-[11px] text-realm-teal-300">Renewal approved — awaiting partner</span>}
                          <button
                            onClick={() => cancelTreatyMutation.mutate({ treatyId: t.id })}
                            disabled={cancelTreatyMutation.isPending}
                            className="px-2 py-1 text-[11px] bg-realm-danger/10 border border-realm-danger/30 text-realm-danger rounded-sm hover:bg-realm-danger/20 disabled:opacity-40"
                          >
                            Cancel ({CANCEL_NOTICE_DAYS}d notice)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending ratification */}
            {(treatiesData?.pending ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-display text-realm-text-secondary">Pending Ratification</h3>
                {treatiesData!.pending.map(t => (
                  <div key={t.id} className="bg-realm-bg-700 border border-realm-purple-500/30 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-display text-realm-text-primary">{t.typeName}</span>
                        <span className="text-xs text-realm-text-muted ml-2">with {t.partnerTown.name}</span>
                      </div>
                      {t.ratificationEndsAt && (
                        <span className="text-xs text-realm-text-muted">
                          {Math.max(0, Math.ceil((new Date(t.ratificationEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))}d left to vote
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] text-realm-text-muted">
                      <span>Town A: {t.townAVotesFor} for / {t.townAVotesAgainst} against</span>
                      <span>Town B: {t.townBVotesFor} for / {t.townBVotesAgainst} against</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => voteTreatyMutation.mutate({ treatyId: t.id, vote: true })}
                        disabled={voteTreatyMutation.isPending}
                        className="px-2 py-1 text-[11px] bg-realm-success/10 border border-realm-success/30 text-realm-success rounded-sm hover:bg-realm-success/20 disabled:opacity-40"
                      >
                        <Check className="w-3 h-3 inline mr-0.5" /> Vote Yes
                      </button>
                      <button
                        onClick={() => voteTreatyMutation.mutate({ treatyId: t.id, vote: false })}
                        disabled={voteTreatyMutation.isPending}
                        className="px-2 py-1 text-[11px] bg-realm-danger/10 border border-realm-danger/30 text-realm-danger rounded-sm hover:bg-realm-danger/20 disabled:opacity-40"
                      >
                        <X className="w-3 h-3 inline mr-0.5" /> Vote No
                      </button>
                      {isMayor && (
                        <button
                          onClick={() => cancelTreatyMutation.mutate({ treatyId: t.id })}
                          disabled={cancelTreatyMutation.isPending}
                          className="px-2 py-1 text-[11px] bg-realm-text-muted/10 border border-realm-text-muted/30 text-realm-text-muted rounded-sm hover:bg-realm-text-muted/20 disabled:opacity-40 ml-auto"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                    {voteTreatyMutation.isError && (
                      <p className="text-xs text-realm-danger mt-1">{(voteTreatyMutation.error as any)?.response?.data?.error ?? 'Vote failed'}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Incoming proposals */}
            {(treatiesData?.proposed ?? []).filter(t => t.isIncoming).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-display text-realm-text-secondary">Incoming Proposals</h3>
                {treatiesData!.proposed.filter(t => t.isIncoming).map(t => (
                  <div key={t.id} className="bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg p-3">
                    <div>
                      <span className="text-sm font-display text-realm-text-primary">{t.typeName}</span>
                      <span className="text-xs text-realm-text-muted ml-2">from {t.partnerTown.name}</span>
                    </div>
                    <p className="text-[11px] text-realm-text-muted mt-1">{t.typeDescription}</p>
                    {t.terms.tariffReduction != null && (
                      <p className="text-[11px] text-realm-text-muted">Proposed tariff reduction: {Math.round(Number(t.terms.tariffReduction) * 100)}%</p>
                    )}
                    {t.terms.goldPerDay != null && (
                      <p className="text-[11px] text-realm-text-muted">Gold transfer: {String(t.terms.goldPerDay)}g/day</p>
                    )}
                    {isMayor && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => respondTreatyMutation.mutate({ treatyId: t.id, response: 'ACCEPT' })}
                          disabled={respondTreatyMutation.isPending}
                          className="px-2 py-1 text-[11px] bg-realm-success/10 border border-realm-success/30 text-realm-success rounded-sm hover:bg-realm-success/20 disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondTreatyMutation.mutate({ treatyId: t.id, response: 'REJECT' })}
                          disabled={respondTreatyMutation.isPending}
                          className="px-2 py-1 text-[11px] bg-realm-danger/10 border border-realm-danger/30 text-realm-danger rounded-sm hover:bg-realm-danger/20 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {respondTreatyMutation.isError && (
                      <p className="text-xs text-realm-danger mt-1">{(respondTreatyMutation.error as any)?.response?.data?.error ?? 'Response failed'}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing proposals */}
            {(treatiesData?.proposed ?? []).filter(t => !t.isIncoming).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-display text-realm-text-secondary">Outgoing Proposals</h3>
                {treatiesData!.proposed.filter(t => !t.isIncoming).map(t => (
                  <div key={t.id} className="bg-realm-bg-700 border border-realm-bg-600 rounded-lg p-3">
                    <span className="text-sm font-display text-realm-text-primary">{t.typeName}</span>
                    <span className="text-xs text-realm-text-muted ml-2">to {t.partnerTown.name}</span>
                    <span className="text-xs text-realm-text-muted ml-2">— awaiting response</span>
                    {isMayor && (
                      <button
                        onClick={() => cancelTreatyMutation.mutate({ treatyId: t.id })}
                        disabled={cancelTreatyMutation.isPending}
                        className="ml-2 px-2 py-0.5 text-[11px] bg-realm-text-muted/10 border border-realm-text-muted/30 text-realm-text-muted rounded-sm hover:bg-realm-text-muted/20 disabled:opacity-40"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mayor: Propose Treaty */}
            {isMayor && (
              <div>
                {!showTreatyForm ? (
                  <button
                    onClick={() => setShowTreatyForm(true)}
                    disabled={(treatiesData?.activeCount ?? 0) >= MAX_ACTIVE_TREATIES}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 font-display rounded-sm hover:bg-realm-teal-300/20 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" /> Propose Treaty
                  </button>
                ) : (
                  <div className="bg-realm-bg-700 border border-realm-teal-300/30 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-display text-realm-teal-300">Propose a Treaty</h3>

                    {/* Partner town selector */}
                    <div>
                      <label className="block text-[11px] text-realm-text-muted mb-1">Partner Town</label>
                      <select
                        value={treatyPartnerTownId}
                        onChange={e => setTreatyPartnerTownId(e.target.value)}
                        className="w-full bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary"
                      >
                        <option value="">Select a town...</option>
                        {(allTownsData?.towns ?? []).filter(t => t.id !== townId).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Treaty type */}
                    <div>
                      <label className="block text-[11px] text-realm-text-muted mb-1">Treaty Type</label>
                      <div className="space-y-1">
                        {(Object.entries(TREATY_TYPES) as [TownTreatyType, typeof TREATY_TYPES[TownTreatyType]][]).map(([key, cfg]) => (
                          <label key={key} className={`flex items-start gap-2 p-2 rounded cursor-pointer border ${treatyType === key ? 'border-realm-teal-300/40 bg-realm-teal-300/5' : 'border-transparent'}`}>
                            <input type="radio" name="treatyType" checked={treatyType === key} onChange={() => setTreatyType(key)} className="mt-0.5 accent-realm-teal-300" />
                            <div>
                              <span className="text-xs text-realm-text-primary">{cfg.name}</span>
                              <p className="text-[11px] text-realm-text-muted">{cfg.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Type-specific terms */}
                    {treatyType === 'TRADE_AGREEMENT' && (
                      <div>
                        <label className="block text-[11px] text-realm-text-muted mb-1">Tariff Reduction: {treatyTariffReduction}%</label>
                        <input type="range" min={MIN_TARIFF_REDUCTION * 100} max={MAX_TARIFF_REDUCTION * 100} step={5} value={treatyTariffReduction} onChange={e => setTreatyTariffReduction(Number(e.target.value))} className="w-full accent-realm-teal-300" />
                      </div>
                    )}
                    {treatyType === 'RESOURCE_SHARING' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] text-realm-text-muted mb-1">Gold per Day</label>
                          <input type="number" min={MIN_RESOURCE_SHARING_GOLD} max={MAX_RESOURCE_SHARING_GOLD} value={treatyGoldPerDay} onChange={e => setTreatyGoldPerDay(e.target.value)} className="w-full bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setTreatyDirection('A_TO_B')} className={`flex-1 px-2 py-1 text-[11px] rounded border ${treatyDirection === 'A_TO_B' ? 'border-realm-teal-300/40 bg-realm-teal-300/10 text-realm-teal-300' : 'border-realm-border text-realm-text-muted'}`}>
                            We send →
                          </button>
                          <button type="button" onClick={() => setTreatyDirection('B_TO_A')} className={`flex-1 px-2 py-1 text-[11px] rounded border ${treatyDirection === 'B_TO_A' ? 'border-realm-teal-300/40 bg-realm-teal-300/10 text-realm-teal-300' : 'border-realm-border text-realm-text-muted'}`}>
                            ← We receive
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Duration */}
                    <div>
                      <label className="block text-[11px] text-realm-text-muted mb-1">Duration: {treatyDuration} days</label>
                      <input type="range" min={MIN_TREATY_DURATION} max={MAX_TREATY_DURATION} step={5} value={treatyDuration} onChange={e => setTreatyDuration(Number(e.target.value))} className="w-full accent-realm-teal-300" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const terms: Record<string, unknown> = {};
                          if (treatyType === 'TRADE_AGREEMENT') terms.tariffReduction = treatyTariffReduction / 100;
                          if (treatyType === 'RESOURCE_SHARING') { terms.goldPerDay = parseInt(treatyGoldPerDay) || 50; terms.direction = treatyDirection; }
                          proposeTreatyMutation.mutate({ townAId: townId, townBId: treatyPartnerTownId, treatyType, terms, duration: treatyDuration });
                        }}
                        disabled={proposeTreatyMutation.isPending || !treatyPartnerTownId}
                        className="px-3 py-1.5 text-xs bg-realm-teal-300/10 border border-realm-teal-300/30 text-realm-teal-300 font-display rounded-sm hover:bg-realm-teal-300/20 transition-colors disabled:opacity-40"
                      >
                        {proposeTreatyMutation.isPending ? 'Proposing...' : 'Propose'}
                      </button>
                      <button onClick={() => setShowTreatyForm(false)} className="px-3 py-1.5 text-xs text-realm-text-muted border border-realm-border rounded-sm hover:bg-realm-bg-600">
                        Cancel
                      </button>
                    </div>
                    {proposeTreatyMutation.isError && (
                      <p className="text-xs text-realm-danger">{(proposeTreatyMutation.error as any)?.response?.data?.error ?? 'Proposal failed'}</p>
                    )}
                    {cancelTreatyMutation.isError && (
                      <p className="text-xs text-realm-danger">{(cancelTreatyMutation.error as any)?.response?.data?.error ?? 'Action failed'}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No treaties */}
            {!treatiesData?.active?.length && !treatiesData?.pending?.length && !treatiesData?.proposed?.length && (
              <p className="text-xs text-realm-text-muted">No active or pending treaties.</p>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Trade Policy & Town Laws — home town residents only             */}
        {/* ================================================================ */}
        {town && isHomeTown && (
          <div className="mt-10 border-t border-realm-border pt-8 space-y-8">
            {/* Trade Policy */}
            <section>
              <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-realm-gold-400" />
                Trade Policy
              </h2>

              <div className="space-y-4">
                {/* Secular Tariff */}
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                  <h3 className="text-sm font-display text-realm-text-secondary mb-2">Secular Tariff</h3>
                  <p className="text-[11px] text-realm-text-muted mb-3">
                    Surcharge on non-resident market purchases. Revenue goes to town treasury.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={TRADE_POLICY_CONFIG.maxSecularTariff * 100}
                      step={1}
                      value={tariffSlider}
                      onChange={e => setTariffSlider(Number(e.target.value))}
                      disabled={!isMayor}
                      className="flex-1 h-2 accent-realm-gold-500"
                    />
                    <span className="text-sm font-display text-realm-gold-400 w-12 text-right">{tariffSlider}%</span>
                    {isMayor && (
                      <button
                        onClick={() => townId && setTariffMutation.mutate({ townId, secularTariffRate: tariffSlider / 100 })}
                        disabled={setTariffMutation.isPending || tariffSlider === Math.round(currentTariff * 100)}
                        className="px-3 py-1.5 text-[11px] bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                      >
                        {setTariffMutation.isPending ? 'Saving...' : 'Set'}
                      </button>
                    )}
                  </div>
                  {setTariffMutation.isError && (
                    <p className="text-xs text-realm-danger mt-1">{(setTariffMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                  )}
                  {setTariffMutation.isSuccess && (
                    <p className="text-xs text-realm-success mt-1">Tariff updated.</p>
                  )}
                </div>

                {/* Market Rules */}
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                  <h3 className="text-sm font-display text-realm-text-secondary mb-2">Market Rules</h3>
                  <p className="text-[11px] text-realm-text-muted mb-3">
                    Set minimum listing price and maximum listing quantity for the local market.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-realm-text-muted">Min Price (gold)</label>
                      <input
                        type="number"
                        min={0}
                        value={minListingPrice}
                        onChange={e => setMinListingPrice(e.target.value)}
                        placeholder={String(town.tradePolicy?.minListingPrice ?? 0)}
                        disabled={!isMayor}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-realm-text-muted">Max Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={maxListingQty}
                        onChange={e => setMaxListingQty(e.target.value)}
                        placeholder={String(town.tradePolicy?.maxListingQuantity ?? 0)}
                        disabled={!isMayor}
                        className="w-full mt-1 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-realm-text-muted mb-2">
                    Current: min price {String(town.tradePolicy?.minListingPrice ?? 0)}g, max qty {String(town.tradePolicy?.maxListingQuantity ?? '∞')}
                    {' '}(0 = no limit)
                  </p>
                  {isMayor && (
                    <button
                      onClick={() => {
                        if (!townId) return;
                        const payload: { townId: string; minListingPrice?: number; maxListingQuantity?: number } = { townId };
                        if (minListingPrice !== '') payload.minListingPrice = Number(minListingPrice);
                        if (maxListingQty !== '') payload.maxListingQuantity = Number(maxListingQty);
                        setMarketRulesMutation.mutate(payload);
                      }}
                      disabled={setMarketRulesMutation.isPending || (minListingPrice === '' && maxListingQty === '')}
                      className="w-full py-2 text-xs bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                    >
                      {setMarketRulesMutation.isPending ? 'Saving...' : 'Update Market Rules'}
                    </button>
                  )}
                  {setMarketRulesMutation.isError && (
                    <p className="text-xs text-realm-danger mt-1">{(setMarketRulesMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                  )}
                </div>

                {/* Price Ceilings */}
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                  <h3 className="text-sm font-display text-realm-text-secondary mb-2">Price Ceilings</h3>
                  <p className="text-[11px] text-realm-text-muted mb-3">
                    Maximum allowed listing price per item type. Sellers cannot list above the ceiling.
                  </p>

                  {(priceCeilingsData?.ceilings?.length ?? 0) > 0 ? (
                    <div className="space-y-1 mb-3">
                      {priceCeilingsData!.ceilings.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-realm-bg-800/50 rounded-sm px-3 py-2">
                          <span className="text-xs text-realm-text-secondary">{c.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-realm-gold-400 font-display">{c.maxPrice}g max</span>
                            {isMayor && (
                              <button
                                onClick={() => townId && removePriceCeilingMutation.mutate({ townId, itemTemplateId: c.itemTemplateId })}
                                disabled={removePriceCeilingMutation.isPending}
                                className="p-1 text-realm-danger/70 hover:text-realm-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-realm-text-muted mb-3 italic">No price ceilings set.</p>
                  )}

                  {isMayor && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ceilingItemId}
                        onChange={e => setCeilingItemId(e.target.value)}
                        placeholder="Item template ID"
                        className="flex-1 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                      />
                      <input
                        type="number"
                        min={1}
                        value={ceilingMaxPrice}
                        onChange={e => setCeilingMaxPrice(e.target.value)}
                        placeholder="Max gold"
                        className="w-24 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                      />
                      <button
                        onClick={() => {
                          if (!townId || !ceilingItemId || !ceilingMaxPrice) return;
                          addPriceCeilingMutation.mutate({ townId, itemTemplateId: ceilingItemId, maxPrice: Number(ceilingMaxPrice) });
                        }}
                        disabled={addPriceCeilingMutation.isPending || !ceilingItemId || !ceilingMaxPrice}
                        className="px-3 py-1.5 text-[11px] bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {addPriceCeilingMutation.isError && (
                    <p className="text-xs text-realm-danger mt-1">{(addPriceCeilingMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Town Laws */}
            <section>
              <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-realm-gold-400" />
                Town Laws
              </h2>

              {/* Active laws */}
              {(() => {
                const activeLaws = (townLawsData?.laws ?? []).filter(l => l.status === 'ACTIVE');
                const repealedLaws = (townLawsData?.laws ?? []).filter(l => l.status === 'REPEALED');
                return (
                  <div className="space-y-3">
                    {activeLaws.length > 0 ? (
                      activeLaws.map(law => (
                        <div key={law.id} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-display text-realm-text-primary">{law.title}</h3>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-realm-teal-300/10 text-realm-teal-300 border border-realm-teal-300/30">
                                {law.type}
                              </span>
                            </div>
                            {isMayor && (
                              confirmRepealId === law.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => repealLawMutation.mutate({ lawId: law.id })}
                                    disabled={repealLawMutation.isPending}
                                    className="px-2 py-1 text-[10px] bg-realm-danger/20 border border-realm-danger/40 text-realm-danger rounded-sm hover:bg-realm-danger/30"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmRepealId(null)}
                                    className="px-2 py-1 text-[10px] border border-realm-border text-realm-text-muted rounded-sm hover:bg-realm-bg-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmRepealId(law.id)}
                                  className="px-2 py-1 text-[10px] border border-realm-danger/30 text-realm-danger/70 rounded-sm hover:bg-realm-danger/10 transition-colors"
                                >
                                  Repeal
                                </button>
                              )
                            )}
                          </div>
                          <p className="text-xs text-realm-text-muted">{law.description}</p>
                          <p className="text-[10px] text-realm-text-muted/70 mt-1">
                            Enacted by {law.proposedByName} on {new Date(law.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-realm-bg-700/50 border border-realm-border/50 rounded-lg p-4">
                        <p className="text-sm text-realm-text-muted text-center">No active town laws.</p>
                      </div>
                    )}

                    {repealLawMutation.isError && (
                      <p className="text-xs text-realm-danger">{(repealLawMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                    )}

                    {/* Enact new law (mayor) */}
                    {isMayor && (
                      <div className="bg-realm-bg-700 border border-realm-gold-500/20 rounded-lg p-4">
                        <h3 className="text-sm font-display text-realm-gold-400 mb-3 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Enact New Law
                        </h3>
                        <p className="text-[10px] text-realm-text-muted mb-3">
                          {activeLaws.length}/{TRADE_POLICY_CONFIG.maxActiveTownLaws} law slots used.
                          Laws are executive declarations — they take effect immediately.
                        </p>
                        <div className="space-y-2 mb-3">
                          <input
                            type="text"
                            value={lawTitle}
                            onChange={e => setLawTitle(e.target.value)}
                            placeholder="Law title"
                            maxLength={100}
                            className="w-full px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50"
                          />
                          <textarea
                            value={lawDescription}
                            onChange={e => setLawDescription(e.target.value)}
                            placeholder="Description / decree text"
                            maxLength={500}
                            rows={3}
                            className="w-full px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary placeholder:text-realm-text-muted/50 resize-none"
                          />
                          <select
                            value={lawType}
                            onChange={e => setLawType(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary"
                          >
                            {TOWN_LAW_TYPES.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            if (!townId || !lawTitle.trim() || !lawDescription.trim()) return;
                            enactLawMutation.mutate({ townId, title: lawTitle.trim(), description: lawDescription.trim(), lawType });
                          }}
                          disabled={enactLawMutation.isPending || !lawTitle.trim() || !lawDescription.trim() || activeLaws.length >= TRADE_POLICY_CONFIG.maxActiveTownLaws}
                          className="w-full py-2 text-xs bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400 font-display rounded-sm hover:bg-realm-gold-500/20 transition-colors disabled:opacity-40"
                        >
                          {enactLawMutation.isPending ? 'Enacting...' : 'Enact Law'}
                        </button>
                        {enactLawMutation.isError && (
                          <p className="text-xs text-realm-danger mt-1">{(enactLawMutation.error as any)?.response?.data?.error ?? 'Failed'}</p>
                        )}
                      </div>
                    )}

                    {/* Repealed laws history */}
                    {repealedLaws.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowRepealedLaws(!showRepealedLaws)}
                          className="flex items-center gap-1.5 text-[11px] text-realm-text-muted hover:text-realm-text-secondary transition-colors"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRepealedLaws ? 'rotate-180' : ''}`} />
                          {repealedLaws.length} repealed law{repealedLaws.length > 1 ? 's' : ''}
                        </button>
                        {showRepealedLaws && (
                          <div className="mt-2 space-y-2">
                            {repealedLaws.map(law => (
                              <div key={law.id} className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-3 opacity-60">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xs font-display text-realm-text-muted line-through">{law.title}</h3>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-realm-danger/10 text-realm-danger/70 border border-realm-danger/20">
                                    REPEALED
                                  </span>
                                </div>
                                <p className="text-[11px] text-realm-text-muted/70">{law.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* Relocation Section — only when visiting a non-resident town      */}
        {/* ================================================================ */}
        {town && !isHomeTown && (
          <section className="mt-10 border-t border-realm-border pt-8">
            <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-realm-gold-400" />
              Relocate Here
            </h2>

            {/* Success banner */}
            {relocateSuccess && (
              <div className="bg-realm-success/10 border border-realm-success/30 rounded-lg p-5 mb-4">
                <h3 className="font-display text-realm-success text-sm mb-2">Relocation Complete!</h3>
                <p className="text-realm-text-secondary text-sm">
                  You are now a resident of <span className="text-realm-text-primary font-semibold">{relocateSuccess.newHomeTown.name}</span>.
                  {relocateSuccess.newHouse && (
                    <> A new cottage ({relocateSuccess.newHouse.name}) has been prepared for you.</>
                  )}
                </p>
                <p className="text-realm-text-muted text-xs mt-2">
                  Gold remaining: {relocateSuccess.goldRemaining.toLocaleString()}g
                </p>
                <button
                  onClick={() => navigate('/housing')}
                  className="mt-3 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors"
                >
                  View My Home
                </button>
              </div>
            )}

            {!relocateSuccess && (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <p className="text-realm-text-secondary text-sm mb-4">
                  Make <span className="text-realm-text-primary font-semibold">{town.name}</span> your new home town.
                  {character?.homeTownName && (
                    <> Your current home is <span className="text-realm-text-primary font-semibold">{character.homeTownName}</span>.</>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-realm-bg-800 rounded-sm p-3">
                    <p className="text-realm-text-muted text-xs">Cost</p>
                    <GoldAmount amount={500} className="text-realm-gold-400 font-display text-lg" />
                  </div>
                  <div className="bg-realm-bg-800 rounded-sm p-3">
                    <p className="text-realm-text-muted text-xs">Cooldown</p>
                    <p className="text-realm-gold-400 font-display text-lg">30 days</p>
                  </div>
                </div>
                <div className="bg-realm-danger/5 border border-realm-danger/20 rounded-sm p-3 mb-4">
                  <p className="text-realm-danger text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Warning: All fields, rancher buildings, workshops, livestock, and house storage items in your current home town will be permanently lost.
                  </p>
                </div>

                {relocateError && (
                  <div className="bg-realm-danger/10 border border-realm-danger/30 rounded-sm p-3 mb-4">
                    <p className="text-realm-danger text-sm">{relocateError}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setRelocateError(null);
                    previewMutation.mutate();
                  }}
                  disabled={previewMutation.isPending}
                  className="w-full px-5 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {previewMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Previewing...
                    </>
                  ) : (
                    <>
                      Preview Relocation
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ================================================================ */}
      {/* Relocation Confirmation Modal                                    */}
      {/* ================================================================ */}
      <RealmModal
        isOpen={showRelocateModal}
        onClose={() => { setShowRelocateModal(false); setRelocateError(null); }}
        title="Confirm Relocation"
      >
        {relocatePreview && (
          <div className="space-y-4">
            {/* Route summary */}
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-realm-bg-800 rounded-sm px-3 py-2 flex-1 text-center">
                <p className="text-realm-text-muted text-xs">From</p>
                <p className="text-realm-text-primary font-semibold">{relocatePreview.currentHomeTown?.name ?? 'None'}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
              <div className="bg-realm-bg-800 rounded-sm px-3 py-2 flex-1 text-center">
                <p className="text-realm-text-muted text-xs">To</p>
                <p className="text-realm-gold-400 font-semibold">{relocatePreview.targetTown.name}</p>
              </div>
            </div>

            {/* Cost */}
            <div className="flex items-center justify-between bg-realm-bg-800 rounded-sm p-3 text-sm">
              <span className="text-realm-text-muted">Relocation cost</span>
              <GoldAmount amount={relocatePreview.cost} className="text-realm-gold-400 font-semibold" />
            </div>

            {/* Warnings */}
            {relocatePreview.warnings.length > 0 && (
              <div className="bg-realm-danger/10 border border-realm-danger/30 rounded-sm p-3 space-y-2">
                <p className="text-realm-danger text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Property Losses
                </p>
                {relocatePreview.warnings.map((w, i) => (
                  <p key={i} className="text-realm-danger/80 text-xs pl-5">{w}</p>
                ))}
              </div>
            )}

            {/* Detailed losses */}
            {relocatePreview.losses.storageItems.length > 0 && (
              <div className="bg-realm-bg-800 rounded-sm p-3">
                <p className="text-realm-text-muted text-xs font-semibold mb-2">Storage items that will be LOST:</p>
                <div className="space-y-1">
                  {relocatePreview.losses.storageItems.map((item, i) => (
                    <p key={i} className="text-realm-danger text-xs">
                      {item.itemName} x{item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {relocatePreview.losses.assets.length > 0 && (
              <div className="bg-realm-bg-800 rounded-sm p-3">
                <p className="text-realm-text-muted text-xs font-semibold mb-2">Fields/rancher buildings that will be LOST:</p>
                <div className="space-y-1">
                  {relocatePreview.losses.assets.map((a, i) => (
                    <p key={i} className="text-realm-danger text-xs">
                      {a.professionType ?? a.spotType} (Tier {a.tier})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {relocatePreview.losses.livestock.length > 0 && (
              <div className="bg-realm-bg-800 rounded-sm p-3">
                <p className="text-realm-text-muted text-xs font-semibold mb-2">Livestock that will be LOST:</p>
                <div className="space-y-1">
                  {relocatePreview.losses.livestock.map((l, i) => (
                    <p key={i} className="text-realm-danger text-xs">
                      {l.name} ({l.animalType})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {relocatePreview.losses.buildings.length > 0 && (
              <div className="bg-realm-bg-800 rounded-sm p-3">
                <p className="text-realm-text-muted text-xs font-semibold mb-2">Workshops that will be LOST:</p>
                <div className="space-y-1">
                  {relocatePreview.losses.buildings.map((b, i) => (
                    <p key={i} className="text-realm-danger text-xs">
                      {b.name} (Lv. {b.level})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Error in modal */}
            {relocateError && (
              <div className="bg-realm-danger/10 border border-realm-danger/30 rounded-sm p-3">
                <p className="text-realm-danger text-sm">{relocateError}</p>
              </div>
            )}

            {/* Confirm / Cancel */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowRelocateModal(false); setRelocateError(null); }}
                className="flex-1 px-4 py-2.5 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRelocateError(null);
                  confirmMutation.mutate();
                }}
                disabled={confirmMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-realm-danger text-realm-text-primary font-display text-sm rounded-sm hover:bg-realm-danger/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Relocating...
                  </>
                ) : (
                  'Confirm Relocation'
                )}
              </button>
            </div>
          </div>
        )}
      </RealmModal>

      {/* Commission Project Modal */}
      <RealmModal
        isOpen={showProjectModal}
        onClose={() => { setShowProjectModal(false); setSelectedProjectType(null); setSelectedRouteId(''); }}
        title="Commission Project"
      >
        <div className="space-y-4">
          {PROJECT_CATEGORIES.map(cat => {
            const typeEntries = Object.entries(PROJECT_TYPES).filter(([, v]) => v.category === cat);
            if (typeEntries.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-xs text-realm-text-muted font-display mb-2">{cat}</p>
                <div className="space-y-2">
                  {typeEntries.map(([key, config]) => {
                    const isSelected = selectedProjectType === key;
                    const needsRoute = 'requiresRouteSelection' in config && config.requiresRouteSelection;
                    return (
                      <div
                        key={key}
                        className={`bg-realm-bg-800 rounded-sm p-3 cursor-pointer border transition-colors ${
                          isSelected ? 'border-realm-gold-500/60' : 'border-realm-border hover:border-realm-text-muted/40'
                        }`}
                        onClick={() => { setSelectedProjectType(key); setSelectedRouteId(''); }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-realm-text-primary">{config.name}</span>
                          <div className="flex items-center gap-3 text-xs text-realm-text-muted">
                            <span>{config.durationTicks} day{config.durationTicks > 1 ? 's' : ''}</span>
                            <GoldAmount amount={config.cost} className="text-realm-gold-400" />
                          </div>
                        </div>
                        <p className="text-[10px] text-realm-text-muted">{config.description}</p>

                        {isSelected && needsRoute && (
                          <select
                            value={selectedRouteId}
                            onChange={e => { e.stopPropagation(); setSelectedRouteId(e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            className="w-full mt-2 px-2 py-1.5 text-xs bg-realm-bg-900 border border-realm-border rounded-sm text-realm-text-secondary"
                          >
                            <option value="">Select route...</option>
                            {adjacentRoutes.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name || `Route ${r.id.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {commissionMutation.isError && (
            <p className="text-xs text-realm-danger">{(commissionMutation.error as any)?.response?.data?.error ?? 'Failed to commission project'}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowProjectModal(false); setSelectedProjectType(null); }}
              className="flex-1 px-4 py-2.5 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!selectedProjectType || !townId) return;
                const config = PROJECT_TYPES[selectedProjectType as ProjectType];
                commissionMutation.mutate({
                  townId,
                  projectType: selectedProjectType,
                  ...(config && 'requiresRouteSelection' in config && config.requiresRouteSelection && selectedRouteId ? { targetRouteId: selectedRouteId } : {}),
                });
              }}
              disabled={
                !selectedProjectType ||
                commissionMutation.isPending ||
                (() => { const c = PROJECT_TYPES[selectedProjectType as ProjectType]; return c && 'requiresRouteSelection' in c && c.requiresRouteSelection && !selectedRouteId; })()
              }
              className="flex-1 px-4 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {commissionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Commissioning...</>
              ) : (
                'Commission'
              )}
            </button>
          </div>
        </div>
      </RealmModal>
    </div>
  );
}
