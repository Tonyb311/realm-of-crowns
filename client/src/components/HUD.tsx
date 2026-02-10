import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Heart,
  Droplets,
  CircleDollarSign,
  MapPin,
  Crown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Tooltip from './ui/Tooltip';
import { getMuted, setMuted, getStoredVolume, setVolume } from '../services/sounds';
import { getConnectionStatus, onConnectionStatusChange } from '../services/socket';

interface CharacterHUD {
  id: string;
  name: string;
  race: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  currentTownId: string | null;
  currentTownName?: string;
}

function StatBar({
  current,
  max,
  gradient,
  label,
  icon: Icon,
}: {
  current: number;
  max: number;
  gradient: string;
  label: string;
  icon: typeof Heart;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  return (
    <Tooltip content={`${label}: ${current}/${max}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <div className="w-20 h-2.5 bg-dark-600 rounded-full overflow-hidden border border-dark-50/50">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-parchment-400 w-12 tabular-nums">
          {current}/{max}
        </span>
      </div>
    </Tooltip>
  );
}

export default function HUD() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [muted, setMutedState] = useState(getMuted());
  const [vol, setVol] = useState(getStoredVolume());
  // MAJ-15: Socket connection status indicator
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

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  useEffect(() => {
    setVolume(vol);
  }, [vol]);

  if (!isAuthenticated || !character) return null;
  if (location.pathname.startsWith('/admin')) return null;

  const xpForNextLevel = character.level * 100;
  const xpPct = xpForNextLevel > 0
    ? Math.min(100, (character.xp / xpForNextLevel) * 100)
    : 0;

  const raceInitial = character.race ? character.race.charAt(0).toUpperCase() : '?';

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-dark-600/95 border-b border-dark-50 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-3 flex items-center h-12 gap-3">
        {/* Portrait + Name */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-400/20 border border-primary-400/40 flex items-center justify-center">
            <span className="text-primary-400 font-display text-sm">{raceInitial}</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-parchment-200 text-xs font-semibold truncate max-w-[100px]">
                {character.name}
              </span>
              <Tooltip content={`Level ${character.level}`}>
                <span className="flex items-center gap-0.5 text-[10px] text-primary-400 bg-primary-400/10 border border-primary-400/30 rounded px-1.5 py-0.5 font-display">
                  <Crown className="w-2.5 h-2.5" />
                  {character.level}
                </span>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-dark-50 flex-shrink-0" />

        {/* HP/MP Bars */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatBar
            current={character.hp ?? character.maxHp ?? 100}
            max={character.maxHp ?? 100}
            gradient="from-red-700 to-red-500"
            label="HP"
            icon={Heart}
          />
          <StatBar
            current={character.mp ?? character.maxMp ?? 50}
            max={character.maxMp ?? 50}
            gradient="from-blue-700 to-blue-500"
            label="MP"
            icon={Droplets}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-dark-50 flex-shrink-0 hidden md:block" />

        {/* XP Bar (hidden on small) */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-parchment-500">XP</span>
          <div className="w-24 h-2 bg-dark-500 rounded-full overflow-hidden border border-dark-50/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400/80 to-primary-300 transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <span className="text-[10px] text-parchment-500 tabular-nums">
            {character.xp}/{xpForNextLevel}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Gold */}
        <Tooltip content={`${(character.gold ?? 0).toLocaleString()} gold`}>
          <div className="flex items-center gap-1 text-xs flex-shrink-0">
            <CircleDollarSign className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-primary-400 font-display tabular-nums">
              {(character.gold ?? 0).toLocaleString()}
            </span>
          </div>
        </Tooltip>

        {/* Location */}
        {character.currentTownName && (
          <Tooltip content="Current location">
            <Link
              to="/map"
              className="hidden lg:flex items-center gap-1 text-xs text-parchment-400 hover:text-primary-400 transition-colors flex-shrink-0"
            >
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{character.currentTownName}</span>
            </Link>
          </Tooltip>
        )}

        {/* MAJ-15: Connection status indicator */}
        {socketStatus !== 'connected' && (
          <Tooltip content={socketStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              socketStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
            }`} />
          </Tooltip>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-dark-50 flex-shrink-0" />

        {/* Sound toggle */}
        <button
          onClick={() => setMutedState(!muted)}
          className="text-parchment-500 hover:text-parchment-200 transition-colors flex-shrink-0"
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
