/**
 * Simulation Context — lightweight global for tagging combat logs with tick numbers.
 *
 * The simulation controller sets the current tick before processing bots
 * and clears it after. Combat logging reads this to tag encounter logs
 * with the simulation tick they occurred during.
 *
 * This works because the simulation runs sequentially (one tick at a time).
 */

let _currentSimulationTick: number | null = null;
let _currentSimulationRunId: string | null = null;

export function setSimulationTick(tick: number | null): void {
  _currentSimulationTick = tick;
}

export function getSimulationTick(): number | null {
  return _currentSimulationTick;
}

export function setSimulationRunId(id: string | null): void {
  _currentSimulationRunId = id;
}

export function getSimulationRunId(): string | null {
  return _currentSimulationRunId;
}
