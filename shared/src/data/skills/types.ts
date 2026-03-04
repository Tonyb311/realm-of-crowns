export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  class: string;
  specialization: string;
  tier: number;
  effects: Record<string, unknown>;
  cooldown: number;
  prerequisiteAbilityId?: string;
  levelRequired: number;
  /** If true, this ability requires a player choice (tier 0 abilities) */
  requiresChoice?: boolean;
  /** Groups abilities into a choice set (e.g., 'warrior_tier0_level3') */
  choiceGroup?: string;
  /** If set, grants this tag to the actor when used (e.g., 'stealthed' from Vanish) */
  grantsSetupTag?: string;
  /** If set, this ability gets priority boost when the actor has this tag */
  requiresSetupTag?: string;
  /** If true, the setup tag is consumed when this ability fires */
  consumesSetupTag?: boolean;
  /** How the ability resolves: weapon attack, spell attack, saving throw, or auto-hit */
  attackType?: 'weapon' | 'spell' | 'save' | 'auto';
  /** Damage type for resistance/vulnerability checks (e.g., 'FIRE', 'PSYCHIC') */
  damageType?: string;
}

export interface SpecializationDefinition {
  name: string;
  description: string;
  abilities: AbilityDefinition[];
}

export interface ClassDefinition {
  name: string;
  specializations: SpecializationDefinition[];
}
