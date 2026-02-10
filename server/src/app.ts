import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import router from './routes';

export const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Realm of Crowns',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
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
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// 404 handler for API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});
