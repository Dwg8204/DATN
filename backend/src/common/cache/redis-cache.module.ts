import { CatalogInvalidationInterceptor } from './catalog-invalidation.interceptor';
import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({ providers: [RedisCacheService, CatalogInvalidationInterceptor], exports: [RedisCacheService, CatalogInvalidationInterceptor] })
export class RedisCacheModule {}
