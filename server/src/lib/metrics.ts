import client from 'prom-client';

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics();

/**
 * HTTP request duration histogram.
 * Labels: method, path, status_code
 */
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/**
 * Socket.io event counter.
 * Labels: event
 */
export const socketEventCounter = new client.Counter({
  name: 'socketio_events_total',
  help: 'Total number of Socket.io events',
  labelNames: ['event'] as const,
});

/**
 * Active WebSocket connections gauge.
 */
export const activeWsConnections = new client.Gauge({
  name: 'socketio_active_connections',
  help: 'Number of active WebSocket connections',
});

/**
 * Cron job execution counter.
 * Labels: job, result (success/failure)
 */
export const cronJobExecutions = new client.Counter({
  name: 'cron_job_executions_total',
  help: 'Total number of cron job executions',
  labelNames: ['job', 'result'] as const,
});

/**
 * Cron job duration histogram.
 * Labels: job
 */
export const cronJobDuration = new client.Histogram({
  name: 'cron_job_duration_seconds',
  help: 'Duration of cron job executions in seconds',
  labelNames: ['job'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
});

/**
 * Returns serialized Prometheus metrics for the /metrics endpoint.
 */
export async function getMetrics(): Promise<string> {
  return client.register.metrics();
}

/**
 * Returns the Prometheus content type header value.
 */
export function getMetricsContentType(): string {
  return client.register.contentType;
}
