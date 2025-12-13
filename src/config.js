import { createSimpleCache, createCacheKey } from '@sequentialos/config-management';

const cacheManager = createSimpleCache({ ttl: parseInt(process.env.CACHE_TTL_MS || '30000') });

export const CONFIG = {
  server: {
    port: parseInt(process.env.PORT || '8003'),
    hostname: process.env.HOSTNAME || process.env.HOST || 'localhost',
    protocol: process.env.PROTOCOL || 'http',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
    requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '50mb',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true'
  },
  rateLimit: {
    http: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
    },
    websocket: {
      maxConnectionsPerIp: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '10'),
      cleanupIntervalMs: parseInt(process.env.WS_CLEANUP_INTERVAL_MS || '60000')
    }
  },
  requestLogger: {
    slowThresholdMs: parseInt(process.env.REQUEST_SLOW_THRESHOLD_MS || '1000'),
    maxLogSize: parseInt(process.env.REQUEST_LOG_MAX_SIZE || '1000'),
    userAgentMaxLength: parseInt(process.env.USER_AGENT_MAX_LENGTH || '100')
  },
  files: {
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || String(10 * 1024 * 1024)),
    maxNameLength: parseInt(process.env.MAX_FILE_NAME_LENGTH || '255')
  },
  tasks: {
    executionTimeoutMs: parseInt(process.env.TASK_EXECUTION_TIMEOUT_MS || '30000'),
    maxNameLength: parseInt(process.env.MAX_TASK_NAME_LENGTH || '100')
  },
  logs: {
    maxOperationLogSize: parseInt(process.env.OP_LOG_MAX_SIZE || '500'),
    defaultLogLimit: parseInt(process.env.DEFAULT_LOG_LIMIT || '100')
  },
  cache: {
    ttlMs: parseInt(process.env.CACHE_TTL_MS || '30000'),
    manager: cacheManager,
    createKey: (category, params) => createCacheKey(category, params)
  },
  hotReload: {
    enabled: process.env.HOT_RELOAD !== 'false',
    debounceDelay: 100
  }
};

export function getFromCache(key) {
  return cacheManager.get(key);
}

export function setCache(key, data) {
  cacheManager.set(key, data);
}

export function invalidateCache(pattern) {
  cacheManager.invalidate(pattern);
}
