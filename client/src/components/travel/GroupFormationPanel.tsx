import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Loader2,
  ArrowLeft,
  Crown,
  Copy,
  Check,
  LogOut,
  Play,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TOAST_STYLE } from '../../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupMember {
  id: string;
  name: string;
  level: number;
  race: string;
  role: 'leader' | 'member';
}

interface TravelGroup {
  id: string;
  name: string;
  routeId: string;
  leaderId: string;
  members: GroupMember[];
  status: 'forming' | 'traveling';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupFormationPanelProps {
  routeId: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GroupFormationPanel({ routeId, onClose }: GroupFormationPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [copiedGroupId, setCopiedGroupId] = useState(false);

  // Check if the player already has a group
  const { data: existingGroup, isLoading: groupLoading } = useQuery<TravelGroup | null>({
    queryKey: ['travel', 'group'],
    queryFn: async () => {
      try {
        const res = await api.get('/travel/group');
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  // Create group
  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/travel/group', {
        routeId,
        name: groupName || undefined,
      }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', 'group'] });
      toast.success('Travel group created!', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to create group', { style: TOAST_STYLE });
    },
  });

  // Leave group
  const leaveMutation = useMutation({
    mutationFn: () => api.post('/travel/group/leave'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel', 'group'] });
      toast.success('Left the group.', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to leave group', { style: TOAST_STYLE });
    },
  });

  // Start journey (leader only)
  const startMutation = useMutation({
    mutationFn: (groupId: string) => api.post(`/travel/group/${groupId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      toast.success('The group sets out on its journey!', { style: TOAST_STYLE });
      onClose();
      navigate('/travel');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to start group journey', { style: TOAST_STYLE });
    },
  });

  function handleCopyGroupId(groupId: string) {
    navigator.clipboard.writeText(groupId).then(() => {
      setCopiedGroupId(true);
      setTimeout(() => setCopiedGroupId(false), 2000);
    });
  }

  // Loading
  if (groupLoading) {
    return (
      <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
      </div>
    );
  }

  const group = existingGroup;

  // If no group exists yet, show creation form
  if (!group) {
    return (
      <div className="bg-dark-400 border border-dark-50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-dark-50 flex items-center justify-between">
          <h3 className="font-display text-primary-400 text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Form Travel Group
          </h3>
          <button
            onClick={onClose}
            className="text-parchment-500 hover:text-parchment-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group name input */}
          <div>
            <label className="text-[10px] text-parchment-500 uppercase tracking-wider block mb-1.5">
              Group Name (optional)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter a name for your group..."
              maxLength={50}
              className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-sm text-parchment-200 placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
            />
          </div>

          {/* Create button */}
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full py-3 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create Group
              </>
            )}
          </button>

          <p className="text-[10px] text-parchment-500 text-center">
            Share the group ID with others so they can join before departing.
          </p>
        </div>
      </div>
    );
  }

  // Group exists - show management panel
  const isLeader = group.members.some(m => m.role === 'leader');
  const canStart = group.members.length >= 2 && isLeader;

  return (
    <div className="bg-dark-400 border border-dark-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-50 flex items-center justify-between">
        <h3 className="font-display text-primary-400 text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          {group.name || 'Travel Group'}
        </h3>
        <button
          onClick={onClose}
          className="text-parchment-500 hover:text-parchment-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Group ID for sharing */}
        <div className="flex items-center gap-2 p-3 bg-dark-500 rounded-lg">
          <span className="text-[10px] text-parchment-500 uppercase tracking-wider flex-shrink-0">Group ID</span>
          <code className="text-xs text-parchment-300 font-mono flex-1 truncate">{group.id}</code>
          <button
            onClick={() => handleCopyGroupId(group.id)}
            className="text-parchment-500 hover:text-primary-400 transition-colors flex-shrink-0"
            title="Copy group ID"
          >
            {copiedGroupId ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Members list */}
        <div>
          <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-2">
            Members ({group.members.length})
          </p>
          <div className="space-y-1">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 px-3 bg-dark-500/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-parchment-200 text-sm font-semibold">{member.name}</span>
                  <span className="text-parchment-500 text-xs capitalize">{member.race?.toLowerCase()}</span>
                  {member.role === 'leader' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-400/10 text-primary-400 border border-primary-400/30 font-display flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      Leader
                    </span>
                  )}
                </div>
                <span className="text-xs text-parchment-500">Lv. {member.level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Minimum members warning */}
        {group.members.length < 2 && isLeader && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-900/20 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-[10px]">
              Need at least 2 members to start the journey. Share the group ID to invite others.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {isLeader ? (
            <button
              onClick={() => startMutation.mutate(group.id)}
              disabled={!canStart || startMutation.isPending}
              className="flex-1 py-3 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Journey
                </>
              )}
            </button>
          ) : (
            <div className="flex-1 py-3 text-center text-xs text-parchment-500 bg-dark-500 rounded-lg">
              Waiting for the leader to start the journey...
            </div>
          )}

          <button
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            className="py-3 px-4 border border-red-500/40 text-red-400 font-display text-sm rounded hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {leaveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
