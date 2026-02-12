import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  CircleDollarSign,
  MapPin,
  Crown,
  Volume2,
  VolumeX,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Tooltip from '../ui/Tooltip';
import { RealmProgress } from '../ui/RealmProgress';
import { getMuted, setMuted, getStoredVolume, setVolume } from '../../services/sounds';
import { getConnectionStatus, onConnectionStatusChange } from '../../services/socket';

interface CharacterHUD {
  id: string;
  name: string;
  race: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  gold: number;
  currentTownId: string | null;
  currentTownName?: string;
  status?: string;
}

interface TravelStatusHUD {
  traveling: boolean;
  currentNode: { name: string } | null;
  dayNumber: number;
  estimatedDays: number;
  ticksRemaining: number;
}

export function HudBar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [muted, setMutedState] = useState(getMuted());
  const [, setVol] = useState(getStoredVolume());
  const [socketStatus, setSocketStatus] = useState(getConnectionStatus());

  useEffect(() => {
    return onConnectionStatusChange(setSocketStatus);
  }, []);

  const { data: character } = useQuery<CharacterHUD>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const isTraveling = character?.status === 'traveling';

  const { data: travelStatus } = useQuery<TravelStatusHUD>({
    queryKey: ['travel', 'status'],
    queryFn: async () => (await api.get('/travel/status')).data,
    enabled: isAuthenticated && isTraveling,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // Hidden conditions
  if (!isAuthenticated || !character) return null;
  if (location.pathname.startsWith('/admin')) return null;
  const hiddenPaths = ['/login', '/register', '/create-character'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const xpForNextLevel = character.level * 100;
  const raceInitial = character.race ? character.race.charAt(0).toUpperCase() : '?';
  const hpCurrent = character.hp ?? character.maxHp ?? 100;
  const hpMax = character.maxHp ?? 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-14 lg:h-16 bg-realm-bg-800/95 backdrop-blur-sm border-b border-realm-border">
      <div className="max-w-screen-2xl mx-auto px-3 flex items-center h-full gap-3">
        {/* Left: Avatar + Name + Level */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full bg-realm-bg-600 border border-realm-border flex items-center justify-center">
            <span className="text-realm-gold-400 font-display text-sm">{raceInitial}</span>
          </div>
          {/* Name + Level (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-realm-text-gold font-display text-xs font-semibold truncate max-w-[100px]">
              {character.name}
            </span>
            <Tooltip content={`Level ${character.level}`}>
              <span className="flex items-center gap-0.5 text-[10px] text-realm-gold-400 bg-realm-gold-400/10 border border-realm-gold-400/30 rounded px-1.5 py-0.5 font-display">
                <Crown className="w-2.5 h-2.5" />
                {character.level}
              </span>
            </Tooltip>
          </div>
          {/* Mobile: Level badge only (no name) */}
          <div className="sm:hidden">
            <span className="flex items-center gap-0.5 text-[10px] text-realm-gold-400 bg-realm-gold-400/10 border border-realm-gold-400/30 rounded px-1.5 py-0.5 font-display">
              <Crown className="w-2.5 h-2.5" />
              {character.level}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-realm-border flex-shrink-0" />

        {/* Center: HP bar */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tooltip content={`HP: ${hpCurrent}/${hpMax}`}>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-realm-hp flex-shrink-0" />
              <div className="w-20">
                <RealmProgress value={hpCurrent} max={hpMax} variant="hp" />
              </div>
              <span className="text-[10px] text-realm-text-secondary tabular-nums whitespace-nowrap">
                {hpCurrent}/{hpMax}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Divider (hidden on small) */}
        <div className="w-px h-6 bg-realm-border flex-shrink-0 hidden md:block" />

        {/* XP bar (hidden on small screens) */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <Tooltip content={`XP: ${character.xp}/${xpForNextLevel}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-realm-text-muted">XP</span>
              <div className="w-24">
                <RealmProgress value={character.xp} max={xpForNextLevel} variant="xp" />
              </div>
              <span className="text-[10px] text-realm-text-muted tabular-nums whitespace-nowrap">
                {character.xp}/{xpForNextLevel}
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Gold */}
        <Tooltip content={`${(character.gold ?? 0).toLocaleString()} gold`}>
          <div className="flex items-center gap-1 text-xs flex-shrink-0">
            <CircleDollarSign className="w-3.5 h-3.5 text-realm-gold-400" />
            <span className="text-realm-gold-400 font-display tabular-nums">
              {(character.gold ?? 0).toLocaleString()}
            </span>
          </div>
        </Tooltip>

        {/* Location (when in town, hidden on small) */}
        {!isTraveling && character.currentTownName && (
          <Tooltip content="Current location">
            <Link
              to={character.currentTownId ? '/town' : '/map'}
              className="hidden lg:flex items-center gap-1 text-xs text-realm-text-secondary hover:text-realm-gold-400 transition-colors flex-shrink-0"
            >
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{character.currentTownName}</span>
            </Link>
          </Tooltip>
        )}

        {/* Travel status indicator (when traveling, hidden on small) */}
        {isTraveling && travelStatus?.traveling && (
          <Tooltip content="Click to view journey">
            <Link
              to="/travel"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-realm-gold-400/10 border border-realm-gold-400/30 text-realm-gold-400 hover:bg-realm-gold-400/15 transition-colors flex-shrink-0"
            >
              <Compass className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
              <span className="text-[10px] font-display truncate max-w-[80px]">
                {travelStatus.currentNode?.name || 'Traveling'}
              </span>
              <span className="text-[9px] text-realm-gold-400/70 tabular-nums">
                Day {travelStatus.dayNumber}/{travelStatus.estimatedDays}
              </span>
            </Link>
          </Tooltip>
        )}

        {/* Traveling compact (mobile fallback) */}
        {isTraveling && (
          <Tooltip content="Traveling">
            <Link
              to="/travel"
              className="flex sm:hidden items-center gap-1 text-xs text-realm-gold-400 flex-shrink-0"
            >
              <Compass className="w-3.5 h-3.5 animate-[spin_8s_linear_infinite]" />
            </Link>
          </Tooltip>
        )}

        {/* Socket connection status */}
        {socketStatus !== 'connected' && (
          <Tooltip content={socketStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              socketStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
            }`} />
          </Tooltip>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-realm-border flex-shrink-0" />

        {/* Sound toggle */}
        <button
          onClick={() => {
            const newMuted = !muted;
            setMutedState(newMuted);
            setVol(getStoredVolume());
          }}
          className="text-realm-text-muted hover:text-realm-text-primary transition-colors flex-shrink-0"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
