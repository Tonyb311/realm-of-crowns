import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { RealmButton } from '../components/ui/realm-index';
import {
  CharacterSheetHeader,
  CoreStatsBlock,
  SavingThrowsBlock,
  EquipmentPaperDoll,
  AbilitiesPanel,
  ProfessionsBlock,
  CombatRecordBlock,
  BiographyBlock,
} from '../components/character-sheet';

export default function ProfilePage() {
  const { characterId: paramId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();

  const { data: myChar } = useQuery<{ id: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const targetId = paramId || myChar?.id;
  const isOwnProfile = myChar?.id === targetId;

  const { data: sheet, isLoading, error } = useQuery({
    queryKey: ['character-sheet', targetId],
    queryFn: async () => {
      const endpoint = isOwnProfile ? '/characters/me/sheet' : `/characters/${targetId}/sheet`;
      return (await api.get(endpoint)).data;
    },
    enabled: !!targetId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="h-32 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            <div className="h-48 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            <div className="h-32 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-danger mb-4">Character Not Found</h2>
        <p className="text-realm-text-secondary mb-6">This adventurer could not be located.</p>
        <RealmButton variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Go Back
        </RealmButton>
      </div>
    );
  }

  return (
    <div>
      <CharacterSheetHeader sheet={sheet} isOwnProfile={isOwnProfile} />

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <CoreStatsBlock sheet={sheet} isOwnProfile={isOwnProfile} />
              </div>
              <div>
                <SavingThrowsBlock savingThrows={sheet.savingThrows} />
              </div>
            </div>

            <EquipmentPaperDoll
              equipment={sheet.equipment ?? []}
              isOwnProfile={isOwnProfile}
            />

            <AbilitiesPanel
              tier0Abilities={sheet.tier0Abilities ?? []}
              tier0ChoiceLevels={sheet.tier0ChoiceLevels ?? [3, 5, 8]}
              specAbilities={sheet.specAbilities ?? []}
              racial={sheet.racial}
              characterLevel={sheet.level}
              specialization={sheet.specialization}
            />
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-6">
            <CombatRecordBlock
              combatRecord={sheet.combatRecord}
              isOwnProfile={isOwnProfile}
            />

            <ProfessionsBlock professions={sheet.professions ?? []} />

            <BiographyBlock
              bio={sheet.bio}
              isOwnProfile={isOwnProfile}
              characterId={sheet.id}
            />

            {/* Gold display (own profile only) */}
            {isOwnProfile && sheet.gold !== undefined && (
              <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-display text-realm-gold-400">{sheet.gold.toLocaleString()}</div>
                <div className="text-xs text-realm-text-muted uppercase tracking-wider mt-1">Gold</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
