import { Request } from 'express';
import { prisma } from './prisma';
import { LogLevel } from '@prisma/client';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorLogInput {
  level?: LogLevel;
  category?: string;
  endpoint: string;
  statusCode: number;
  message: string;
  detail?: string;
  userId?: string;
  characterId?: string;
  requestBody?: unknown;
  userAgent?: string;
  ip?: string;
}

// ---------------------------------------------------------------------------
// Log level filtering
// ---------------------------------------------------------------------------

const LEVEL_PRIORITY: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function getConfiguredLevel(): string {
  return (process.env.LOG_LEVEL || 'INFO').toUpperCase();
}

function shouldLog(level: string): boolean {
  const configured = LEVEL_PRIORITY[getConfiguredLevel()] ?? 1;
  const requested = LEVEL_PRIORITY[level] ?? 0;
  return requested >= configured;
}

// ---------------------------------------------------------------------------
// Category detection from route path
// ---------------------------------------------------------------------------

const CATEGORY_MAP: [RegExp, string][] = [
  [/\/api\/characters/, 'character'],
  [/\/api\/combat/, 'combat'],
  [/\/api\/market/, 'market'],
  [/\/api\/crafting/, 'crafting'],
  [/\/api\/governance/, 'governance'],
  [/\/api\/auth/, 'auth'],
  [/\/api\/guilds/, 'guild'],
  [/\/api\/quests/, 'quest'],
  [/\/api\/elections/, 'election'],
  [/\/api\/buildings/, 'building'],
  [/\/api\/diplomacy/, 'diplomacy'],
  [/\/api\/caravans/, 'caravan'],
  [/\/api\/professions/, 'profession'],
  [/\/api\/travel/, 'travel'],
  [/\/api\/skills/, 'skill'],
  [/\/api\/messages/, 'message'],
  [/\/api\/friends/, 'social'],
  [/\/api\/items/, 'item'],
  [/\/api\/equipment/, 'equipment'],
  [/\/api\/admin/, 'admin'],
];

export function detectCategory(path: string): string {
  for (const [pattern, category] of CATEGORY_MAP) {
    if (pattern.test(path)) return category;
  }
  return 'general';
}

// ---------------------------------------------------------------------------
// Sensitive data sanitization
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = /password|token|secret|authorization|apikey|sessionid/i;

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(sanitizeBody);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Socket.io emission for real-time admin dashboard
// ---------------------------------------------------------------------------

let emitToAdmins: ((event: string, data: unknown) => void) | null = null;

export function setAdminEmitter(fn: (event: string, data: unknown) => void) {
  emitToAdmins = fn;
}

// ---------------------------------------------------------------------------
// Core logging functions
// ---------------------------------------------------------------------------

export async function logError(input: ErrorLogInput): Promise<void> {
  return writeLog({ ...input, level: 'ERROR' });
}

export async function logWarn(input: ErrorLogInput): Promise<void> {
  return writeLog({ ...input, level: 'WARN' });
}

export async function logInfo(input: ErrorLogInput): Promise<void> {
  return writeLog({ ...input, level: 'INFO' });
}

export async function logDebug(input: ErrorLogInput): Promise<void> {
  return writeLog({ ...input, level: 'DEBUG' });
}

async function writeLog(input: ErrorLogInput & { level: string }): Promise<void> {
  const level = (input.level || 'ERROR') as LogLevel;

  if (!shouldLog(level)) return;

  try {
    const entry = await prisma.errorLog.create({
      data: {
        level,
        category: input.category || 'general',
        endpoint: input.endpoint,
        statusCode: input.statusCode,
        message: input.message,
        detail: input.detail || null,
        userId: input.userId || null,
        characterId: input.characterId || null,
        requestBody: input.requestBody ? (sanitizeBody(input.requestBody) as object) : undefined,
        userAgent: input.userAgent || null,
        ip: input.ip || null,
      },
    });

    // Emit to admin dashboard in real time for ERROR and WARN
    if ((level === 'ERROR' || level === 'WARN') && emitToAdmins) {
      emitToAdmins('admin:error-log', entry);
    }
  } catch (err) {
    // Logger must never crash the request — fall back to console
    logger.error({ err, originalError: input.message }, 'Failed to write error log to database');
  }
}

// ---------------------------------------------------------------------------
// Helper: extract context from Express request
// ---------------------------------------------------------------------------

export function extractRequestContext(req: Request): {
  endpoint: string;
  category: string;
  userId?: string;
  characterId?: string;
  userAgent?: string;
  ip?: string;
  requestBody?: unknown;
} {
  const authReq = req as any;
  return {
    endpoint: `${req.method} ${req.originalUrl?.split('?')[0] || req.path}`,
    category: detectCategory(req.originalUrl || req.path),
    userId: authReq.user?.userId,
    characterId: authReq.character?.id,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.socket?.remoteAddress,
    requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
  };
}

// ---------------------------------------------------------------------------
// Convenience: log an error from a route catch block
// ---------------------------------------------------------------------------

export function logRouteError(req: Request, statusCode: number, message: string, error?: unknown): void {
  const ctx = extractRequestContext(req);
  const detail = error instanceof Error ? error.stack || error.message : error ? String(error) : undefined;

  // Fire-and-forget — don't await
  logError({
    ...ctx,
    statusCode,
    message,
    detail,
  });
}
