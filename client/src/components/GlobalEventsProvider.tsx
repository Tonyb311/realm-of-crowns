import { useItemEvents } from '../hooks/useItemEvents';
import { useBuildingEvents } from '../hooks/useBuildingEvents';

/**
 * Mounts once in the app and subscribes to global Socket.io events
 * that should fire regardless of which page the player is on
 * (item durability, building maintenance).
 * Renders nothing visible.
 */
export default function GlobalEventsProvider() {
  useItemEvents();
  useBuildingEvents();
  return null;
}
