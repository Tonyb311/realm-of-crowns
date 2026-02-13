import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Crown,
  LogOut,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Trash2,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Swords,
} from 'lucide-react';
import api from '../../services/api';
import { RealmPanel, RealmButton, RealmInput, RealmModal } from '../ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PartyMember {
  characterId: string;
  characterName: string;
  class: string;
  level: number;
  isLeader: boolean;
}

interface Party {
  id: string;
  name: string | null;
  leaderId: string;
  leaderName: string;
  members: PartyMember[];
  currentTownName: string | null;
  createdAt: string;
}

interface PendingInvitation {
  id: string;
  partyId: string;
  partyName: string | null;
  inviterName: string;
  createdAt: string;
}

interface PartyMeResponse {
  party: Party | null;
  pendingInvitations: PendingInvitation[];
}

// ---------------------------------------------------------------------------
// PartyPanel
// ---------------------------------------------------------------------------
export default function PartyPanel({ characterId }: { characterId: string }) {
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch party state
  const {
    data,
    isLoading,
    error,
  } = useQuery<PartyMeResponse>({
    queryKey: ['party', 'me'],
    queryFn: async () => {
      const res = await api.get('/parties/me');
      return res.data;
    },
  });

  const party = data?.party ?? null;
  const pendingInvitations = data?.pendingInvitations ?? [];
  const isInParty = !!party;
  const isLeader = party?.leaderId === characterId;

  // Count for the badge in the header
  const badgeCount = isInParty ? party.members.length : pendingInvitations.length;

  return (
    <RealmPanel className="overflow-hidden">
      {/* Collapsible header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none -mx-5 -mt-4 px-5 py-3 border-b border-realm-border"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-realm-gold-400" />
          <h3 className="font-display text-realm-text-gold text-lg tracking-wide">Party</h3>
          {badgeCount > 0 && (
            <span className="ml-1 bg-realm-gold-500/20 text-realm-gold-400 text-xs font-display px-1.5 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-realm-text-muted" />
        ) : (
          <ChevronUp className="w-4 h-4 text-realm-text-muted" />
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-3 -mx-5 -mb-4 px-5 pb-4">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : isInParty ? (
            <InPartyView
              party={party}
              characterId={characterId}
              isLeader={isLeader}
            />
          ) : (
            <NoPartyView pendingInvitations={pendingInvitations} />
          )}
        </div>
      )}
    </RealmPanel>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------
function LoadingState() {
  return (
    <div className="space-y-2">
      <div className="h-8 bg-realm-bg-600 rounded animate-pulse" />
      <div className="h-6 bg-realm-bg-600 rounded animate-pulse w-3/4" />
      <div className="h-6 bg-realm-bg-600 rounded animate-pulse w-1/2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------
function ErrorState() {
  return (
    <p className="text-realm-text-muted text-xs text-center py-2">
      Failed to load party data.
    </p>
  );
}

// ---------------------------------------------------------------------------
// No Party View
// ---------------------------------------------------------------------------
function NoPartyView({
  pendingInvitations,
}: {
  pendingInvitations: PendingInvitation[];
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [partyName, setPartyName] = useState('');

  // Create party mutation
  const createParty = useMutation({
    mutationFn: async (name?: string) => {
      const body = name?.trim() ? { name: name.trim() } : {};
      const res = await api.post('/parties/create', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
      setShowCreate(false);
      setPartyName('');
    },
  });

  // Accept invitation mutation
  const acceptInvite = useMutation({
    mutationFn: async (partyId: string) => {
      const res = await api.post(`/parties/${partyId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
    },
  });

  // Decline invitation mutation
  const declineInvite = useMutation({
    mutationFn: async (partyId: string) => {
      const res = await api.post(`/parties/${partyId}/decline`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
    },
  });

  return (
    <div className="space-y-3">
      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-realm-text-muted font-display uppercase tracking-wider">
            Pending Invitations
          </p>
          {pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-realm-bg-800 rounded p-3 border border-realm-gold-500/20"
            >
              <p className="text-sm text-realm-text-primary">
                <span className="text-realm-gold-400 font-semibold">{inv.inviterName}</span>
                {' invited you to '}
                <span className="text-realm-text-primary font-semibold">
                  {inv.partyName || 'a party'}
                </span>
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => acceptInvite.mutate(inv.partyId)}
                  disabled={acceptInvite.isPending}
                  className="flex items-center gap-1 px-3 py-1 bg-realm-success/20 text-realm-success text-xs font-display rounded hover:bg-realm-success/30 transition-colors disabled:opacity-50"
                >
                  {acceptInvite.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Accept
                </button>
                <button
                  onClick={() => declineInvite.mutate(inv.partyId)}
                  disabled={declineInvite.isPending}
                  className="flex items-center gap-1 px-3 py-1 bg-realm-danger/20 text-realm-danger text-xs font-display rounded hover:bg-realm-danger/30 transition-colors disabled:opacity-50"
                >
                  {declineInvite.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create party */}
      {!showCreate ? (
        <RealmButton
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => setShowCreate(true)}
        >
          <Users className="w-3.5 h-3.5 mr-1.5 inline" />
          Create Party
        </RealmButton>
      ) : (
        <div className="bg-realm-bg-800 rounded p-3 border border-realm-border space-y-2">
          <RealmInput
            placeholder="Party name (optional)"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            className="text-xs"
            maxLength={40}
          />
          <div className="flex gap-2">
            <RealmButton
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => createParty.mutate(partyName || undefined)}
              disabled={createParty.isPending}
            >
              {createParty.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
              ) : null}
              Create
            </RealmButton>
            <RealmButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                setPartyName('');
              }}
            >
              Cancel
            </RealmButton>
          </div>
          {createParty.isError && (
            <p className="text-realm-danger text-xs">
              {(createParty.error as any)?.response?.data?.error || 'Failed to create party.'}
            </p>
          )}
        </div>
      )}

      {/* Empty state message */}
      {pendingInvitations.length === 0 && !showCreate && (
        <p className="text-realm-text-muted text-xs text-center py-1">
          You are not in a party. Create one or wait for an invitation.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// In Party View
// ---------------------------------------------------------------------------
function InPartyView({
  party,
  characterId,
  isLeader,
}: {
  party: Party;
  characterId: string;
  isLeader: boolean;
}) {
  const queryClient = useQueryClient();
  const [inviteName, setInviteName] = useState('');
  const [showDisband, setShowDisband] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);

  // Leave party mutation
  const leaveParty = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/parties/${party.id}/leave`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
    },
  });

  // Kick member mutation
  const kickMember = useMutation({
    mutationFn: async (targetCharacterId: string) => {
      const res = await api.post(`/parties/${party.id}/kick`, {
        characterId: targetCharacterId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
    },
  });

  // Invite player mutation
  const invitePlayer = useMutation({
    mutationFn: async (characterName: string) => {
      const res = await api.post(`/parties/${party.id}/invite`, {
        characterName: characterName.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
      setInviteName('');
    },
  });

  // Disband party mutation
  const disbandParty = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/parties/${party.id}/disband`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
      setShowDisband(false);
    },
  });

  // Transfer leadership mutation
  const transferLeadership = useMutation({
    mutationFn: async (targetCharacterId: string) => {
      const res = await api.post(`/parties/${party.id}/transfer`, {
        characterId: targetCharacterId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party', 'me'] });
      setConfirmTransfer(null);
    },
  });

  // Sort members: leader first, then alphabetically
  const sortedMembers = [...party.members].sort((a, b) => {
    if (a.isLeader && !b.isLeader) return -1;
    if (!a.isLeader && b.isLeader) return 1;
    return a.characterName.localeCompare(b.characterName);
  });

  return (
    <div className="space-y-3">
      {/* Party header */}
      {party.name && (
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-realm-gold-400 flex-shrink-0" />
          <span className="font-display text-realm-gold-400 text-sm truncate">
            {party.name}
          </span>
        </div>
      )}

      {/* Location */}
      {party.currentTownName && (
        <div className="flex items-center gap-1.5 text-xs text-realm-text-muted">
          <MapPin className="w-3 h-3" />
          <span>{party.currentTownName}</span>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-1">
        <p className="text-xs text-realm-text-muted font-display uppercase tracking-wider">
          Members ({party.members.length})
        </p>
        <div className="bg-realm-bg-800 rounded border border-realm-border divide-y divide-realm-border/50">
          {sortedMembers.map((member) => {
            const isSelf = member.characterId === characterId;
            return (
              <div
                key={member.characterId}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {member.isLeader && (
                    <Crown className="w-3.5 h-3.5 text-realm-gold-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-sm block truncate ${isSelf ? 'text-realm-gold-300 font-semibold' : 'text-realm-text-primary'}`}>
                      {member.characterName}
                      {isSelf && (
                        <span className="text-realm-text-muted text-xs ml-1">(you)</span>
                      )}
                    </span>
                    <span className="text-xs text-realm-text-muted block">
                      {formatClass(member.class)} -- Lv. {member.level}
                    </span>
                  </div>
                </div>

                {/* Leader actions on other members */}
                {isLeader && !isSelf && (
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => setConfirmTransfer(member.characterId)}
                      title="Transfer leadership"
                      className="p-1 text-realm-text-muted hover:text-realm-gold-400 transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => kickMember.mutate(member.characterId)}
                      disabled={kickMember.isPending}
                      title="Kick from party"
                      className="p-1 text-realm-text-muted hover:text-realm-danger transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite player (leader only) */}
      {isLeader && (
        <div className="space-y-1.5">
          <p className="text-xs text-realm-text-muted font-display uppercase tracking-wider">
            Invite Player
          </p>
          <div className="flex gap-2">
            <RealmInput
              placeholder="Character name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteName.trim()) {
                  invitePlayer.mutate(inviteName);
                }
              }}
            />
            <RealmButton
              variant="primary"
              size="sm"
              onClick={() => invitePlayer.mutate(inviteName)}
              disabled={!inviteName.trim() || invitePlayer.isPending}
            >
              {invitePlayer.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
            </RealmButton>
          </div>
          {invitePlayer.isError && (
            <p className="text-realm-danger text-xs">
              {(invitePlayer.error as any)?.response?.data?.error || 'Failed to send invitation.'}
            </p>
          )}
          {invitePlayer.isSuccess && (
            <p className="text-realm-success text-xs">Invitation sent!</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {!isLeader && (
          <RealmButton
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => leaveParty.mutate()}
            disabled={leaveParty.isPending}
          >
            {leaveParty.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
            ) : (
              <LogOut className="w-3.5 h-3.5 mr-1 inline" />
            )}
            Leave
          </RealmButton>
        )}

        {isLeader && (
          <RealmButton
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={() => setShowDisband(true)}
            disabled={disbandParty.isPending}
          >
            {disbandParty.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1 inline" />
            )}
            Disband
          </RealmButton>
        )}
      </div>

      {/* Leave error */}
      {leaveParty.isError && (
        <p className="text-realm-danger text-xs">
          {(leaveParty.error as any)?.response?.data?.error || 'Failed to leave party.'}
        </p>
      )}

      {/* Disband confirmation modal */}
      <RealmModal
        isOpen={showDisband}
        onClose={() => setShowDisband(false)}
        title="Disband Party"
      >
        <p className="text-realm-text-secondary text-sm mb-4">
          Are you sure you want to disband{' '}
          <span className="text-realm-gold-400 font-semibold">
            {party.name || 'the party'}
          </span>
          ? All members will be removed.
        </p>
        <div className="flex gap-3 justify-end">
          <RealmButton variant="ghost" size="sm" onClick={() => setShowDisband(false)}>
            Cancel
          </RealmButton>
          <RealmButton
            variant="danger"
            size="sm"
            onClick={() => disbandParty.mutate()}
            disabled={disbandParty.isPending}
          >
            {disbandParty.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
            ) : null}
            Disband
          </RealmButton>
        </div>
        {disbandParty.isError && (
          <p className="text-realm-danger text-xs mt-2">
            {(disbandParty.error as any)?.response?.data?.error || 'Failed to disband party.'}
          </p>
        )}
      </RealmModal>

      {/* Transfer leadership confirmation modal */}
      <RealmModal
        isOpen={!!confirmTransfer}
        onClose={() => setConfirmTransfer(null)}
        title="Transfer Leadership"
      >
        {(() => {
          const targetMember = party.members.find(
            (m) => m.characterId === confirmTransfer
          );
          return (
            <>
              <p className="text-realm-text-secondary text-sm mb-4">
                Transfer party leadership to{' '}
                <span className="text-realm-gold-400 font-semibold">
                  {targetMember?.characterName ?? 'this player'}
                </span>
                ? You will become a regular member.
              </p>
              <div className="flex gap-3 justify-end">
                <RealmButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmTransfer(null)}
                >
                  Cancel
                </RealmButton>
                <RealmButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (confirmTransfer) {
                      transferLeadership.mutate(confirmTransfer);
                    }
                  }}
                  disabled={transferLeadership.isPending}
                >
                  {transferLeadership.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5 mr-1 inline" />
                  )}
                  Transfer
                </RealmButton>
              </div>
              {transferLeadership.isError && (
                <p className="text-realm-danger text-xs mt-2">
                  {(transferLeadership.error as any)?.response?.data?.error ||
                    'Failed to transfer leadership.'}
                </p>
              )}
            </>
          );
        })()}
      </RealmModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format class name for display (e.g. "WARRIOR" -> "Warrior") */
function formatClass(cls: string): string {
  if (!cls) return 'Adventurer';
  return cls
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
