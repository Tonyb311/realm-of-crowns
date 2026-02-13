import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { app } from './app';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';
import { activeWsConnections, socketEventCounter } from './lib/metrics';
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
import { startTravelTickJob } from './jobs/travel-tick';
// DEPRECATED: Forgeborn maintenance now handled by daily tick in food-system.ts
// import { startForgebornMaintenanceJob } from './jobs/forgeborn-maintenance';
import { startMarketCycleTimer, stopMarketCycleTimer } from './jobs/market-cycle';
import { registerChatHandlers } from './socket/chat-handlers';
import { socketAuthMiddleware, cleanupRateLimit } from './socket/middleware';
import { setupPresence } from './socket/presence';
import { initEventBroadcaster } from './socket/events';

import { ensureAdminAccount } from './lib/ensure-admin';
import { ensureCoreContentReleased } from './lib/ensure-content-released';

const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 64 * 1024, // 64KB — limit payload size
  pingInterval: 25000,
  pingTimeout: 20000,
});

// P2 #49: Socket.io Redis adapter for horizontal scaling
if (process.env.REDIS_URL) {
  try {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter configured');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to configure Socket.io Redis adapter, falling back to in-memory');
  }
}

// Socket.io authentication middleware — verifies JWT before connection
io.use(socketAuthMiddleware);

// Initialize the event broadcaster so route handlers can emit events
initEventBroadcaster(io);

// Wire error logger to emit real-time events to admin clients
import { setAdminEmitter } from './lib/error-logger';
setAdminEmitter((event, data) => io.emit(event, data));

// Set up presence tracking (handles connect/disconnect, friend online status)
setupPresence(io);

// Legacy + guild room handlers and chat (runs after presence has already set up rooms)
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id, userId: socket.data.userId }, 'player connected');
  activeWsConnections.inc();
  socketEventCounter.inc({ event: 'connection' });

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
    logger.info({ socketId: socket.id }, 'player disconnected');
    activeWsConnections.dec();
    socketEventCounter.inc({ event: 'disconnect' });
    cleanupRateLimit(socket.id);
  });
});

// P0 #13: Validate required secrets at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CHANGE_ME_IN_PRODUCTION') {
  logger.fatal('FATAL: JWT_SECRET is missing or set to placeholder. Set a cryptographically random value.');
  process.exit(1);
}

httpServer.listen(PORT, async () => {
  logger.info({ port: PORT }, 'Realm of Crowns server started');

  // Ensure admin account exists (creates if missing)
  await ensureAdminAccount();

  // Ensure core races and towns are released (creates ContentRelease rows if needed)
  await ensureCoreContentReleased();

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
  startTravelTickJob(io);
  startMarketCycleTimer();
  // DEPRECATED: Forgeborn maintenance now handled by daily tick in food-system.ts
  // startForgebornMaintenanceJob();

  logger.info('All background jobs started');
});

// P0 #11: Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'received shutdown signal, starting graceful shutdown');
  const timeout = setTimeout(() => {
    logger.error('shutdown timed out, force exiting');
    process.exit(1);
  }, 10000);
  try {
    stopMarketCycleTimer();
    httpServer.close();
    io.close();
    if (redis) await redis.quit();
    await prisma.$disconnect();
    clearTimeout(timeout);
    logger.info('graceful shutdown complete');
    process.exit(0);
  } catch (err: any) {
    logger.error({ err: err.message }, 'error during shutdown');
    process.exit(1);
  }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

