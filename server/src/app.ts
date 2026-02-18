import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import router from './routes';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './lib/logger';
import { getMetrics, getMetricsContentType } from './lib/metrics';
import { requestIdMiddleware } from './middleware/request-id';
import { requestLoggerMiddleware } from './middleware/request-logger';
import { metricsMiddleware } from './middleware/metrics';
import { requestTimingMiddleware, responseLoggerMiddleware, errorHandlerMiddleware } from './middleware/error-logger';

export const app = express();

// P1 #34: Trust proxy for correct client IP behind reverse proxy (needed for rate limiting)
app.set('trust proxy', 1);

// Correlation ID — must be first so all downstream middleware/handlers have access
app.use(requestIdMiddleware);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging and metrics (after body parsing, before routes)
app.use(requestTimingMiddleware);
app.use(requestLoggerMiddleware);
app.use(metricsMiddleware);
app.use(responseLoggerMiddleware);

// Rate limiting (skip for simulation bots and admin routes)
function getSimulationSecret(): string {
  return process.env.SIMULATION_SECRET || (process.env.JWT_SECRET || 'fallback').slice(0, 16);
}
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 req / 15 min — game pages fire 10-20 API calls each
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Simulation bots bypass via shared secret header
    if (req.headers['x-simulation-secret'] === getSimulationSecret()) return true;
    // Admin dashboard endpoints have their own auth — exempt from public rate limit
    if (req.path.startsWith('/api/admin/')) return true;
    return false;
  },
});
app.use('/api/', limiter);

// P2 #43: Deep health check — verifies DB and Redis connectivity
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, boolean> = { db: false, redis: false };
  const details: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err: any) {
    details.db = err.message;
  }

  try {
    if (redis) {
      await redis.ping();
      checks.redis = true;
    } else {
      details.redis = 'REDIS_URL not configured';
    }
  } catch (err: any) {
    details.redis = err.message;
  }

  // P3 #64: Check daily tick freshness
  let dailyTickStale = false;
  try {
    if (redis) {
      const lastTick = await redis.get('dailyTick:lastSuccess');
      if (lastTick) {
        const hoursSince = (Date.now() - parseInt(lastTick, 10)) / (1000 * 60 * 60);
        if (hoursSince > 25) {
          dailyTickStale = true;
          details.dailyTick = `Last success ${Math.round(hoursSince)}h ago`;
        }
      }
    }
  } catch { /* non-critical */ }

  const healthy = checks.db && checks.redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    ...(Object.keys(details).length > 0 && { details }),
    ...(dailyTickStale && { warnings: ['Daily tick has not run in over 25 hours'] }),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    build: 'v3',
  });
});

// P3 #63: Prometheus metrics endpoint (not behind rate limiter)
app.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getMetricsContentType());
    res.end(metrics);
  } catch (err) {
    res.status(500).end();
  }
});

// Route placeholder — routes will be added by feature prompts
app.get('/api', (_req, res) => {
  res.json({
    message: 'Welcome to the Realm of Crowns API',
    endpoints: {
      health: '/api/health',
      // Routes added as features are built
    },
  });
});

// API routes
app.use('/api', router);

// Serve client static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');

  // Explicit MIME types — Alpine/Docker can fail to resolve .js via mime package,
  // causing browsers to reject ES modules served as text/plain.
  const MIME_TYPES: Record<string, string> = {
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.map': 'application/json',
  };

  app.use(express.static(clientDist, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext];
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler for API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (with logging to database)
app.use(errorHandlerMiddleware);
