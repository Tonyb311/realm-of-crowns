/**
 * Display labels for building type enums.
 * Shared between server (error messages) and client (UI).
 */
export const BUILDING_TYPE_LABELS: Record<string, string> = {
  HOUSE_SMALL: 'Small House',
  HOUSE_MEDIUM: 'Medium House',
  HOUSE_LARGE: 'Large House',
  SMITHY: 'Smithy',
  SMELTERY: 'Smeltery',
  TANNERY: 'Tannery',
  TAILOR_SHOP: 'Tailor Shop',
  ALCHEMY_LAB: 'Alchemy Lab',
  ENCHANTING_TOWER: 'Enchanting Tower',
  KITCHEN: 'Kitchen',
  BREWERY: 'Brewery',
  JEWELER_WORKSHOP: 'Jeweler Workshop',
  FLETCHER_BENCH: 'Fletcher Bench',
  MASON_YARD: 'Mason Yard',
  LUMBER_MILL: 'Lumber Mill',
  SCRIBE_STUDY: 'Scribe Study',
  STABLE: 'Stable',
  WAREHOUSE: 'Warehouse',
  BANK: 'Bank',
  INN: 'Inn',
  MARKET_STALL: 'Market Stall',
  FARM: 'Farm',
  RANCH: 'Ranch',
  MINE: 'Mine',
};

export function buildingTypeLabel(type: string): string {
  return BUILDING_TYPE_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}
