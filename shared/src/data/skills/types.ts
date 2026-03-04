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
