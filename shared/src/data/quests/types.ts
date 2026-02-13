export type ObjectiveType = 'KILL' | 'GATHER' | 'DELIVER' | 'TALK' | 'VISIT' | 'EQUIP' | 'SELECT_PROFESSION' | 'CRAFT' | 'MARKET_SELL' | 'MARKET_BUY';

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
  slug: string;
  name: string;
  type: 'MAIN' | 'TOWN' | 'DAILY' | 'GUILD' | 'BOUNTY' | 'RACIAL' | 'TUTORIAL';
  description: string;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  levelRequired: number;
  sortOrder: number;
  prerequisiteQuestId?: string;
  regionId?: string;
  townId?: string;
  npcGiverId?: string;
  isRepeatable?: boolean;
  cooldownHours?: number;
}
