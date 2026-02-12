import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RaceDefinition, SubRaceOption, StatModifiers } from '@shared/types/race';
import { getRacesByTier } from '@shared/data/races';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmInput } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Local class definitions (not yet in shared data)
// ---------------------------------------------------------------------------
interface ClassDefinition {
  id: string;
  name: string;
  primaryStat: string;
  hpBonus: number;

  description: string;
}

const CLASSES: ClassDefinition[] = [
  { id: 'warrior', name: 'Warrior', primaryStat: 'STR', hpBonus: 10, description: 'Masters of arms and armor' },
  { id: 'mage', name: 'Mage', primaryStat: 'INT', hpBonus: 4, description: 'Wielders of arcane power' },
  { id: 'rogue', name: 'Rogue', primaryStat: 'DEX', hpBonus: 6, description: 'Shadows and precision' },
  { id: 'cleric', name: 'Cleric', primaryStat: 'WIS', hpBonus: 8, description: 'Divine healers and protectors' },
  { id: 'ranger', name: 'Ranger', primaryStat: 'DEX', hpBonus: 8, description: 'Scouts and beast companions' },
  { id: 'bard', name: 'Bard', primaryStat: 'CHA', hpBonus: 6, description: 'Performers and diplomats' },
  { id: 'psion', name: 'Psion', primaryStat: 'INT', hpBonus: 4, description: 'Masters of psionic discipline' },
];

// ---------------------------------------------------------------------------
// Stat helpers
// ---------------------------------------------------------------------------
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
type StatKey = (typeof STAT_KEYS)[number];

function computeStats(race: RaceDefinition, subRace?: SubRaceOption) {
  const base: Record<string, number> = {};
  for (const s of STAT_KEYS) {
    base[s] = 10 + race.statModifiers[s];
  }
  if (subRace?.bonusStat && subRace.bonusValue) {
    base[subRace.bonusStat] = (base[subRace.bonusStat] ?? 10) + subRace.bonusValue;
  }
  return base;
}

function statMod(value: number) {
  return Math.floor((value - 10) / 2);
}

// ---------------------------------------------------------------------------
// Element color map for Elementari sub-race styling
// ---------------------------------------------------------------------------
const ELEMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  fire: { bg: 'bg-realm-danger/20', border: 'border-realm-danger', text: 'text-realm-danger' },
  water: { bg: 'bg-realm-teal-400/20', border: 'border-realm-teal-400', text: 'text-realm-teal-300' },
  earth: { bg: 'bg-realm-gold-500/20', border: 'border-realm-gold-500', text: 'text-realm-gold-400' },
  air: { bg: 'bg-realm-teal-300/20', border: 'border-realm-teal-300', text: 'text-realm-teal-300' },
};

// ---------------------------------------------------------------------------
// Wizard step labels
// ---------------------------------------------------------------------------
const STEP_LABELS = ['Race', 'Sub-Race', 'Class', 'Stats', 'Review'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CharacterCreationPage() {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(0);
  const [selectedRace, setSelectedRace] = useState<RaceDefinition | null>(null);
  const [expandedRace, setExpandedRace] = useState<string | null>(null);
  const [selectedSubRace, setSelectedSubRace] = useState<SubRaceOption | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassDefinition | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [raceTierTab, setRaceTierTab] = useState<'core' | 'common' | 'exotic'>('core');

  // Pre-group races
  const coreRaces = useMemo(() => getRacesByTier('core'), []);
  const commonRaces = useMemo(() => getRacesByTier('common'), []);
  const exoticRaces = useMemo(() => getRacesByTier('exotic'), []);

  const racesForTab = raceTierTab === 'core' ? coreRaces : raceTierTab === 'common' ? commonRaces : exoticRaces;

  // Does selected race require sub-race step?
  const hasSubRaces = selectedRace?.subRaces && selectedRace.subRaces.length > 0;

  // Computed stats
  const stats = useMemo(() => {
    if (!selectedRace) return null;
    return computeStats(selectedRace, selectedSubRace ?? undefined);
  }, [selectedRace, selectedSubRace]);

  // Effective step indices — skip sub-race step when race has none
  // Logical steps: 0=Race, 1=SubRace(conditional), 2=Class, 3=Stats, 4=Review
  const effectiveSteps = useMemo(() => {
    const steps = [0, 2, 3, 4]; // Race, Class, Stats, Review
    if (hasSubRaces) {
      steps.splice(1, 0, 1); // insert SubRace after Race
    }
    return steps;
  }, [hasSubRaces]);

  const currentLogicalStep = effectiveSteps[step] ?? 0;
  const totalSteps = effectiveSteps.length;

  // Navigation
  const canGoNext = useCallback(() => {
    switch (currentLogicalStep) {
      case 0: return !!selectedRace;
      case 1: return !!selectedSubRace;
      case 2: return !!selectedClass;
      case 3: return true; // stats are read-only
      case 4: return characterName.length >= 3 && characterName.length <= 20 && !nameError;
      default: return false;
    }
  }, [currentLogicalStep, selectedRace, selectedSubRace, selectedClass, characterName, nameError]);

  const goNext = () => {
    if (step < totalSteps - 1) setStep(s => s + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Reset downstream when race changes
  const selectRace = (race: RaceDefinition) => {
    if (selectedRace?.id === race.id) {
      // Toggle expand on re-click
      setExpandedRace(prev => (prev === race.id ? null : race.id));
      return;
    }
    setSelectedRace(race);
    setExpandedRace(race.id);
    setSelectedSubRace(null);
  };

  // Submit
  const handleSubmit = async () => {
    if (!selectedRace || !selectedClass || !stats) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post('/characters/create', {
        name: characterName,
        race: selectedRace.id.toUpperCase(),
        subRace: selectedSubRace?.id ?? undefined,
        characterClass: selectedClass.id,
      });
      setCreatedCharacter(res.data.character);
    } catch (err: any) {
      setSubmitError(err.response?.data?.error ?? 'Failed to create character. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Name validation
  const validateName = (name: string) => {
    if (name.length > 0 && name.length < 3) setNameError('Name must be at least 3 characters');
    else if (name.length > 20) setNameError('Name must be 20 characters or fewer');
    else setNameError('');
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderStatModifier = (val: number) => {
    if (val > 0) return <span className="text-realm-success">+{val}</span>;
    if (val < 0) return <span className="text-realm-danger">{val}</span>;
    return <span className="text-realm-text-muted">+0</span>;
  };

  const renderProgressBar = () => (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {effectiveSteps.map((logicalStep, idx) => {
          const label = STEP_LABELS[logicalStep];
          const isActive = idx === step;
          const isDone = idx < step;
          return (
            <div key={logicalStep} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${isDone ? 'bg-realm-gold-400' : 'bg-realm-border'}`} />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display
                    ${isActive ? 'bg-realm-gold-400 text-realm-bg-900' : isDone ? 'bg-realm-gold-400/60 text-realm-bg-900' : 'bg-realm-bg-700 text-realm-text-muted'}`}
                >
                  {idx + 1}
                </div>
                {idx < effectiveSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isDone ? 'bg-realm-gold-400' : 'bg-realm-border'}`} />
                )}
              </div>
              <span className={`mt-1 text-xs ${isActive ? 'text-realm-gold-400 font-bold' : 'text-realm-text-muted'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Step 0: Race Selection
  // -----------------------------------------------------------------------
  const renderRaceSelection = () => (
    <div className="w-full max-w-5xl mx-auto">
      <h2 className="text-3xl font-display text-realm-gold-400 text-center mb-6">Choose Your Race</h2>

      {/* Tier tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {(['core', 'common', 'exotic'] as const).map(tier => (
          <button
            key={tier}
            onClick={() => setRaceTierTab(tier)}
            className={`px-6 py-2 font-display text-sm rounded border transition-colors
              ${raceTierTab === tier
                ? 'bg-realm-gold-400 text-realm-bg-900 border-realm-gold-500'
                : 'bg-realm-bg-700 text-realm-text-secondary border-realm-border hover:border-realm-gold-500/50'}`}
          >
            {tier === 'core' ? 'Core Races' : tier === 'common' ? 'Common Races' : 'Exotic Races'}
          </button>
        ))}
      </div>

      {/* Race cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {racesForTab.map(race => {
          const isSelected = selectedRace?.id === race.id;
          const isExpanded = expandedRace === race.id && isSelected;
          return (
            <div key={race.id} className="flex flex-col">
              <button
                onClick={() => selectRace(race)}
                className={`relative p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected ? 'border-realm-gold-500 bg-realm-bg-700/80 shadow-realm-glow' : 'border-realm-border bg-realm-bg-700 hover:border-realm-gold-500/40'}`}
              >
                {/* Badges */}
                {race.id === 'human' && (
                  <span className="absolute top-2 right-2 text-[10px] bg-realm-success/30 text-realm-success px-2 py-0.5 rounded">
                    Recommended for New Players
                  </span>
                )}
                {race.tier === 'exotic' && (
                  <span className="absolute top-2 right-2 text-[10px] bg-realm-gold-500/30 text-realm-gold-300 px-2 py-0.5 rounded">
                    Hard Mode
                  </span>
                )}

                <h3 className="font-display text-lg text-realm-gold-400">{race.name}</h3>
                <p className="text-xs text-realm-text-muted mb-2 italic">{race.trait.name}</p>
                <p className="text-xs text-realm-text-secondary mb-3 line-clamp-2">{race.trait.description}</p>

                {/* Stat modifiers row */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {STAT_KEYS.map(s => (
                    <span key={s} className="flex gap-0.5">
                      <span className="text-realm-text-muted uppercase">{s}:</span>
                      {renderStatModifier(race.statModifiers[s])}
                    </span>
                  ))}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-1 p-4 rounded-lg bg-realm-bg-700/60 border border-realm-gold-500/30 text-sm space-y-3 animate-[fadeIn_0.2s_ease-in]">
                  <p className="text-realm-text-secondary text-xs leading-relaxed">{race.lore}</p>

                  <div>
                    <h4 className="font-display text-realm-gold-400 text-xs mb-1">Abilities</h4>
                    <ul className="space-y-1">
                      {race.abilities.map(a => (
                        <li key={a.name} className="text-xs text-realm-text-secondary">
                          <span className="text-realm-text-primary font-semibold">{a.name}</span>
                          <span className="text-realm-text-muted ml-1">(Lv.{a.levelRequired})</span>
                          {' - '}{a.description}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {race.id === 'revenant' && (
                    <div className="mt-2 p-2 rounded bg-realm-gold-500/10 border border-realm-gold-500/30">
                      <h4 className="font-display text-realm-gold-400 text-xs mb-1">Sustenance</h4>
                      <p className="text-xs text-realm-text-secondary">
                        Revenants do not eat or drink. Instead, they require{' '}
                        <span className="text-realm-gold-400 font-semibold">Soul Essence</span> — an
                        alchemical stabilizer crafted by Alchemists. Without it, your spirit begins
                        to fade, causing stat penalties. Budget accordingly.
                      </p>
                    </div>
                  )}

                  {race.id === 'forgeborn' && (
                    <div className="mt-2 p-2 rounded bg-realm-gold-500/10 border border-realm-gold-500/30">
                      <h4 className="font-display text-realm-gold-400 text-xs mb-1">Maintenance</h4>
                      <p className="text-xs text-realm-text-secondary">
                        Forgeborn do not eat or drink. Instead, they require{' '}
                        <span className="text-realm-gold-400 font-semibold">Maintenance Kits</span> —
                        metalworking consumables crafted by Smelters. Without regular maintenance,
                        mechanical components degrade, causing stat penalties. Budget accordingly.
                      </p>
                    </div>
                  )}

                  {race.professionBonuses.length > 0 && (
                    <div>
                      <h4 className="font-display text-realm-gold-400 text-xs mb-1">Profession Bonuses</h4>
                      <ul className="space-y-0.5">
                        {race.professionBonuses.map(pb => {
                          const bonuses: string[] = [];
                          if (pb.speedBonus) bonuses.push(`Speed +${(pb.speedBonus * 100).toFixed(0)}%`);
                          if (pb.qualityBonus) bonuses.push(`Quality ${pb.qualityBonus > 0 ? '+' : ''}${(pb.qualityBonus * 100).toFixed(0)}%`);
                          if (pb.yieldBonus) bonuses.push(`Yield ${pb.yieldBonus > 0 ? '+' : ''}${(pb.yieldBonus * 100).toFixed(0)}%`);
                          if (pb.xpBonus) bonuses.push(`XP +${(pb.xpBonus * 100).toFixed(0)}%`);
                          return (
                            <li key={pb.professionType} className="text-xs text-realm-text-secondary">
                              <span className="capitalize text-realm-text-primary">{pb.professionType.replace(/_/g, ' ')}</span>
                              {': '}{bonuses.join(', ')}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Step 1: Sub-Race Selection
  // -----------------------------------------------------------------------
  const renderSubRaceSelection = () => {
    if (!selectedRace?.subRaces) return null;
    const isElementari = selectedRace.id === 'elementari';

    return (
      <div className="w-full max-w-4xl mx-auto">
        <h2 className="text-3xl font-display text-realm-gold-400 text-center mb-2">
          Choose Your {selectedRace.id === 'drakonid' ? 'Ancestry' : selectedRace.id === 'beastfolk' ? 'Clan' : 'Element'}
        </h2>
        <p className="text-center text-realm-text-muted text-sm mb-6">{selectedRace.name}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {selectedRace.subRaces.map(sr => {
            const isSelected = selectedSubRace?.id === sr.id;
            const elemColors = isElementari && sr.element ? ELEMENT_COLORS[sr.element] : null;

            return (
              <button
                key={sr.id}
                onClick={() => setSelectedSubRace(sr)}
                className={`p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected
                    ? 'border-realm-gold-500'
                    : elemColors
                      ? `${elemColors.border} border-opacity-40 hover:border-opacity-80`
                      : 'border-realm-border hover:border-realm-gold-500/40'}
                  ${elemColors ? elemColors.bg : 'bg-realm-bg-700'}`}
              >
                <h3 className={`font-display text-lg ${elemColors ? elemColors.text : 'text-realm-gold-400'}`}>
                  {sr.name}
                </h3>
                <p className="text-xs text-realm-text-secondary mt-1 mb-2">{sr.description}</p>

                {sr.element && sr.resistance && (
                  <p className="text-xs text-realm-text-muted">
                    Element: <span className={elemColors ? elemColors.text : 'text-realm-text-primary'}>{sr.element}</span>
                    {' | '}Resistance: <span className="text-realm-text-primary">{sr.resistance}</span>
                  </p>
                )}
                {sr.bonusStat && sr.bonusValue && (
                  <p className="text-xs mt-1">
                    <span className="text-realm-text-muted uppercase">{sr.bonusStat}:</span>{' '}
                    <span className="text-realm-success">+{sr.bonusValue}</span>
                  </p>
                )}
                {sr.specialPerk && !sr.element && (
                  <p className="text-xs text-realm-text-muted mt-1 italic">{sr.specialPerk}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Step 2: Class Selection
  // -----------------------------------------------------------------------
  const renderClassSelection = () => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-display text-realm-gold-400 text-center mb-6">Choose Your Class</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CLASSES.map(cls => {
          const isSelected = selectedClass?.id === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className={`p-5 rounded-lg border-2 text-left transition-all
                ${isSelected ? 'border-realm-gold-500 bg-realm-bg-700/80 shadow-realm-glow' : 'border-realm-border bg-realm-bg-700 hover:border-realm-gold-500/40'}`}
            >
              <h3 className="font-display text-xl text-realm-gold-400">{cls.name}</h3>
              <p className="text-xs text-realm-text-muted mb-3">{cls.description}</p>
              <div className="space-y-1 text-xs">
                <p className="text-realm-text-secondary">
                  Primary Stat: <span className="text-realm-gold-400 font-semibold">{cls.primaryStat}</span>
                </p>
                <p className="text-realm-text-secondary">
                  HP Bonus: <span className="text-realm-success">+{cls.hpBonus}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Step 3: Stat Review
  // -----------------------------------------------------------------------
  const renderStatReview = () => {
    if (!stats || !selectedRace) return null;
    const dexMod = statMod(stats.dex);

    return (
      <div className="w-full max-w-2xl mx-auto">
        <h2 className="text-3xl font-display text-realm-gold-400 text-center mb-6">Stat Review</h2>

        {/* Main stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {STAT_KEYS.map(s => (
            <div key={s} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 text-center">
              <p className="text-xs text-realm-text-muted uppercase tracking-wider">{s}</p>
              <p className="text-3xl font-display text-realm-text-primary mt-1">{stats[s]}</p>
              <p className="text-xs text-realm-text-muted mt-1">
                (10 {selectedRace.statModifiers[s] >= 0 ? '+' : ''}{selectedRace.statModifiers[s]}
                {selectedSubRace?.bonusStat === s && selectedSubRace.bonusValue
                  ? ` +${selectedSubRace.bonusValue}`
                  : ''})
              </p>
            </div>
          ))}
        </div>

        {/* Derived stats */}
        <RealmPanel title="Derived Stats" className="mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-realm-text-muted">HP</p>
              <p className="text-xl font-display text-realm-success">
                {10 + statMod(stats.con) + (selectedClass?.hpBonus ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-realm-text-muted">AC</p>
              <p className="text-xl font-display text-realm-text-primary">
                {10 + dexMod}
              </p>
            </div>
            <div>
              <p className="text-xs text-realm-text-muted">Initiative</p>
              <p className="text-xl font-display text-realm-text-primary">
                {dexMod >= 0 ? '+' : ''}{dexMod}
              </p>
            </div>
          </div>
        </RealmPanel>

        {/* Racial trait */}
        <RealmPanel>
          <h3 className="font-display text-realm-gold-400 text-sm mb-1">{selectedRace.trait.name}</h3>
          <p className="text-xs text-realm-text-secondary">{selectedRace.trait.description}</p>
        </RealmPanel>

        {selectedRace.id === 'revenant' && (
          <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg p-5 mt-3">
            <h3 className="font-display text-realm-gold-400 text-sm mb-1">Sustenance</h3>
            <p className="text-xs text-realm-text-secondary">
              Revenants do not eat or drink. Instead, they require{' '}
              <span className="text-realm-gold-400 font-semibold">Soul Essence</span> — an
              alchemical stabilizer crafted by Alchemists. Without it, your spirit begins
              to fade, causing stat penalties. Budget accordingly.
            </p>
          </div>
        )}

        {selectedRace.id === 'forgeborn' && (
          <div className="bg-realm-gold-500/10 border border-realm-gold-500/30 rounded-lg p-5 mt-3">
            <h3 className="font-display text-realm-gold-400 text-sm mb-1">Maintenance</h3>
            <p className="text-xs text-realm-text-secondary">
              Forgeborn do not eat or drink. Instead, they require{' '}
              <span className="text-realm-gold-400 font-semibold">Maintenance Kits</span> —
              metalworking consumables crafted by Smelters. Without regular maintenance,
              mechanical components degrade, causing stat penalties. Budget accordingly.
            </p>
          </div>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Step 4: Review & Confirm
  // -----------------------------------------------------------------------
  const renderReview = () => {
    if (!selectedRace || !selectedClass || !stats) return null;

    return (
      <div className="w-full max-w-2xl mx-auto">
        <h2 className="text-3xl font-display text-realm-gold-400 text-center mb-6">Review & Confirm</h2>

        {/* Character name */}
        <div className="mb-6">
          <RealmInput
            label="Character Name"
            value={characterName}
            onChange={e => setCharacterName(e.target.value)}
            onBlur={e => validateName(e.target.value)}
            maxLength={20}
            placeholder="Enter your character's name..."
            error={nameError}
            className="text-lg font-display py-3"
          />
        </div>

        {/* Summary */}
        <RealmPanel className="mb-6">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-realm-text-muted">Race</span>
            <span className="text-realm-text-primary">{selectedRace.name}</span>

            {selectedSubRace && (
              <>
                <span className="text-realm-text-muted">Sub-Race</span>
                <span className="text-realm-text-primary">{selectedSubRace.name}</span>
              </>
            )}

            <span className="text-realm-text-muted">Class</span>
            <span className="text-realm-text-primary">{selectedClass.name}</span>

            <span className="text-realm-text-muted">Starting Town</span>
            <span className="text-realm-text-secondary italic">Auto-assigned based on race</span>
          </div>

          {/* Compact stat line */}
          <div className="pt-3 border-t border-realm-border mt-4">
            <p className="text-xs text-realm-text-muted mb-2">Stats</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {STAT_KEYS.map(s => (
                <span key={s} className="text-realm-text-secondary">
                  <span className="uppercase text-realm-text-muted">{s}</span> {stats[s]}
                </span>
              ))}
            </div>
          </div>
        </RealmPanel>

        {submitError && (
          <div className="mb-4 p-3 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-sm">
            {submitError}
          </div>
        )}

        <RealmButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting || !characterName || characterName.length < 3 || characterName.length > 20 || !!nameError}
        >
          {isSubmitting ? 'Creating...' : 'Create Character'}
        </RealmButton>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Step router
  // -----------------------------------------------------------------------
  const renderCurrentStep = () => {
    switch (currentLogicalStep) {
      case 0: return renderRaceSelection();
      case 1: return renderSubRaceSelection();
      case 2: return renderClassSelection();
      case 3: return renderStatReview();
      case 4: return renderReview();
      default: return null;
    }
  };

  // -----------------------------------------------------------------------
  // Success screen after character creation
  // -----------------------------------------------------------------------
  const renderSuccess = () => {
    if (!createdCharacter || !selectedRace || !selectedClass) return null;

    return (
      <div className="w-full max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-display text-realm-gold-400 mb-4">Character Created!</h2>
        <p className="text-xl text-realm-text-primary mb-2">
          {createdCharacter.name} the {selectedRace.name} {selectedClass.name}
        </p>
        <p className="text-lg text-realm-gold-300">
          Welcome to <span className="font-bold">{createdCharacter.currentTown?.name || createdCharacter.homeTown?.name || 'your new home'}</span>!
        </p>
        <p className="text-sm text-realm-text-muted mb-8">Your journey begins here.</p>

        <RealmButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/')}
        >
          Enter the World
        </RealmButton>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Layout
  // -----------------------------------------------------------------------
  if (createdCharacter) {
    return (
      <div className="min-h-screen bg-realm-bg-900 py-16 px-4 flex items-center justify-center">
        {renderSuccess()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-realm-bg-900 py-8 px-4">
      {renderProgressBar()}

      <div className="transition-opacity duration-300">
        {renderCurrentStep()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-center gap-4 mt-8 mb-8">
        {step > 0 && (
          <RealmButton
            variant="secondary"
            onClick={goBack}
          >
            Back
          </RealmButton>
        )}
        {currentLogicalStep < 4 && (
          <RealmButton
            variant="primary"
            onClick={goNext}
            disabled={!canGoNext()}
          >
            Next
          </RealmButton>
        )}
      </div>
    </div>
  );
}
