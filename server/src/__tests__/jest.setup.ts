// Mock the index module to prevent httpServer.listen() side effects during tests.
// When index.ts is loaded as a module side effect, it tries to bind to port 4000.
jest.mock('../index', () => ({}));

// Mock the socket events module to prevent "Socket.io not initialized" errors.
// Route files import emit* functions from this module for real-time events.
jest.mock('../socket/events', () => ({
  initEventBroadcaster: jest.fn(),
  emitPlayerEnterTown: jest.fn(),
  emitPlayerLeaveTown: jest.fn(),
  emitCombatResult: jest.fn(),
  emitTradeCompleted: jest.fn(),
  emitFriendRequest: jest.fn(),
  emitFriendAccepted: jest.fn(),
  emitLevelUp: jest.fn(),
  emitAchievementUnlocked: jest.fn(),
  emitNotification: jest.fn(),
  emitGovernanceEvent: jest.fn(),
  emitGuildEvent: jest.fn(),
}));
