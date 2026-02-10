export { QuestDefinition, QuestObjective, QuestRewards, ObjectiveType } from './types';
export { MAIN_QUESTS } from './main-quests';
export { TOWN_QUESTS } from './town-quests';
export { DAILY_QUESTS } from './daily-quests';
export { GUILD_QUESTS } from './guild-quests';
export { BOUNTY_QUESTS } from './bounty-quests';

import { QuestDefinition } from './types';
import { MAIN_QUESTS } from './main-quests';
import { TOWN_QUESTS } from './town-quests';
import { DAILY_QUESTS } from './daily-quests';
import { GUILD_QUESTS } from './guild-quests';
import { BOUNTY_QUESTS } from './bounty-quests';

export const ALL_QUESTS: QuestDefinition[] = [
  ...MAIN_QUESTS,
  ...TOWN_QUESTS,
  ...DAILY_QUESTS,
  ...GUILD_QUESTS,
  ...BOUNTY_QUESTS,
];

export function getQuestById(id: string): QuestDefinition | undefined {
  return ALL_QUESTS.find((q) => q.id === id);
}
