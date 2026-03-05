import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X } from 'lucide-react';
import api from '../../services/api';
import { RealmPanel, RealmButton } from '../ui/realm-index';

interface Props {
  bio: string | null;
  isOwnProfile: boolean;
  characterId: string;
}

export function BiographyBlock({ bio, isOwnProfile, characterId }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? '');
  const queryClient = useQueryClient();

  const saveBio = useMutation({
    mutationFn: async (newBio: string) => {
      await api.patch('/characters/me/bio', { bio: newBio || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-sheet'] });
      setEditing(false);
    },
  });

  if (!isOwnProfile) {
    return (
      <RealmPanel title="Biography">
        <p className="text-sm text-realm-text-secondary leading-relaxed">
          {bio || 'This adventurer has not written a biography yet.'}
        </p>
      </RealmPanel>
    );
  }

  return (
    <RealmPanel title="Biography">
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            className="w-full h-28 bg-realm-bg-800 border border-realm-border/50 rounded-lg px-3 py-2 text-sm text-realm-text-primary placeholder-realm-text-muted/50 resize-none focus:outline-none focus:border-realm-gold-500/50"
            placeholder="Write your character's story..."
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-realm-text-muted">{draft.length}/500</span>
            <div className="flex gap-2">
              <RealmButton
                variant="ghost"
                size="sm"
                onClick={() => { setDraft(bio ?? ''); setEditing(false); }}
              >
                <X className="w-3 h-3" /> Cancel
              </RealmButton>
              <RealmButton
                variant="primary"
                size="sm"
                onClick={() => saveBio.mutate(draft)}
                disabled={saveBio.isPending}
              >
                <Check className="w-3 h-3" /> Save
              </RealmButton>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-realm-text-secondary leading-relaxed">
            {bio || 'This adventurer has not written a biography yet.'}
          </p>
          <button
            onClick={() => { setDraft(bio ?? ''); setEditing(true); }}
            className="mt-2 flex items-center gap-1 text-xs text-realm-text-muted hover:text-realm-gold-400 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
      )}
    </RealmPanel>
  );
}
