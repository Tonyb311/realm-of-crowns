export { QuestDefinition, QuestObjective, QuestRewards, ObjectiveType } from './types';
export { TUTORIAL_QUESTS } from './tutorial-quests';

import { QuestDefinition } from './types';
import { TUTORIAL_QUESTS } from './tutorial-quests';

export const ALL_QUESTS: QuestDefinition[] = [
  ...TUTORIAL_QUESTS,
];

export function getQuestById(id: string): QuestDefinition | undefined {
  return ALL_QUESTS.find((q) => q.id === id);
}

export function getQuestBySlug(slug: string): QuestDefinition | undefined {
  return ALL_QUESTS.find((q) => q.slug === slug);
}
