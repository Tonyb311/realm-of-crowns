import type { EncumbrancePenalties } from '../utils/bounded-accuracy';

/**
 * Weight state returned by the server on item-related API responses.
 * Mirrors server/src/services/weight-calculator.ts WeightState.
 */
export interface WeightState {
  currentWeight: number;
  inventoryWeight: number;
  equipmentWeight: number;
  carryCapacity: number;
  bagBonus: number;
  encumbrance: EncumbrancePenalties;
}

/** Display configuration for each encumbrance tier. */
export const ENCUMBRANCE_TIER_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  barColor: string;
}> = {
  NORMAL: { label: 'Normal', color: 'text-realm-text-secondary', bgColor: 'bg-emerald-500', barColor: 'bg-emerald-500' },
  BURDENED: { label: 'Burdened', color: 'text-amber-400', bgColor: 'bg-amber-500', barColor: 'bg-amber-500' },
  ENCUMBERED: { label: 'Encumbered', color: 'text-orange-400', bgColor: 'bg-orange-500', barColor: 'bg-orange-500' },
  HEAVILY_ENCUMBERED: { label: 'Heavily Encumbered', color: 'text-red-400', bgColor: 'bg-red-500', barColor: 'bg-red-500' },
  SEVERELY_OVERLOADED: { label: 'Severely Overloaded', color: 'text-red-500', bgColor: 'bg-red-600', barColor: 'bg-red-600' },
  CRUSHED: { label: 'Crushed', color: 'text-red-600', bgColor: 'bg-red-700', barColor: 'bg-red-700' },
};
