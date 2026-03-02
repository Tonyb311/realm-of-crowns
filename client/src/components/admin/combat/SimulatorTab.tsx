import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Play,
  Loader2,
  RotateCcw,
  Zap,
  Grid3X3,
  Swords,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import CombatReplay from './CombatReplay';
import BatchStatsDisplay from './BatchStatsDisplay';
import BatchGridMode from './BatchGridMode';

interface MonsterData {
  id: string;
  name: string;
  level: number;
  biome: string;
  stats: {
    hp: number;
    ac: number;
    attack: number;
    damage: string;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
}

interface SimConfig {
  playerLevel: number;
  playerStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  playerAC: number;
  playerHP?: number;
  playerWeapon: {
    name: string;
    diceCount: number;
    diceSides: number;
    bonusDamage: number;
    bonusAttack: number;
    damageModifierStat: 'str' | 'dex';
    attackModifierStat: 'str' | 'dex';
  };
  monsterName: string;
  monsterLevel: number;
  monsterStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  monsterHP: number;
  monsterAC: number;
  monsterDamage: string;
  monsterAttackBonus: number;
  iterations: number;
}

interface SimResult {
  config: SimConfig & { playerHP: number; iterations: number };
  summary: {
    playerWins: number;
    monsterWins: number;
    draws: number;
    playerWinRate: number;
    avgRounds: number;
    avgPlayerHpRemaining: number;
  };
  results: Array<{
    winner: string;
    rounds: number;
    playerHpRemaining: number;
    monsterHpRemaining: number;
    logs?: any[];
  }>;
}

const DEFAULT_CONFIG: SimConfig = {
  playerLevel: 1,
  playerStats: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
  playerAC: 14,
  playerWeapon: {
    name: 'Longsword',
    diceCount: 1,
    diceSides: 8,
    bonusDamage: 0,
    bonusAttack: 0,
    damageModifierStat: 'str',
    attackModifierStat: 'str',
  },
  monsterName: 'Goblin',
  monsterLevel: 1,
  monsterStats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  monsterHP: 12,
  monsterAC: 13,
  monsterDamage: '1d6+1',
  monsterAttackBonus: 3,
  iterations: 1,
};

const PRESETS: { label: string; config: Partial<SimConfig> }[] = [
  {
    label: 'L1 Human Warrior vs Goblin',
    config: {
      playerLevel: 1,
      playerStats: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
      playerAC: 16,
      playerWeapon: { name: 'Longsword', diceCount: 1, diceSides: 8, bonusDamage: 0, bonusAttack: 2, damageModifierStat: 'str', attackModifierStat: 'str' },
      monsterName: 'Goblin', monsterLevel: 1, monsterStats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      monsterHP: 12, monsterAC: 13, monsterDamage: '1d6+1', monsterAttackBonus: 3,
    },
  },
  {
    label: 'L5 Dwarf Fighter vs Orc Warrior',
    config: {
      playerLevel: 5,
      playerStats: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
      playerAC: 18,
      playerWeapon: { name: 'Battleaxe', diceCount: 1, diceSides: 10, bonusDamage: 1, bonusAttack: 3, damageModifierStat: 'str', attackModifierStat: 'str' },
      monsterName: 'Orc Warrior', monsterLevel: 5, monsterStats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
      monsterHP: 45, monsterAC: 14, monsterDamage: '1d12+3', monsterAttackBonus: 5,
    },
  },
  {
    label: 'L10 Elf Mage vs Troll',
    config: {
      playerLevel: 10,
      playerStats: { str: 8, dex: 14, con: 12, int: 18, wis: 14, cha: 12 },
      playerAC: 13,
      playerWeapon: { name: 'Staff', diceCount: 1, diceSides: 6, bonusDamage: 0, bonusAttack: 0, damageModifierStat: 'str', attackModifierStat: 'dex' },
      monsterName: 'Troll', monsterLevel: 10, monsterStats: { str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7 },
      monsterHP: 84, monsterAC: 15, monsterDamage: '2d6+4', monsterAttackBonus: 7,
    },
  },
  {
    label: 'L20 vs Young Dragon',
    config: {
      playerLevel: 20,
      playerStats: { str: 20, dex: 14, con: 18, int: 12, wis: 14, cha: 12 },
      playerAC: 20,
      playerWeapon: { name: 'Greatsword +2', diceCount: 2, diceSides: 6, bonusDamage: 4, bonusAttack: 7, damageModifierStat: 'str', attackModifierStat: 'str' },
      monsterName: 'Young Dragon', monsterLevel: 20, monsterStats: { str: 22, dex: 10, con: 20, int: 14, wis: 11, cha: 18 },
      monsterHP: 178, monsterAC: 18, monsterDamage: '2d10+6', monsterAttackBonus: 10,
    },
  },
];

export default function SimulatorTab() {
  const [mode, setMode] = useState<'1v1' | 'batch'>('1v1');
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  // Fetch monsters for the monster picker dropdown
  const { data: monstersData } = useQuery<{ monsters: MonsterData[] }>({
    queryKey: ['admin', 'monsters'],
    queryFn: async () => (await api.get('/admin/monsters')).data,
    staleTime: Infinity,
  });

  const simMutation = useMutation({
    mutationFn: async (cfg: SimConfig) => {
      const res = await api.post('/admin/combat/simulate', cfg);
      return res.data as SimResult;
    },
    onSuccess: (data) => {
      setSimResult(data);
      toast.success(`Simulation complete: ${data.summary.playerWinRate}% win rate`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Simulation failed');
    },
  });

  const updateConfig = (patch: Partial<SimConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const updatePlayerStats = (stat: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      playerStats: { ...prev.playerStats, [stat]: value },
    }));
  };

  const updatePlayerWeapon = (patch: Partial<SimConfig['playerWeapon']>) => {
    setConfig((prev) => ({
      ...prev,
      playerWeapon: { ...prev.playerWeapon, ...patch },
    }));
  };

  const updateMonsterStats = (stat: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      monsterStats: { ...prev.monsterStats, [stat]: value },
    }));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
    setSimResult(null);
  };

  const applyMonster = (monster: MonsterData) => {
    setConfig((prev) => ({
      ...prev,
      monsterName: monster.name,
      monsterLevel: monster.level,
      monsterStats: {
        str: monster.stats.str,
        dex: monster.stats.dex,
        con: monster.stats.con,
        int: monster.stats.int,
        wis: monster.stats.wis,
        cha: monster.stats.cha,
      },
      monsterHP: monster.stats.hp,
      monsterAC: monster.stats.ac,
      monsterDamage: monster.stats.damage,
      monsterAttackBonus: monster.stats.attack,
    }));
    setSimResult(null);
  };

  const runSimulation = () => {
    simMutation.mutate(config);
  };

  const isBatch = config.iterations > 10;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('1v1')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-display rounded transition-colors ${
            mode === '1v1'
              ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/50'
              : 'bg-realm-bg-700 text-realm-text-muted border border-realm-border hover:text-realm-text-secondary'
          }`}
        >
          <Swords className="w-4 h-4" />
          1v1 Mode
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-display rounded transition-colors ${
            mode === 'batch'
              ? 'bg-realm-teal-300/20 text-realm-teal-300 border border-realm-teal-300/50'
              : 'bg-realm-bg-700 text-realm-text-muted border border-realm-border hover:text-realm-text-secondary'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          Batch Grid Mode
        </button>
      </div>

      {mode === 'batch' ? (
        <BatchGridMode />
      ) : (
      <>
      {/* Quick Presets */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-3">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-display bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary hover:bg-realm-bg-500 rounded transition-colors border border-realm-border/50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Config */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-gold-400 text-sm mb-4">Player Configuration</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">Level</label>
                <input
                  type="number" min={1} max={100}
                  value={config.playerLevel}
                  onChange={(e) => updateConfig({ playerLevel: parseInt(e.target.value) || 1 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">AC</label>
                <input
                  type="number" min={1} max={30}
                  value={config.playerAC}
                  onChange={(e) => updateConfig({ playerAC: parseInt(e.target.value) || 10 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-realm-text-muted block mb-1">HP (empty = auto)</label>
              <input
                type="number" min={1} max={500}
                value={config.playerHP ?? ''}
                onChange={(e) => updateConfig({ playerHP: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Auto-calculated"
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary placeholder:text-realm-text-muted/50"
              />
            </div>

            {/* Ability Scores */}
            <div>
              <label className="text-xs text-realm-text-muted block mb-1">Ability Scores</label>
              <div className="grid grid-cols-6 gap-1">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => (
                  <div key={stat} className="text-center">
                    <div className="text-[10px] text-realm-text-muted uppercase mb-0.5">{stat}</div>
                    <input
                      type="number" min={1} max={30}
                      value={config.playerStats[stat]}
                      onChange={(e) => updatePlayerStats(stat, parseInt(e.target.value) || 10)}
                      className="w-full bg-realm-bg-800 border border-realm-border rounded px-1 py-1.5 text-xs text-center text-realm-text-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Weapon */}
            <div>
              <label className="text-xs text-realm-text-muted block mb-1">Weapon</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={config.playerWeapon.name}
                  onChange={(e) => updatePlayerWeapon({ name: e.target.value })}
                  placeholder="Weapon name"
                  className="bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
                <div className="flex gap-1">
                  <input
                    type="number" min={1} max={10}
                    value={config.playerWeapon.diceCount}
                    onChange={(e) => updatePlayerWeapon({ diceCount: parseInt(e.target.value) || 1 })}
                    className="w-14 bg-realm-bg-800 border border-realm-border rounded px-2 py-2 text-xs text-center text-realm-text-primary"
                    title="Dice count"
                  />
                  <span className="flex items-center text-realm-text-muted text-xs">d</span>
                  <input
                    type="number" min={1} max={20}
                    value={config.playerWeapon.diceSides}
                    onChange={(e) => updatePlayerWeapon({ diceSides: parseInt(e.target.value) || 6 })}
                    className="w-14 bg-realm-bg-800 border border-realm-border rounded px-2 py-2 text-xs text-center text-realm-text-primary"
                    title="Dice sides"
                  />
                  <span className="flex items-center text-realm-text-muted text-xs">+</span>
                  <input
                    type="number" min={0} max={20}
                    value={config.playerWeapon.bonusDamage}
                    onChange={(e) => updatePlayerWeapon({ bonusDamage: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-realm-bg-800 border border-realm-border rounded px-2 py-2 text-xs text-center text-realm-text-primary"
                    title="Bonus damage"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-realm-text-muted block mb-0.5">Atk Bonus</label>
                  <input
                    type="number" min={0} max={20}
                    value={config.playerWeapon.bonusAttack}
                    onChange={(e) => updatePlayerWeapon({ bonusAttack: parseInt(e.target.value) || 0 })}
                    className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-1.5 text-xs text-realm-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-realm-text-muted block mb-0.5">Dmg Stat</label>
                  <select
                    value={config.playerWeapon.damageModifierStat}
                    onChange={(e) => updatePlayerWeapon({ damageModifierStat: e.target.value as 'str' | 'dex', attackModifierStat: e.target.value as 'str' | 'dex' })}
                    className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-1.5 text-xs text-realm-text-primary"
                  >
                    <option value="str">STR</option>
                    <option value="dex">DEX</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monster Config */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-red-400 text-sm mb-4">Monster Configuration</h3>

          <div className="space-y-4">
            {/* Monster dropdown */}
            {monstersData?.monsters && monstersData.monsters.length > 0 && (
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">Load from Database</label>
                <select
                  value=""
                  onChange={(e) => {
                    const m = monstersData.monsters.find((m) => m.id === e.target.value);
                    if (m) applyMonster(m);
                  }}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                >
                  <option value="">Select a monster...</option>
                  {monstersData.monsters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Lv.{m.level} - {m.biome})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">Name</label>
                <input
                  value={config.monsterName}
                  onChange={(e) => updateConfig({ monsterName: e.target.value })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">Level</label>
                <input
                  type="number" min={1} max={100}
                  value={config.monsterLevel}
                  onChange={(e) => updateConfig({ monsterLevel: parseInt(e.target.value) || 1 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">HP</label>
                <input
                  type="number" min={1} max={1000}
                  value={config.monsterHP}
                  onChange={(e) => updateConfig({ monsterHP: parseInt(e.target.value) || 20 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">AC</label>
                <input
                  type="number" min={1} max={30}
                  value={config.monsterAC}
                  onChange={(e) => updateConfig({ monsterAC: parseInt(e.target.value) || 12 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-realm-text-muted block mb-1">Atk Bonus</label>
                <input
                  type="number" min={0} max={20}
                  value={config.monsterAttackBonus}
                  onChange={(e) => updateConfig({ monsterAttackBonus: parseInt(e.target.value) || 0 })}
                  className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-realm-text-muted block mb-1">Damage (e.g. 2d6+4)</label>
              <input
                value={config.monsterDamage}
                onChange={(e) => updateConfig({ monsterDamage: e.target.value })}
                placeholder="1d6+2"
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
              />
            </div>

            {/* Monster Ability Scores */}
            <div>
              <label className="text-xs text-realm-text-muted block mb-1">Ability Scores</label>
              <div className="grid grid-cols-6 gap-1">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => (
                  <div key={stat} className="text-center">
                    <div className="text-[10px] text-realm-text-muted uppercase mb-0.5">{stat}</div>
                    <input
                      type="number" min={1} max={30}
                      value={config.monsterStats[stat]}
                      onChange={(e) => updateMonsterStats(stat, parseInt(e.target.value) || 10)}
                      className="w-full bg-realm-bg-800 border border-realm-border rounded px-1 py-1.5 text-xs text-center text-realm-text-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Run Controls */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs text-realm-text-muted block mb-1">Iterations</label>
            <input
              type="number" min={1} max={1000}
              value={config.iterations}
              onChange={(e) => updateConfig({ iterations: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-28 bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={runSimulation}
              disabled={simMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50"
            >
              {simMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {simMutation.isPending ? 'Running...' : 'Run Simulation'}
            </button>

            {simResult && (
              <button
                onClick={() => setSimResult(null)}
                className="flex items-center gap-2 px-4 py-2.5 bg-realm-bg-600 text-realm-text-secondary font-display text-sm rounded hover:text-realm-text-primary transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Results
              </button>
            )}
          </div>

          <div className="text-xs text-realm-text-muted mt-4">
            {config.iterations <= 10 ? (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-realm-gold-400" />
                Single mode: full replay logs
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-realm-teal-300" />
                Batch mode: aggregate stats only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {simResult && (
        <div>
          {isBatch ? (
            <BatchStatsDisplay
              results={simResult.results}
              summary={simResult.summary}
              config={{
                playerLevel: simResult.config.playerLevel,
                playerHP: simResult.config.playerHP,
                monsterName: simResult.config.monsterName,
                monsterHP: simResult.config.monsterHP,
                iterations: simResult.config.iterations,
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Summary header for small batch */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-realm-text-primary text-sm">
                    Simulation Results ({simResult.config.iterations} iteration{simResult.config.iterations !== 1 ? 's' : ''})
                  </h3>
                  <span className="text-sm font-display text-realm-gold-400">
                    Win Rate: {simResult.summary.playerWinRate}%
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-realm-text-muted">
                  <span>Wins: <span className="text-green-400">{simResult.summary.playerWins}</span></span>
                  <span>Losses: <span className="text-red-400">{simResult.summary.monsterWins}</span></span>
                  <span>Draws: <span className="text-realm-text-muted">{simResult.summary.draws}</span></span>
                  <span>Avg Rounds: <span className="text-realm-gold-400">{simResult.summary.avgRounds}</span></span>
                </div>
              </div>

              {/* Per-iteration replay */}
              {simResult.results.map((result, idx) => (
                <div key={idx} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-realm-text-primary text-sm">
                      Iteration {idx + 1}
                    </h4>
                    <span className={`text-xs font-display px-2 py-0.5 rounded ${
                      result.winner === 'player' ? 'bg-green-500/20 text-green-400' :
                      result.winner === 'monster' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {result.winner === 'player' ? 'Player Wins' :
                       result.winner === 'monster' ? `${simResult.config.monsterName} Wins` : 'Draw'}
                    </span>
                  </div>

                  {result.logs && result.logs.length > 0 ? (
                    <CombatReplay
                      logs={result.logs as any[]}
                      participants={[
                        { id: 'sim-player', team: 0, character: { id: 'sim-player', name: 'Player', level: config.playerLevel } },
                        { id: 'sim-monster', team: 1, character: { id: 'sim-monster', name: config.monsterName, level: config.monsterLevel } },
                      ]}
                    />
                  ) : (
                    <div className="text-xs text-realm-text-muted">
                      {result.rounds} rounds, Player HP: {result.playerHpRemaining}, Monster HP: {result.monsterHpRemaining}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
