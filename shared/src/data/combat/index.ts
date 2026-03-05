/**
 * Combat data module - crit and fumble charts
 */
export {
  // Crit chart arrays
  SLASHING_MELEE_CRITS,
  PIERCING_MELEE_CRITS,
  BLUDGEONING_MELEE_CRITS,
  RANGED_CRITS,
  SPELL_CRITS,
  // Fumble chart arrays
  MELEE_FUMBLES,
  RANGED_FUMBLES,
  SPELL_FUMBLES,
  // Lookup functions
  lookupCritChart,
  lookupFumbleChart,
  getCritChartType,
  getFumbleChartType,
  getFumbleLevelCap,
  getCritSeverity,
  getFumbleSeverity,
} from './crit-charts';

export { computeFormulaCR } from './cr-formula';
export type { CRInput } from './cr-formula';
