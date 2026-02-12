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
import { RealmPanel, RealmButton, RealmBadge, RealmProgress } from '../components/ui/realm-index';

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
  { key: 'strength', label: 'STR', icon: Swords, color: 'text-realm-danger' },
  { key: 'dexterity', label: 'DEX', icon: Eye, color: 'text-realm-success' },
  { key: 'constitution', label: 'CON', icon: Heart, color: 'text-realm-gold-400' },
  { key: 'intelligence', label: 'INT', icon: Brain, color: 'text-realm-teal-300' },
  { key: 'wisdom', label: 'WIS', icon: Sparkles, color: 'text-realm-purple-300' },
  { key: 'charisma', label: 'CHA', icon: User, color: 'text-realm-bronze-400' },
] as const;

export default function ProfilePage() {
  const { characterId: paramId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: myChar } = useQuery<{ id: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  // If no characterId in URL, fall back to own character
  const characterId = paramId || myChar?.id;

  const { data: profile, isLoading, error } = useQuery<CharacterProfile>({
    queryKey: ['profile', characterId],
    queryFn: async () => {
      const res = await api.get(`/characters/${characterId}/profile`);
      return res.data.profile ?? res.data;
    },
    enabled: !!characterId,
  });

  const sendFriendRequest = useMutation({
    mutationFn: () => api.post('/friends/request', { characterId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const isOwnProfile = myChar?.id === characterId;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-48 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          <div className="h-48 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-danger mb-4">Character Not Found</h2>
        <p className="text-realm-text-secondary mb-6">This adventurer could not be located.</p>
        <RealmButton
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          Go Back
        </RealmButton>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-realm-text-muted hover:text-realm-text-primary text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-display text-realm-gold-400">{profile.name}</h1>
                {profile.isOnline && (
                  <span className="w-3 h-3 bg-realm-success rounded-full" title="Online" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-realm-text-secondary text-sm">{(profile.race ?? 'Unknown').toLowerCase().replace(/_/g, '-').replace(/\b\w/g, c => c.toUpperCase())}</span>
                <span className="text-realm-text-muted text-sm">Level {profile.level}</span>
                {profile.guildTag && (
                  <span className="text-xs bg-realm-bg-600/40 text-realm-gold-400 px-2 py-0.5 rounded">
                    [{profile.guildTag}] {profile.guildName}
                  </span>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2">
                <RealmButton
                  variant="primary"
                  size="sm"
                  onClick={() => sendFriendRequest.mutate()}
                  disabled={sendFriendRequest.isPending}
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </RealmButton>
                <RealmButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    (window as any).__chatOpenDM?.(profile.id, profile.name);
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </RealmButton>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="md:col-span-2">
            <RealmPanel title="Attributes">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {STAT_CONFIG.map((stat) => {
                  const Icon = stat.icon;
                  const value = profile.stats?.[stat.key] ?? 0;
                  return (
                    <div key={stat.key} className="bg-realm-bg-800 border border-realm-border/50 rounded-lg p-3 text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                      <div className="text-2xl font-display text-realm-text-primary">{value}</div>
                      <div className="text-xs text-realm-text-muted uppercase tracking-wider">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </RealmPanel>

            {/* Professions */}
            {profile.professions && profile.professions.length > 0 && (
              <div className="mt-6">
                <RealmPanel title="Professions">
                  <div className="flex flex-wrap gap-2">
                    {profile.professions.map((p) => (
                      <span
                        key={p}
                        className="text-xs bg-realm-bg-600/40 text-realm-text-secondary px-3 py-1 rounded capitalize"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </RealmPanel>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bio */}
            <RealmPanel title="About">
              <p className="text-realm-text-secondary text-sm leading-relaxed">
                {profile.bio || 'This adventurer has not written a biography yet.'}
              </p>
            </RealmPanel>

            {/* Guild */}
            {profile.guildName && (
              <RealmPanel title="Guild">
                <button
                  onClick={() => navigate('/guild')}
                  className="text-sm text-realm-text-primary hover:text-realm-gold-400 transition-colors"
                >
                  [{profile.guildTag}] {profile.guildName}
                </button>
              </RealmPanel>
            )}

            {/* Level progress */}
            <RealmPanel title="Experience">
              <div className="text-realm-text-primary text-sm">
                Level {profile.level}
              </div>
              <div className="mt-2">
                <RealmProgress variant="xp" value={(profile.experience ?? 0) % 1000} max={1000} showValue />
              </div>
              <div className="text-xs text-realm-text-muted mt-1">
                {(profile.experience ?? 0) % 1000} / 1000 XP
              </div>
            </RealmPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
