import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';
import { CatalogInvalidationInterceptor } from './catalog-invalidation.interceptor';
import { GrammarTestsService } from '../../features/grammar-tests/services/grammar-tests.service';
import { ListeningTestsService } from '../../features/listening-tests/services/listening-tests.service';
import { WritingTestsService } from '../../features/writing-tests/services/writing-tests.service';
import { ReadingTestsService } from '../../features/reading-tests/services/reading-tests.service';
import { SpeakingTestsService } from '../../features/speaking-tests/services/speaking-tests.service';
import { GrammarTestsController } from '../../features/grammar-tests/controllers/grammar-tests.controller';
import { ListeningTestsController } from '../../features/listening-tests/controllers/listening-tests.controller';
import { WritingTestsController } from '../../features/writing-tests/controllers/writing-tests.controller';
import { ReadingTestsController } from '../../features/reading-tests/controllers/reading-tests.controller';
import { SpeakingTestsController } from '../../features/speaking-tests/controllers/speaking-tests.controller';
import { AdminPlacementController } from '../../features/personalization/controllers/admin-placement.controller';
import { AdminReadingTestsController } from '../../features/reading/controllers/admin-reading-tests.controller';

it.each([GrammarTestsController, ListeningTestsController, WritingTestsController, ReadingTestsController,
  SpeakingTestsController, AdminPlacementController, AdminReadingTestsController])('invalidates after mutations through %p', controller => {
  expect(Reflect.getMetadata(INTERCEPTORS_METADATA, controller)).toContain(CatalogInvalidationInterceptor);
});

it.each([GrammarTestsService, ListeningTestsService, WritingTestsService, ReadingTestsService, SpeakingTestsService])(
  'routes only published lists through cache in %p', async Service => {
    const cache = new RedisCacheService(new ConfigService());
    const catalog = jest.spyOn(cache, 'catalog');
    const repository = {
      listPublished: jest.fn(async () => ({ tests: [{ id: 'published' }], total: 1 })),
      list: jest.fn(async () => ({ tests: [{ id: 'draft' }], total: 1 })),
    };
    const service = new Service(repository as never, {} as never, cache);
    const query = { page: 1, pageSize: 10 };
    const published = await service.listPublished(query);
    expect(JSON.stringify(published)).toContain('published');
    expect(catalog).toHaveBeenCalledTimes(1);
    await service.list(query, { id: 'admin', role: 'ADMIN' } as never);
    expect(catalog).toHaveBeenCalledTimes(1);
    expect(repository.list).toHaveBeenCalledTimes(1);
  });
