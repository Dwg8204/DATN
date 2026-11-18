import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { RedisCacheService } from './redis-cache.service';

/** Applied only to catalog administration controllers, after successful committed writes. */
@Injectable()
export class CatalogInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: RedisCacheService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const method = context.switchToHttp().getRequest<{ method: string }>().method;
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next.handle();
    return next.handle().pipe(mergeMap(async value => {
      await this.cache.invalidateCatalog();
      return value;
    }));
  }
}
