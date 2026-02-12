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
