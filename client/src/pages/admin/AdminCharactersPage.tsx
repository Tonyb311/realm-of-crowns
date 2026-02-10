import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  UserCog,
  MapPin,
  CircleDollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminCharacter {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  xp: number;
  gold: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  currentTownId: string | null;
  currentTownName: string | null;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  unspentStatPoints: number;
  unspentSkillPoints: number;
}

interface CharactersResponse {
  characters: AdminCharacter[];
  total: number;
  page: number;
  pageSize: number;
}

interface Town {
  id: string;
  name: string;
  regionName?: string;
}

interface TownsResponse {
  towns: Town[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

const ALL_RACES = [
  'All', 'Human', 'Elf', 'Dwarf', 'Harthfolk', 'Orc', 'Nethkin', 'Drakonid',
  'Half-Elf', 'Half-Orc', 'Gnome', 'Merfolk', 'Beastfolk', 'Faefolk',
  'Goliath', 'Nightborne', 'Mosskin', 'Forgeborn', 'Elementari', 'Revenant', 'Changeling',
];

const ALL_CLASSES = [
  'All', 'Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger', 'Bard',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminCharactersPage() {
  const queryClient = useQueryClient();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [raceFilter, setRaceFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [page, setPage] = useState(1);

  // Edit modal
  const [editChar, setEditChar] = useState<AdminCharacter | null>(null);
  const [editTab, setEditTab] = useState<'vitals' | 'economy' | 'location' | 'stats'>('vitals');
  const [editForm, setEditForm] = useState<Partial<AdminCharacter>>({});

  // Quick action modals
  const [teleportChar, setTeleportChar] = useState<AdminCharacter | null>(null);
  const [teleportTownId, setTeleportTownId] = useState('');
  const [giveGoldChar, setGiveGoldChar] = useState<AdminCharacter | null>(null);
  const [giveGoldAmount, setGiveGoldAmount] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Characters query
  const { data, isLoading, isError, error, refetch } = useQuery<CharactersResponse>({
    queryKey: ['admin', 'characters', debouncedSearch, raceFilter, classFilter, levelMin, levelMax, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (raceFilter !== 'All') params.race = raceFilter;
      if (classFilter !== 'All') params.className = classFilter;
      if (levelMin) params.levelMin = levelMin;
      if (levelMax) params.levelMax = levelMax;
      return (await api.get('/admin/characters', { params })).data;
    },
  });

  // Towns query (for location dropdown)
  const { data: townsData } = useQuery<TownsResponse>({
    queryKey: ['admin', 'towns', 'all'],
    queryFn: async () => (await api.get('/admin/world/towns', { params: { pageSize: '200' } })).data,
    enabled: !!editChar || !!teleportChar,
  });

  const towns = townsData?.towns ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // Update character mutation
  const updateMutation = useMutation({
    mutationFn: async ({ charId, updates }: { charId: string; updates: Partial<AdminCharacter> }) => {
      return (await api.patch(`/admin/characters/${charId}`, updates)).data;
    },
    onSuccess: () => {
      toast.success('Character updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'characters'] });
      setEditChar(null);
      setEditForm({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update character');
    },
  });

  // Teleport mutation
  const teleportMutation = useMutation({
    mutationFn: async ({ charId, townId }: { charId: string; townId: string }) => {
      return (await api.post(`/admin/characters/${charId}/teleport`, { townId })).data;
    },
    onSuccess: () => {
      toast.success('Character teleported successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'characters'] });
      setTeleportChar(null);
      setTeleportTownId('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to teleport character');
    },
  });

  // Give gold mutation
  const giveGoldMutation = useMutation({
    mutationFn: async ({ charId, amount }: { charId: string; amount: number }) => {
      return (await api.post(`/admin/characters/${charId}/give-gold`, { amount })).data;
    },
    onSuccess: () => {
      toast.success('Gold granted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'characters'] });
      setGiveGoldChar(null);
      setGiveGoldAmount('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to give gold');
    },
  });

  // Open edit modal
  const handleOpenEdit = useCallback((char: AdminCharacter) => {
    setEditChar(char);
    setEditTab('vitals');
    setEditForm({
      level: char.level,
      xp: char.xp,
      health: char.health,
      maxHealth: char.maxHealth,
      mana: char.mana,
      maxMana: char.maxMana,
      gold: char.gold,
      currentTownId: char.currentTownId,
      strength: char.strength,
      dexterity: char.dexterity,
      constitution: char.constitution,
      intelligence: char.intelligence,
      wisdom: char.wisdom,
      charisma: char.charisma,
      unspentStatPoints: char.unspentStatPoints,
      unspentSkillPoints: char.unspentSkillPoints,
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editChar) return;
    updateMutation.mutate({ charId: editChar.id, updates: editForm });
  }, [editChar, editForm, updateMutation]);

  const handleTeleport = useCallback(() => {
    if (!teleportChar || !teleportTownId) return;
    teleportMutation.mutate({ charId: teleportChar.id, townId: teleportTownId });
  }, [teleportChar, teleportTownId, teleportMutation]);

  const handleGiveGold = useCallback(() => {
    if (!giveGoldChar || !giveGoldAmount) return;
    const amount = parseInt(giveGoldAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid gold amount');
      return;
    }
    giveGoldMutation.mutate({ charId: giveGoldChar.id, amount });
  }, [giveGoldChar, giveGoldAmount, giveGoldMutation]);

  const updateField = useCallback(<K extends keyof AdminCharacter>(key: K, value: AdminCharacter[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Health bar helper
  const HealthBar = ({ current, max }: { current: number; max: number }) => {
    const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
    const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-dark-500 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-parchment-500">{current}/{max}</span>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-display text-primary-400 mb-6">Character Management</h1>

      {/* Filters */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-parchment-500 text-xs mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Character name..."
                className="w-full pl-9 pr-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Race */}
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Race</label>
            <select
              value={raceFilter}
              onChange={(e) => { setRaceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
            >
              {ALL_RACES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Class</label>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
            >
              {ALL_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Level Range */}
          <div className="flex items-end gap-2">
            <div>
              <label className="text-parchment-500 text-xs mb-1 block">Min Level</label>
              <input
                type="number"
                value={levelMin}
                onChange={(e) => { setLevelMin(e.target.value); setPage(1); }}
                placeholder="1"
                min="1"
                className="w-20 px-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
              />
            </div>
            <span className="text-parchment-500 pb-2">-</span>
            <div>
              <label className="text-parchment-500 text-xs mb-1 block">Max Level</label>
              <input
                type="number"
                value={levelMax}
                onChange={(e) => { setLevelMax(e.target.value); setPage(1); }}
                placeholder="100"
                min="1"
                className="w-20 px-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : isError ? (
        <ErrorMessage error={error} onRetry={refetch} />
      ) : !data?.characters?.length ? (
        <div className="text-center py-20">
          <UserCog className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
          <p className="text-parchment-500">No characters found.</p>
        </div>
      ) : (
        <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-dark-50 text-left">
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Name</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Race</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Class</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Level</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Gold</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Town</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Health</th>
                <th className="px-4 py-3 text-parchment-500 text-xs font-display">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-50">
              {data.characters.map((char) => (
                <tr
                  key={char.id}
                  className="hover:bg-dark-400/30 transition-colors cursor-pointer"
                  onClick={() => handleOpenEdit(char)}
                >
                  <td className="px-4 py-3 text-sm text-parchment-200 font-semibold">{char.name}</td>
                  <td className="px-4 py-3 text-sm text-parchment-300">{char.race}</td>
                  <td className="px-4 py-3 text-sm text-parchment-300">{char.className}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-primary-400 bg-primary-400/10 border border-primary-400/30 rounded px-2 py-0.5 font-display">
                      {char.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-primary-400">
                      <CircleDollarSign className="w-3 h-3" />
                      {char.gold.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-parchment-400">
                    {char.currentTownName || 'Traveling'}
                  </td>
                  <td className="px-4 py-3">
                    <HealthBar current={char.health} max={char.maxHealth} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setTeleportChar(char); setTeleportTownId(''); }}
                        className="p-1.5 text-parchment-400 border border-dark-50 rounded hover:bg-dark-400 hover:text-primary-400 transition-colors"
                        title="Teleport"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setGiveGoldChar(char); setGiveGoldAmount(''); }}
                        className="p-1.5 text-parchment-400 border border-dark-50 rounded hover:bg-dark-400 hover:text-primary-400 transition-colors"
                        title="Give Gold"
                      >
                        <CircleDollarSign className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-parchment-300 text-sm font-display">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Character Modal */}
      {editChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setEditChar(null)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-display text-primary-400">{editChar.name}</h3>
                <p className="text-parchment-500 text-xs">{editChar.race} {editChar.className} - Level {editChar.level}</p>
              </div>
              <button
                onClick={() => setEditChar(null)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-50 flex-shrink-0">
              {(['vitals', 'economy', 'location', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEditTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-display capitalize transition-colors border-b-2 ${
                    editTab === tab
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-parchment-500 hover:text-parchment-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {editTab === 'vitals' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Level</label>
                      <input
                        type="number"
                        value={editForm.level ?? ''}
                        onChange={(e) => updateField('level', parseInt(e.target.value, 10) || 0)}
                        min="1"
                        max="100"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">XP</label>
                      <input
                        type="number"
                        value={editForm.xp ?? ''}
                        onChange={(e) => updateField('xp', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Health</label>
                      <input
                        type="number"
                        value={editForm.health ?? ''}
                        onChange={(e) => updateField('health', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Max Health</label>
                      <input
                        type="number"
                        value={editForm.maxHealth ?? ''}
                        onChange={(e) => updateField('maxHealth', parseInt(e.target.value, 10) || 0)}
                        min="1"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Mana</label>
                      <input
                        type="number"
                        value={editForm.mana ?? ''}
                        onChange={(e) => updateField('mana', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Max Mana</label>
                      <input
                        type="number"
                        value={editForm.maxMana ?? ''}
                        onChange={(e) => updateField('maxMana', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'economy' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Gold</label>
                    <div className="relative">
                      <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                      <input
                        type="number"
                        value={editForm.gold ?? ''}
                        onChange={(e) => updateField('gold', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full pl-9 pr-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'location' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Current Town</label>
                    <select
                      value={editForm.currentTownId ?? ''}
                      onChange={(e) => updateField('currentTownId', e.target.value || null)}
                      className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                    >
                      <option value="">Traveling (no town)</option>
                      {towns.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}{t.regionName ? ` (${t.regionName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {editTab === 'stats' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { key: 'strength', label: 'STR' },
                      { key: 'dexterity', label: 'DEX' },
                      { key: 'constitution', label: 'CON' },
                      { key: 'intelligence', label: 'INT' },
                      { key: 'wisdom', label: 'WIS' },
                      { key: 'charisma', label: 'CHA' },
                    ] as const).map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-parchment-500 text-xs mb-1 block">{label}</label>
                        <input
                          type="number"
                          value={editForm[key] ?? ''}
                          onChange={(e) => updateField(key, parseInt(e.target.value, 10) || 0)}
                          min="1"
                          max="30"
                          className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dark-50">
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Unspent Stat Points</label>
                      <input
                        type="number"
                        value={editForm.unspentStatPoints ?? ''}
                        onChange={(e) => updateField('unspentStatPoints', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-parchment-500 text-xs mb-1 block">Unspent Skill Points</label>
                      <input
                        type="number"
                        value={editForm.unspentSkillPoints ?? ''}
                        onChange={(e) => updateField('unspentSkillPoints', parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-dark-50 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setEditChar(null)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teleport Modal */}
      {teleportChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setTeleportChar(null)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-primary-400">Teleport Character</h3>
              <button
                onClick={() => setTeleportChar(null)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-parchment-300 text-sm mb-4">
              Teleport <span className="text-parchment-200 font-semibold">{teleportChar.name}</span> to:
            </p>
            <div className="mb-6">
              <select
                value={teleportTownId}
                onChange={(e) => setTeleportTownId(e.target.value)}
                className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
              >
                <option value="">Select a town...</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.regionName ? ` (${t.regionName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTeleportChar(null)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTeleport}
                disabled={teleportMutation.isPending || !teleportTownId}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {teleportMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Teleport
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Give Gold Modal */}
      {giveGoldChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setGiveGoldChar(null)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-primary-400">Give Gold</h3>
              <button
                onClick={() => setGiveGoldChar(null)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-parchment-300 text-sm mb-1">
              Grant gold to <span className="text-parchment-200 font-semibold">{giveGoldChar.name}</span>
            </p>
            <p className="text-parchment-500 text-xs mb-4">
              Current balance: {giveGoldChar.gold.toLocaleString()} gold
            </p>
            <div className="mb-6">
              <label className="text-parchment-500 text-xs mb-1 block">Amount</label>
              <div className="relative">
                <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input
                  type="number"
                  value={giveGoldAmount}
                  onChange={(e) => setGiveGoldAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  className="w-full pl-9 pr-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setGiveGoldChar(null)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveGold}
                disabled={giveGoldMutation.isPending || !giveGoldAmount || parseInt(giveGoldAmount, 10) <= 0}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {giveGoldMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Give Gold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
