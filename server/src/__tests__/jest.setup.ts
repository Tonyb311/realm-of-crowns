// Mock the index module to prevent httpServer.listen() side effects during tests.
// governance.ts imports emitGovernanceEvent from index, guilds.ts imports io from index.
// When index.ts is loaded as a module side effect, it tries to bind to port 4000.
jest.mock('../index', () => ({
  emitGovernanceEvent: jest.fn(),
  io: {
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    emit: jest.fn(),
  },
}));

// Mock the socket events module to prevent "Socket.io not initialized" errors.
// friends.ts, combat routes, and others call emit* functions from this module.
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
}));
