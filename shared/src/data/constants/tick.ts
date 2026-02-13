// ---------------------------------------------------------------------------
// Tick System Constants — Single source of truth for the game's daily cycle
// ---------------------------------------------------------------------------
// 1 tick = 1 game day = 24 real-world hours
// Each character gets exactly 1 action per tick (travel, gather, or craft)
// Free actions (market, equip, quest accept, party, social) are unlimited

export const TICK_CONSTANTS = {
  /** Each character gets exactly 1 action per day */
  ACTIONS_PER_TICK: 1,

  /** 1 tick = 24 real-world hours */
  TICK_DURATION_HOURS: 24,
  TICK_DURATION_MS: 24 * 60 * 60 * 1000,

  /** Simulation ticks are instant (no real-time delay) */
  SIM_TICK_DURATION_MS: 0,
} as const;

export const MARKET_CONSTANTS = {
  /** 15 minutes between real-time auction cycles */
  CYCLE_DURATION_MS: 15 * 60 * 1000,
  CYCLE_DURATION_MINUTES: 15,

  /** In simulation, resolve market once per tick */
  SIM_CYCLES_PER_TICK: 1,
} as const;
