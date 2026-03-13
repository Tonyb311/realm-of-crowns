// ---------------------------------------------------------------------------
// Jobs System — Shared Configuration
// ---------------------------------------------------------------------------

export const JOB_CATEGORIES = ['ASSET', 'WORKSHOP', 'DELIVERY'] as const;
export type JobCategory = typeof JOB_CATEGORIES[number];

export const JOB_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DELIVERED'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const ASSET_JOB_TYPES = ['harvest_field', 'plant_field', 'gather_eggs', 'milk_cows', 'shear_sheep'] as const;
export type AssetJobType = typeof ASSET_JOB_TYPES[number];

export const JOB_TYPE_LABELS: Record<string, string> = {
  harvest_field: 'Harvest Field',
  plant_field: 'Plant Field',
  gather_eggs: 'Gather Eggs',
  milk_cows: 'Milk Cows',
  shear_sheep: 'Shear Sheep',
};

export const WORKSHOP_JOB_CONFIG = {
  maxActivePerPoster: 3,
};

export const DELIVERY_JOB_CONFIG = {
  maxActivePerPoster: 3,
  maxActivePerWorker: 2,
  minDeadlineDays: 1,
  maxDeadlineDays: 7,
};
