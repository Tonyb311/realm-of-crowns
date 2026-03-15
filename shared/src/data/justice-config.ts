export const JUSTICE_CONFIG = {
  warrantCost: 25,
  maxActiveWarrants: 3,
  warrantExpiryDays: 14,
  baseCaptureChance: 0.30,
  minCaptureChance: 0.10,
  maxCaptureChance: 0.80,
  bailAmount: 75,
  autoReleaseTicks: 2,
  falseArrestCompensation: 50,
  martialLawCaptureBonus: 0.20,
} as const;

export const CAPTURE_FORMULA = {
  wisWeight: 2,
  leWeight: 0.2,
  dexWeight: 2,
  levelWeight: 0.2,
} as const;

export const PUNISHMENTS = {
  FINE: {
    id: 'FINE',
    name: 'Fine',
    description: 'Monetary penalty deducted from defendant gold, credited to town treasury.',
  },
  TOWN_BAN: {
    id: 'TOWN_BAN',
    name: 'Town Ban',
    description: 'Defendant is banned from entering the town for a specified duration.',
    durationOptions: [7, 14, 30],
  },
  COMMUNITY_SERVICE: {
    id: 'COMMUNITY_SERVICE',
    name: 'Community Service',
    description: 'Defendant must complete jobs in the town to fulfill their sentence.',
  },
  EXILE: {
    id: 'EXILE',
    name: 'Exile',
    description: 'Defendant is forcibly relocated to an adjacent town.',
  },
} as const;

export type PunishmentType = keyof typeof PUNISHMENTS;
