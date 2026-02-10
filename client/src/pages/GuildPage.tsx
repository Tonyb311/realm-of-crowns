import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Users,
  Coins,
  Settings,
  Crown,
  Star,
  UserPlus,
  LogOut,
  Search,
  Loader2,
  X,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard, SkeletonRow } from '../components/ui/LoadingSkeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  leaderId: string;
  leaderName: string;
  treasury: number;
  createdAt: string;
}

interface GuildMember {
  characterId: string;
  characterName: string;
  rank: 'leader' | 'officer' | 'member';
  level: number;
  race: string;
  online: boolean;
  joinedAt: string;
}

interface GuildListItem {
  id: string;
  name: string;
  tag: string;
  description: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
}

interface MyCharacter {
  id: string;
  guildId: string | null;
  gold: number;
}

// ---------------------------------------------------------------------------
// GuildPage
// ---------------------------------------------------------------------------
export default function GuildPage() {
  const queryClient = useQueryClient();

  const { data: character, isLoading: charLoading } = useQuery<MyCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  if (charLoading) {
    return (
      <div className="min-h-screen bg-dark-500 pt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-4">
          <div className="h-10 bg-dark-400 rounded animate-pulse w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (character?.guildId) {
    return <GuildDashboard guildId={character.guildId} characterId={character.id} />;
  }

  return <GuildBrowser characterId={character?.id ?? ''} />;
}

// ---------------------------------------------------------------------------
// Guild Browser (no guild)
// ---------------------------------------------------------------------------
function GuildBrowser({ characterId }: { characterId: string }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '' });

  const { data: guilds = [], isLoading } = useQuery<GuildListItem[]>({
    queryKey: ['guilds'],
    queryFn: async () => {
      const res = await api.get('/guilds');
      return res.data;
    },
  });

  const createGuild = useMutation({
    mutationFn: (data: { name: string; tag: string; description: string }) =>
      api.post('/guilds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      setShowCreate(false);
    },
  });

  const joinGuild = useMutation({
    mutationFn: (guildId: string) => api.post(`/guilds/${guildId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
    },
  });

  const filtered = guilds.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-primary-400 flex items-center gap-3">
                <Shield className="w-8 h-8" />
                Guilds
              </h1>
              <p className="text-parchment-400 text-sm mt-1">Join a guild or found your own.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Guild
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guilds..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-300 border border-dark-50 rounded-lg text-sm text-parchment-200 placeholder-parchment-500 focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* Guild list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-parchment-500">
            No guilds found. Be the first to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((guild) => (
              <div
                key={guild.id}
                className="bg-dark-300 border border-dark-50 rounded-lg p-5 hover:border-primary-400/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-primary-400 text-lg">
                      [{guild.tag}] {guild.name}
                    </h3>
                    <p className="text-xs text-parchment-500 mt-0.5">
                      Led by {guild.leaderName} -- Level {guild.level}
                    </p>
                  </div>
                  <button
                    onClick={() => joinGuild.mutate(guild.id)}
                    disabled={joinGuild.isPending}
                    className="px-3 py-1.5 bg-primary-400/20 text-primary-400 text-xs font-display rounded hover:bg-primary-400/30 transition-colors"
                  >
                    Join
                  </button>
                </div>
                <p className="text-sm text-parchment-300 mt-3 line-clamp-2">{guild.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-parchment-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {guild.memberCount}/{guild.maxMembers}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create guild modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-dark-400 border border-dark-50 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-primary-400 text-lg">Create Guild</h2>
              <button onClick={() => setShowCreate(false)} className="text-parchment-500 hover:text-parchment-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-parchment-400 mb-1">Guild Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-300 border border-dark-50 rounded text-sm text-parchment-200 focus:outline-none focus:border-primary-400"
                  maxLength={32}
                />
              </div>
              <div>
                <label className="block text-xs text-parchment-400 mb-1">Tag (2-5 characters)</label>
                <input
                  type="text"
                  value={createForm.tag}
                  onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-dark-300 border border-dark-50 rounded text-sm text-parchment-200 focus:outline-none focus:border-primary-400"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-xs text-parchment-400 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-300 border border-dark-50 rounded text-sm text-parchment-200 focus:outline-none focus:border-primary-400 resize-none"
                  maxLength={200}
                />
              </div>

              <div className="bg-dark-300/50 border border-primary-400/30 rounded p-3">
                <p className="text-xs text-primary-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Creating a guild costs 500 gold
                </p>
              </div>

              <button
                onClick={() => createGuild.mutate(createForm)}
                disabled={!createForm.name || !createForm.tag || createForm.tag.length < 2 || createGuild.isPending}
                className="w-full py-2.5 bg-primary-400 text-dark-500 font-display rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createGuild.isPending ? 'Creating...' : 'Found Guild (500g)'}
              </button>
              {createGuild.isError && (
                <p className="text-xs text-blood-light text-center">
                  {(createGuild.error as any)?.response?.data?.error || 'Failed to create guild.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guild Dashboard (in a guild)
// ---------------------------------------------------------------------------
function GuildDashboard({ guildId, characterId }: { guildId: string; characterId: string }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'members' | 'treasury' | 'settings'>('members');
  const [inviteInput, setInviteInput] = useState('');
  const [donateAmount, setDonateAmount] = useState('');

  const { data: guild, isLoading } = useQuery<Guild>({
    queryKey: ['guild', guildId],
    queryFn: async () => (await api.get(`/guilds/${guildId}`)).data,
  });

  const { data: members = [] } = useQuery<GuildMember[]>({
    queryKey: ['guild', guildId, 'members'],
    queryFn: async () => {
      const res = await api.get(`/guilds/${guildId}`);
      return res.data.members ?? [];
    },
  });

  const isLeader = guild?.leaderId === characterId;
  const myMember = members.find((m) => m.characterId === characterId);
  const isOfficer = myMember?.rank === 'officer' || isLeader;

  const invite = useMutation({
    mutationFn: (name: string) => api.post(`/guilds/${guildId}/invite`, { characterName: name }),
    onSuccess: () => { setInviteInput(''); },
  });

  const kick = useMutation({
    mutationFn: (memberId: string) => api.post(`/guilds/${guildId}/kick`, { characterId: memberId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId] }),
  });

  const promote = useMutation({
    mutationFn: (memberId: string) => api.post(`/guilds/${guildId}/promote`, { characterId: memberId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guild', guildId] }),
  });

  const donate = useMutation({
    mutationFn: (amount: number) => api.post(`/guilds/${guildId}/donate`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setDonateAmount('');
    },
  });

  const leaveGuild = useMutation({
    mutationFn: () => api.post(`/guilds/${guildId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
    },
  });

  const disbandGuild = useMutation({
    mutationFn: () => api.delete(`/guilds/${guildId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
    },
  });

  if (isLoading || !guild) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const rankIcon = (rank: string) => {
    if (rank === 'leader') return <Crown className="w-3.5 h-3.5 text-primary-400" />;
    if (rank === 'officer') return <Star className="w-3.5 h-3.5 text-primary-300" />;
    return null;
  };

  const sections = [
    { key: 'members' as const, label: 'Members', icon: Users },
    { key: 'treasury' as const, label: 'Treasury', icon: Coins },
    ...(isLeader ? [{ key: 'settings' as const, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-primary-400 flex items-center gap-3">
                <Shield className="w-8 h-8" />
                [{guild.tag}] {guild.name}
              </h1>
              <p className="text-parchment-400 text-sm mt-1">
                Level {guild.level} -- {members.length}/{guild.maxMembers} members
              </p>
              {guild.description && (
                <p className="text-parchment-300 text-sm mt-2 max-w-xl">{guild.description}</p>
              )}
            </div>
            {!isLeader && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to leave this guild?')) {
                    leaveGuild.mutate();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-blood-light/60 text-blood-light font-display text-sm rounded hover:bg-blood-dark/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Guild
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {/* Section tabs */}
        <div className="flex gap-1 mb-6 border-b border-dark-50">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-display transition-colors border-b-2 -mb-px ${
                  activeSection === s.key
                    ? 'text-primary-400 border-primary-400'
                    : 'text-parchment-500 border-transparent hover:text-parchment-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Members */}
        {activeSection === 'members' && (
          <div className="space-y-4">
            {/* Invite */}
            {isOfficer && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="Invite player by name..."
                  className="flex-1 px-3 py-2 bg-dark-300 border border-dark-50 rounded text-sm text-parchment-200 placeholder-parchment-500 focus:outline-none focus:border-primary-400"
                />
                <button
                  onClick={() => invite.mutate(inviteInput)}
                  disabled={!inviteInput.trim() || invite.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              </div>
            )}

            {/* Member list */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg divide-y divide-dark-50">
              {members.map((m) => (
                <div key={m.characterId} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        m.online ? 'bg-green-500' : 'bg-parchment-500'
                      }`}
                    />
                    <div className="flex items-center gap-1.5">
                      {rankIcon(m.rank)}
                      <span className="text-sm text-parchment-200 font-semibold">{m.characterName}</span>
                      <span className="text-xs text-parchment-500 capitalize">{m.race.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-parchment-500">Lv. {m.level}</span>
                    {isOfficer && m.characterId !== characterId && m.rank !== 'leader' && (
                      <div className="flex gap-1">
                        {isLeader && m.rank === 'member' && (
                          <button
                            onClick={() => promote.mutate(m.characterId)}
                            className="p-1 text-parchment-500 hover:text-primary-400 transition-colors"
                            title="Promote to officer"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Kick ${m.characterName} from the guild?`)) {
                              kick.mutate(m.characterId);
                            }
                          }}
                          className="p-1 text-parchment-500 hover:text-blood-light transition-colors"
                          title="Kick"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treasury */}
        {activeSection === 'treasury' && (
          <div className="space-y-6">
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 text-center">
              <Coins className="w-10 h-10 text-primary-400 mx-auto mb-3" />
              <div className="text-3xl font-display text-primary-400">{guild.treasury.toLocaleString()}</div>
              <div className="text-sm text-parchment-500 mt-1">Guild Treasury (Gold)</div>
            </div>

            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">Donate Gold</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="Amount..."
                  min={1}
                  className="flex-1 px-3 py-2 bg-dark-400 border border-dark-50 rounded text-sm text-parchment-200 placeholder-parchment-500 focus:outline-none focus:border-primary-400"
                />
                <button
                  onClick={() => {
                    const amt = parseInt(donateAmount);
                    if (amt > 0) donate.mutate(amt);
                  }}
                  disabled={!donateAmount || parseInt(donateAmount) <= 0 || donate.isPending}
                  className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50"
                >
                  Donate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings (leader only) */}
        {activeSection === 'settings' && isLeader && (
          <div className="space-y-6">
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">Guild Settings</h3>
              <p className="text-sm text-parchment-400">
                Guild management settings will be available in a future update.
              </p>
            </div>

            <div className="bg-dark-300 border border-blood-dark/40 rounded-lg p-5">
              <h3 className="font-display text-blood-light text-sm mb-3 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Danger Zone
              </h3>
              <p className="text-sm text-parchment-400 mb-4">
                Disbanding the guild is permanent and cannot be undone. All members will be removed.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you SURE you want to disband this guild? This cannot be undone.')) {
                    disbandGuild.mutate();
                  }
                }}
                disabled={disbandGuild.isPending}
                className="px-5 py-2 bg-blood-dark text-blood-light font-display text-sm rounded border border-blood-light/30 hover:bg-blood-DEFAULT transition-colors disabled:opacity-50"
              >
                {disbandGuild.isPending ? 'Disbanding...' : 'Disband Guild'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
