import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import Redis from 'ioredis';

/** Optional cache only. PostgreSQL remains the source of truth for user data and jobs. */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client?: Redis;
  private lastWarning = 0;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (String(this.config.get('REDIS_ENABLED', false)) !== 'true') return;
    this.client = new Redis(this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
      connectTimeout: 800, commandTimeout: 500,
      retryStrategy: times => Math.min(times * 1000, 30000),
    });
    this.client.on('error', () => this.warn());
    this.client.on('ready', () => this.logger.log('Redis cache connected'));
    // Startup and API availability must not depend on Redis availability.
    void this.client.connect().catch(() => this.warn());
  }

  onModuleDestroy() { this.client?.disconnect(); }

  private warn() {
    if (Date.now() - this.lastWarning < 60000) return;
    this.lastWarning = Date.now();
    this.logger.warn('Redis cache unavailable; continuing without shared cache');
  }

  private key(namespace: string, input: string) {
    const digest = createHash('sha256').update(input).digest('hex');
    return `${this.config.get<string>('REDIS_KEY_PREFIX', 'aptimate:cache:v1')}:${namespace}:${digest}`;
  }

  /** Generation keys prevent a slow pre-edit loader from repopulating the current catalog. */
  async catalog<T>(skill: string, query: object, load: () => Promise<T>): Promise<T> {
    if (this.client?.status !== 'ready') return load();
    let generation: string;
    try {
      const generationKey = this.key('catalog-generation', 'published');
      await this.client.set(generationKey, randomUUID(), 'EX', 300, 'NX');
      const current = await this.client.get(generationKey);
      if (!current) return load();
      generation = current;
    } catch { this.warn(); return load(); }
    const normalized = Object.entries({ ...query, status: 'PUBLISHED' })
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return this.getOrLoad('published-catalog:v1', JSON.stringify([generation, skill, normalized]), 120, load);
  }

  async invalidateCatalog(): Promise<void> {
    if (this.client?.status !== 'ready') return;
    try {
      await this.client.set(this.key('catalog-generation', 'published'), randomUUID(), 'EX', 300);
    } catch { this.warn(); }
  }

  async getOrLoad<T>(namespace: string, input: string, ttlSeconds: number,
    load: () => Promise<T>, refresh = false, validate?: (value: unknown) => value is T): Promise<T> {
    const key = this.key(namespace, input);
    if (this.client?.status === 'ready') {
      try {
        if (refresh) await this.client.del(key);
        else {
          const stored = await this.client.get(key);
          if (stored !== null) {
            const value: unknown = JSON.parse(stored);
            if (value !== null && (!validate || validate(value))) return value as T;
            await this.client.del(key);
          }
        }
      } catch { this.warn(); }
    }
    // Provider errors propagate normally and are never cached.
    const value = await load();
    if (value != null && this.client?.status === 'ready') {
      try {
        const serialized = JSON.stringify(value);
        if (Buffer.byteLength(serialized) <= 256 * 1024) {
          await this.client.set(key, serialized, 'EX', Math.max(1, Math.floor(ttlSeconds)));
        }
      } catch { this.warn(); }
    }
    return value;
  }
}
