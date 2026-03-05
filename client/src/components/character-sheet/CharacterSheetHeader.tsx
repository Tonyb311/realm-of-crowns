import { ArrowLeft, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { RealmButton, RealmBadge, RealmProgress } from '../ui/realm-index';

interface Props {
  sheet: any;
  isOwnProfile: boolean;
}

export function CharacterSheetHeader({ sheet, isOwnProfile }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sendFriendRequest = useMutation({
    mutationFn: () => api.post('/friends/request', { characterId: sheet.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const formatRace = (race: string) =>
    (race ?? 'Unknown').toLowerCase().replace(/_/g, '-').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const formatClass = (cls: string) =>
    cls ? cls.charAt(0).toUpperCase() + cls.slice(1) : '';

  return (
    <header className="border-b border-realm-border bg-realm-bg-800/50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-realm-text-muted hover:text-realm-text-primary text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-display text-realm-gold-400">{sheet.name}</h1>
              {sheet.title && (
                <span className="text-sm text-realm-text-muted italic">{sheet.title}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <RealmBadge variant="default">{formatRace(sheet.race)}</RealmBadge>
              {sheet.class && <RealmBadge variant="uncommon">{formatClass(sheet.class)}</RealmBadge>}
              {sheet.specialization && (
                <RealmBadge variant="rare">{formatClass(sheet.specialization)}</RealmBadge>
              )}
              <span className="text-realm-text-muted text-sm">Level {sheet.level}</span>
              {sheet.guild && (
                <span className="text-xs bg-realm-bg-600/40 text-realm-gold-400 px-2 py-0.5 rounded">
                  [{sheet.guild.tag}] {sheet.guild.name}
                </span>
              )}
              {sheet.currentTown && (
                <span className="text-xs text-realm-text-muted">
                  in {sheet.currentTown.name}
                </span>
              )}
            </div>

            {/* XP bar */}
            <div className="mt-3 max-w-xs">
              <RealmProgress variant="xp" value={(sheet.xp ?? 0) % 1000} max={1000} showValue />
              <div className="text-xs text-realm-text-muted mt-0.5">
                {(sheet.xp ?? 0) % 1000} / 1000 XP
              </div>
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
                  (window as any).__chatOpenDM?.(sheet.id, sheet.name);
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
  );
}
