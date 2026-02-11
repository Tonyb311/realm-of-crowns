import { useSyncExternalStore } from 'react';
import { getSocket, getConnectionStatus, onConnectionStatusChange } from '../services/socket';
import type { Socket } from 'socket.io-client';

function subscribe(callback: () => void) {
  return onConnectionStatusChange(callback);
}

function getSnapshot() {
  return getConnectionStatus();
}

export function useSocket(): Socket | null {
  return getSocket();
}

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
