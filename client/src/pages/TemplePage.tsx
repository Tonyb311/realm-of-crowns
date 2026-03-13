import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Church, Shield, Scale, Flame, Eye, HeartHandshake, BrickWall, Gavel,
  Smile, Handshake, Crown, EyeOff, BookOpen, Users, Star, AlertTriangle, X,
} from 'lucide-react';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, PageHeader } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface God {
  id: string;
  name: string;
  title: string;
  domain: string;
  philosophy: string;
  churchName: string;
  churchDescription: string;
  racialLean: string;
  iconName: string | null;
  colorHex: string | null;
  sortOrder: number;
}

interface ChapterInfo {
  id: string;
  godId: string;
  godName: string;
  godTitle: string;
  godDomain: string;
  godPhilosophy: string;
  godIconName: string | null;
  godColorHex: string | null;
  churchName: string;
  memberCount: number;
  percentage: number;
  tier: string;
  isDominant: boolean;
  isShrine: boolean;
  highPriestName: string | null;
}

interface TownTempleResponse {
  townId: string;
  totalResidents: number;
  patronGodId: string | null;
  chapters: ChapterInfo[];
  dominant: ChapterInfo | null;
}

interface MyFaithResponse {
  patronGod: God | null;
  homeChapter: {
    memberCount: number;
    tier: string;
    isDominant: boolean;
    percentage: number;
  } | null;
  cooldownDaysRemaining: number;
  titheRate: number;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, typeof Shield> = {
  shield: Shield,
  scale: Scale,
  flame: Flame,
  eye: Eye,
  'heart-handshake': HeartHandshake,
  'brick-wall': BrickWall,
  gavel: Gavel,
  smile: Smile,
  handshake: Handshake,
  crown: Crown,
  'eye-off': EyeOff,
  'book-open': BookOpen,
};

function GodIcon({ iconName, colorHex, size = 'w-5 h-5' }: { iconName?: string | null; colorHex?: string | null; size?: string }) {
  const IconComponent = ICON_MAP[iconName ?? ''] ?? Star;
  return <IconComponent className={size} style={{ color: colorHex ?? '#C4A35A' }} />;
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------
const TIER_STYLES: Record<string, string> = {
  MINORITY: 'text-realm-text-muted border-realm-text-muted/30 bg-realm-text-muted/10',
  CHAPTER: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  ESTABLISHED: 'text-realm-purple-300 border-realm-purple-300/30 bg-realm-purple-300/10',
  DOMINANT: 'text-realm-gold-400 border-realm-gold-500/30 bg-realm-gold-500/10',
};

function ChurchTierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.MINORITY;
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${style}`}>
      {tier}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TemplePage() {
  const queryClient = useQueryClient();
  const [showGodModal, setShowGodModal] = useState(false);
  const [confirmGod, setConfirmGod] = useState<God | null>(null);
  const [confirmAtheism, setConfirmAtheism] = useState(false);

  // Fetch character for current town
  const { data: character } = useQuery<{
    id: string;
    name: string;
    currentTownId: string | null;
    homeTownId: string | null;
    patronGodId: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch my faith
  const { data: myFaith } = useQuery<MyFaithResponse>({
    queryKey: ['temple', 'my-faith'],
    queryFn: async () => (await api.get('/temple/my-faith')).data,
  });

  // Fetch temple status for current town
  const { data: templeData } = useQuery<TownTempleResponse>({
    queryKey: ['temple', 'town', townId],
    queryFn: async () => (await api.get(`/temple/town/${townId}`)).data,
    enabled: !!townId,
  });

  // Fetch all gods (for selection modal)
  const { data: godsData } = useQuery<{ gods: God[] }>({
    queryKey: ['temple', 'gods'],
    queryFn: async () => (await api.get('/temple/gods')).data,
    enabled: showGodModal,
  });

  // Choose patron mutation
  const chooseMutation = useMutation({
    mutationFn: async (godId: string | null) => {
      const res = await api.post('/temple/choose-patron', { godId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      setShowGodModal(false);
      setConfirmGod(null);
      setConfirmAtheism(false);
    },
  });

  const townName = town?.name ?? 'this town';
  const chapters = templeData?.chapters ?? [];
  const dominant = templeData?.dominant;
  const patronGod = myFaith?.patronGod;
  const cooldown = myFaith?.cooldownDaysRemaining ?? 0;
  const allGods = godsData?.gods ?? [];

  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Temple" icon={<Church className="w-8 h-8 text-realm-gold-400" />} />
        <RealmPanel title="Temple">
          <p className="text-xs text-realm-text-muted">You must be in a town to visit the temple.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Temple — ${townName}`} icon={<Church className="w-8 h-8 text-realm-gold-400" />} />

      {/* Dominant buff banner */}
      {dominant && (
        <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <GodIcon iconName={dominant.godIconName} colorHex={dominant.godColorHex} />
            <span className="text-sm font-display text-realm-gold-400">
              This town is blessed by {dominant.godName}
            </span>
          </div>
          <p className="text-xs text-realm-text-secondary">
            The {dominant.churchName} holds dominance here — {dominant.godDomain.toLowerCase()}.
          </p>
        </div>
      )}

      {/* Your Faith section */}
      <RealmPanel title="Your Faith">
        {patronGod ? (
          <div className="space-y-3">
            <div
              className="rounded-lg p-4 border"
              style={{
                borderColor: `${patronGod.colorHex}40`,
                backgroundColor: `${patronGod.colorHex}08`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <GodIcon iconName={patronGod.iconName} colorHex={patronGod.colorHex} size="w-6 h-6" />
                <div>
                  <span className="text-sm font-display text-realm-text-primary">{patronGod.name}</span>
                  <span className="text-xs text-realm-text-muted ml-2">{patronGod.title}</span>
                </div>
              </div>
              <p className="text-xs text-realm-text-secondary mb-1">{patronGod.churchName}</p>
              <p className="text-[11px] text-realm-text-muted mb-1">{patronGod.domain}</p>
              <p className="text-[11px] text-realm-text-muted italic">{patronGod.churchDescription}</p>

              {myFaith?.homeChapter && (
                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <Users className="w-3 h-3 text-realm-text-muted" />
                  <span className="text-realm-text-secondary">
                    {myFaith.homeChapter.memberCount} followers in your home town ({myFaith.homeChapter.percentage}%)
                  </span>
                  <ChurchTierBadge tier={myFaith.homeChapter.tier} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <RealmButton
                variant="secondary"
                size="sm"
                onClick={() => setShowGodModal(true)}
                disabled={cooldown > 0}
              >
                Change Faith
              </RealmButton>
              {cooldown > 0 && (
                <span className="text-[11px] text-realm-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {cooldown} day{cooldown > 1 ? 's' : ''} until you can switch
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Church className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted mb-1">You have not chosen a patron god.</p>
            <p className="text-xs text-realm-text-muted mb-4">
              Visit the temple to pledge your faith to one of the Twelve.
            </p>
            <RealmButton variant="primary" onClick={() => setShowGodModal(true)}>
              Choose Your Path
            </RealmButton>
          </div>
        )}
      </RealmPanel>

      {/* Church Standings */}
      <RealmPanel title="Church Standings">
        {chapters.length === 0 ? (
          <div className="text-center py-6">
            <Church className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-realm-text-muted">No churches have been established in {townName} yet.</p>
            <p className="text-xs text-realm-text-muted mt-1">Be the first to bring faith to this town.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`rounded-lg p-4 border transition-colors ${
                  ch.isDominant
                    ? 'border-realm-gold-500/40 bg-realm-gold-500/5'
                    : 'border-realm-bg-600 bg-realm-bg-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <GodIcon iconName={ch.godIconName} colorHex={ch.godColorHex} />
                      <span className="text-sm font-display text-realm-text-primary">{ch.godName}</span>
                      <span className="text-xs text-realm-text-muted">{ch.godTitle}</span>
                      <ChurchTierBadge tier={ch.tier} />
                      {ch.isDominant && (
                        <RealmBadge variant="legendary">DOMINANT</RealmBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-realm-text-secondary mb-1">{ch.churchName}</p>
                    <div className="flex items-center gap-3 text-[11px] text-realm-text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ch.memberCount} follower{ch.memberCount !== 1 ? 's' : ''} ({ch.percentage}%)
                      </span>
                      {ch.highPriestName && (
                        <span>High Priest: {ch.highPriestName}</span>
                      )}
                      {!ch.highPriestName && (
                        <span className="italic">No High Priest</span>
                      )}
                    </div>
                  </div>
                  {character?.patronGodId === ch.godId && (
                    <span className="text-[10px] text-realm-gold-400 font-display">YOUR FAITH</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </RealmPanel>

      {/* God Selection Modal */}
      {showGodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-realm-bg-900 border border-realm-bg-600 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-realm-bg-900 border-b border-realm-bg-600 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-display text-realm-text-primary">
                {confirmGod ? 'Confirm Your Choice' : confirmAtheism ? 'Renounce Faith?' : 'Choose Your Patron God'}
              </h3>
              <button
                onClick={() => { setShowGodModal(false); setConfirmGod(null); setConfirmAtheism(false); }}
                className="text-realm-text-muted hover:text-realm-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Confirmation view */}
              {confirmGod && (
                <div className="space-y-4">
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      borderColor: `${confirmGod.colorHex}40`,
                      backgroundColor: `${confirmGod.colorHex}08`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <GodIcon iconName={confirmGod.iconName} colorHex={confirmGod.colorHex} size="w-6 h-6" />
                      <div>
                        <span className="text-sm font-display text-realm-text-primary">{confirmGod.name}</span>
                        <span className="text-xs text-realm-text-muted ml-2">{confirmGod.title}</span>
                      </div>
                    </div>
                    <p className="text-xs text-realm-text-secondary">{confirmGod.churchName}</p>
                    <p className="text-[11px] text-realm-text-muted mt-1">{confirmGod.domain}</p>
                    <p className="text-[11px] text-realm-text-muted mt-1 italic">{confirmGod.churchDescription}</p>
                  </div>

                  {patronGod && (
                    <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg px-4 py-3">
                      <p className="text-xs text-realm-warning flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Switching from {patronGod.name} to {confirmGod.name} will lock your faith for 7 days.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <RealmButton
                      variant="primary"
                      className="flex-1"
                      onClick={() => chooseMutation.mutate(confirmGod.id)}
                      disabled={chooseMutation.isPending}
                    >
                      {chooseMutation.isPending ? 'Pledging...' : `Follow ${confirmGod.name}`}
                    </RealmButton>
                    <RealmButton
                      variant="secondary"
                      onClick={() => setConfirmGod(null)}
                    >
                      Back
                    </RealmButton>
                  </div>

                  {chooseMutation.isError && (
                    <p className="text-xs text-realm-danger">
                      {(chooseMutation.error as any)?.response?.data?.error || 'Failed to change faith.'}
                    </p>
                  )}
                </div>
              )}

              {/* Atheism confirmation */}
              {confirmAtheism && !confirmGod && (
                <div className="space-y-4">
                  <p className="text-xs text-realm-text-secondary">
                    You will renounce your faith and become godless. You can always choose a new patron later without cooldown.
                  </p>
                  <div className="flex gap-2">
                    <RealmButton
                      variant="primary"
                      className="flex-1"
                      onClick={() => chooseMutation.mutate(null)}
                      disabled={chooseMutation.isPending}
                    >
                      {chooseMutation.isPending ? 'Renouncing...' : 'Renounce Faith'}
                    </RealmButton>
                    <RealmButton
                      variant="secondary"
                      onClick={() => setConfirmAtheism(false)}
                    >
                      Back
                    </RealmButton>
                  </div>
                </div>
              )}

              {/* God list */}
              {!confirmGod && !confirmAtheism && (
                <>
                  {allGods.map((god) => {
                    const isCurrentGod = character?.patronGodId === god.id;
                    // Find this god's chapter in the current town
                    const townChapter = chapters.find(ch => ch.godId === god.id);

                    return (
                      <div
                        key={god.id}
                        className={`rounded-lg p-4 border transition-colors ${
                          isCurrentGod
                            ? 'border-realm-gold-500/40 bg-realm-gold-500/5'
                            : 'border-realm-bg-600 bg-realm-bg-800 hover:border-realm-bg-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <GodIcon iconName={god.iconName} colorHex={god.colorHex} />
                              <span className="text-sm font-display text-realm-text-primary">{god.name}</span>
                              <span className="text-xs text-realm-text-muted">{god.title}</span>
                            </div>
                            <p className="text-[11px] text-realm-text-secondary mb-0.5">{god.churchName}</p>
                            <p className="text-[11px] text-realm-text-muted mb-0.5">{god.domain}</p>
                            <p className="text-[10px] text-realm-text-muted">
                              <span className="text-realm-text-secondary">Favored by:</span> {god.racialLean}
                            </p>
                            {townChapter && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-realm-text-muted">
                                <Users className="w-3 h-3" />
                                <span>{townChapter.memberCount} in this town</span>
                                <ChurchTierBadge tier={townChapter.tier} />
                              </div>
                            )}
                          </div>
                          <div>
                            {isCurrentGod ? (
                              <span className="text-[10px] text-realm-gold-400 font-display">CURRENT</span>
                            ) : (
                              <RealmButton
                                variant="secondary"
                                size="sm"
                                onClick={() => setConfirmGod(god)}
                                disabled={cooldown > 0 && !!patronGod}
                              >
                                Select
                              </RealmButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Atheism option */}
                  {patronGod && (
                    <div className="border-t border-realm-bg-600 pt-3 mt-3">
                      <button
                        onClick={() => setConfirmAtheism(true)}
                        className="text-xs text-realm-text-muted hover:text-realm-text-secondary transition-colors"
                      >
                        Renounce all faith (become godless)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
