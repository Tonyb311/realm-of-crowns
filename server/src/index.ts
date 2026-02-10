import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { startElectionLifecycle } from './jobs/election-lifecycle';
import { startTaxCollectionJob } from './jobs/tax-collection';
import { startLawExpirationJob } from './jobs/law-expiration';
import { startResourceRegenerationJob } from './jobs/resource-regeneration';
import { startGatheringAutocompleteJob } from './jobs/gathering-autocomplete';
import { startConstructionCompleteJob } from './jobs/construction-complete';
import { startPropertyTaxJob } from './jobs/property-tax';
import { startBuildingMaintenanceJob } from './jobs/building-maintenance';
import { startCaravanEventsJob } from './jobs/caravan-events';
import { startStateOfAethermereJob } from './jobs/state-of-aethermere';
import { startSeerPremonitionJob } from './jobs/seer-premonition';
// DEPRECATED: Forgeborn maintenance now handled by daily tick in food-system.ts
// import { startForgebornMaintenanceJob } from './jobs/forgeborn-maintenance';
import { registerChatHandlers } from './socket/chat-handlers';
import { socketAuthMiddleware, cleanupRateLimit } from './socket/middleware';
import { setupPresence } from './socket/presence';
import { initEventBroadcaster } from './socket/events';

const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Socket.io authentication middleware — verifies JWT before connection
io.use(socketAuthMiddleware);

// Initialize the event broadcaster so route handlers can emit events
initEventBroadcaster(io);

// Set up presence tracking (handles connect/disconnect, friend online status)
setupPresence(io);

// Legacy + guild room handlers and chat (runs after presence has already set up rooms)
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id} (user: ${socket.data.userId})`);

  // Join/leave guild rooms for real-time guild events
  socket.on('join:guild', (guildId: string) => {
    socket.join(`guild:${guildId}`);
  });

  socket.on('leave:guild', (guildId: string) => {
    socket.leave(`guild:${guildId}`);
  });

  // Register chat message handlers
  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    cleanupRateLimit(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ⚔️  ═══════════════════════════════════════ ⚔️
  ║                                           ║
  ║        REALM OF CROWNS SERVER              ║
  ║        Running on port ${PORT}                ║
  ║                                           ║
  ⚔️  ═══════════════════════════════════════ ⚔️
  `);

  // Start background jobs
  startElectionLifecycle(io);
  startTaxCollectionJob();
  startLawExpirationJob();
  startResourceRegenerationJob();
  startGatheringAutocompleteJob();
  startConstructionCompleteJob();
  startPropertyTaxJob();
  startBuildingMaintenanceJob();
  startCaravanEventsJob();
  startStateOfAethermereJob();
  startSeerPremonitionJob();
  // DEPRECATED: Forgeborn maintenance now handled by daily tick in food-system.ts
  // startForgebornMaintenanceJob();
});

// Helper to emit governance events from route handlers
export function emitGovernanceEvent(
  event: 'governance:law-passed' | 'governance:war-declared' | 'governance:peace-proposed' | 'governance:tax-changed',
  room: string,
  data: Record<string, unknown>
) {
  io.to(room).emit(event, data);
}

export { io };
