export type ObjectiveType = 'KILL' | 'GATHER' | 'DELIVER' | 'TALK' | 'VISIT';

export interface QuestObjective {
  type: ObjectiveType;
  target: string;
  quantity: number;
}

export interface QuestRewards {
  xp: number;
  gold: number;
  items?: string[];
  reputation?: number;
}

export interface QuestDefinition {
  id: string;
  name: string;
  type: 'MAIN' | 'TOWN' | 'DAILY' | 'GUILD' | 'BOUNTY' | 'RACIAL';
  description: string;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  levelRequired: number;
  prerequisiteQuestId?: string;
  regionId?: string;
  townId?: string;
  npcGiverId?: string;
  isRepeatable?: boolean;
  cooldownHours?: number;
}
