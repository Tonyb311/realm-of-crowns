import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
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

// P0 #13: Validate required secrets at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CHANGE_ME_IN_PRODUCTION') {
  console.error('FATAL: JWT_SECRET is missing or set to placeholder. Set a cryptographically random value.');
  process.exit(1);
}

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

// P0 #11: Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  const timeout = setTimeout(() => {
    console.error('Shutdown timed out. Force exiting.');
    process.exit(1);
  }, 10000);
  try {
    httpServer.close();
    io.close();
    if (redis) await redis.quit();
    await prisma.$disconnect();
    clearTimeout(timeout);
    console.log('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Helper to emit governance events from route handlers
export function emitGovernanceEvent(
  event: 'governance:law-passed' | 'governance:war-declared' | 'governance:peace-proposed' | 'governance:tax-changed',
  room: string,
  data: Record<string, unknown>
) {
  io.to(room).emit(event, data);
}

export { io };
