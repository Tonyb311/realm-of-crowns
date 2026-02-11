import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Shield,
  Heart,
  Swords,
  Brain,
  Eye,
  Sparkles,
  UserPlus,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import { ProfileSkeleton } from '../components/ui/LoadingSkeleton';

interface CharacterProfile {
  id: string;
  name: string;
  race: string;
  level: number;
  experience: number;
  bio?: string;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  professions?: string[];
  guildId?: string;
  guildName?: string;
  guildTag?: string;
  isOnline?: boolean;
}

const STAT_CONFIG = [
  { key: 'strength', label: 'STR', icon: Swords, color: 'text-red-400' },
  { key: 'dexterity', label: 'DEX', icon: Eye, color: 'text-green-400' },
  { key: 'constitution', label: 'CON', icon: Heart, color: 'text-amber-400' },
  { key: 'intelligence', label: 'INT', icon: Brain, color: 'text-blue-400' },
  { key: 'wisdom', label: 'WIS', icon: Sparkles, color: 'text-purple-400' },
  { key: 'charisma', label: 'CHA', icon: User, color: 'text-pink-400' },
] as const;

export default function ProfilePage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: myChar } = useQuery<{ id: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const { data: profile, isLoading, error } = useQuery<CharacterProfile>({
    queryKey: ['profile', characterId],
    queryFn: async () => {
      const res = await api.get(`/characters/${characterId}/profile`);
      return res.data;
    },
    enabled: !!characterId,
  });

  const sendFriendRequest = useMutation({
    mutationFn: () => api.post('/friends/request', { characterId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const isOwnProfile = myChar?.id === characterId;

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h2 className="text-2xl font-display text-blood-light mb-4">Character Not Found</h2>
        <p className="text-parchment-300 mb-6">This adventurer could not be located.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 border border-primary-400 text-primary-400 font-display rounded hover:bg-dark-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-parchment-500 hover:text-parchment-200 text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-display text-primary-400">{profile.name}</h1>
                {profile.isOnline && (
                  <span className="w-3 h-3 bg-green-500 rounded-full" title="Online" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-parchment-300 text-sm capitalize">{profile.race.toLowerCase()}</span>
                <span className="text-parchment-500 text-sm">Level {profile.level}</span>
                {profile.guildTag && (
                  <span className="text-xs bg-dark-50/40 text-primary-400 px-2 py-0.5 rounded">
                    [{profile.guildTag}] {profile.guildName}
                  </span>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2">
                <button
                  onClick={() => sendFriendRequest.mutate()}
                  disabled={sendFriendRequest.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </button>
                <button
                  onClick={() => {
                    (window as any).__chatOpenDM?.(profile.id, profile.name);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="md:col-span-2">
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-4">Attributes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {STAT_CONFIG.map((stat) => {
                  const Icon = stat.icon;
                  const value = profile.stats?.[stat.key] ?? 0;
                  return (
                    <div key={stat.key} className="bg-dark-400/50 border border-dark-50 rounded-lg p-3 text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                      <div className="text-2xl font-display text-parchment-200">{value}</div>
                      <div className="text-xs text-parchment-500 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Professions */}
            {profile.professions && profile.professions.length > 0 && (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 mt-6">
                <h3 className="font-display text-primary-400 text-sm mb-3">Professions</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.professions.map((p) => (
                    <span
                      key={p}
                      className="text-xs bg-dark-50/40 text-parchment-300 px-3 py-1 rounded capitalize"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">About</h3>
              <p className="text-parchment-300 text-sm leading-relaxed">
                {profile.bio || 'This adventurer has not written a biography yet.'}
              </p>
            </div>

            {/* Guild */}
            {profile.guildName && (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
                <h3 className="font-display text-primary-400 text-sm mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Guild
                </h3>
                <button
                  onClick={() => navigate('/guild')}
                  className="text-sm text-parchment-200 hover:text-primary-400 transition-colors"
                >
                  [{profile.guildTag}] {profile.guildName}
                </button>
              </div>
            )}

            {/* Level progress */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">Experience</h3>
              <div className="text-parchment-200 text-sm">
                Level {profile.level}
              </div>
              <div className="mt-2 w-full bg-dark-50 rounded-full h-2">
                <div
                  className="bg-primary-400 h-2 rounded-full transition-all"
                  style={{ width: `${(profile.experience % 1000) / 10}%` }}
                />
              </div>
              <div className="text-xs text-parchment-500 mt-1">
                {profile.experience % 1000} / 1000 XP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
