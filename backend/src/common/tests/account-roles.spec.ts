import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { createValidationPipe } from '../validation/create-validation.pipe';
import { JwtAuthGuard } from '../../features/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../features/auth/guards/roles.guard';
import { UsersController } from '../../features/users/controllers/users.controller';
import { UsersService } from '../../features/users/services/users.service';
import { GrammarTestsController } from '../../features/grammar-tests/controllers/grammar-tests.controller';
import { GrammarTestsService } from '../../features/grammar-tests/services/grammar-tests.service';
import { WritingTestsController } from '../../features/writing-tests/controllers/writing-tests.controller';
import { WritingTestsService } from '../../features/writing-tests/services/writing-tests.service';
import { ListeningTestsController } from '../../features/listening-tests/controllers/listening-tests.controller';
import { ListeningTestsService } from '../../features/listening-tests/services/listening-tests.service';
import { ReadingTestsController } from '../../features/reading-tests/controllers/reading-tests.controller';
import { ReadingTestsService } from '../../features/reading-tests/services/reading-tests.service';
import { SpeakingTestsController } from '../../features/speaking-tests/controllers/speaking-tests.controller';
import { SpeakingTestsService } from '../../features/speaking-tests/services/speaking-tests.service';

describe('two-role HTTP authorization', () => {
  let app: INestApplication;
  const list = jest.fn().mockResolvedValue({ data: [] });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController, GrammarTestsController, WritingTestsController, ListeningTestsController,
        ReadingTestsController, SpeakingTestsController],
      providers: [RolesGuard, ...[UsersService, GrammarTestsService, WritingTestsService, ListeningTestsService,
        ReadingTestsService, SpeakingTestsService].map(provide => ({ provide, useValue: { list } }))],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const role = req.headers['x-test-role'];
      if (!role) throw new UnauthorizedException();
      req.user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role };
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => list.mockClear());

  it.each(['/admin/users', '/admin/grammar-tests', '/admin/writing-tests', '/admin/listening-tests',
    '/reading-tests', '/speaking-tests'])('protects %s with the real role guard', async path => {
    await request(app.getHttpServer()).get(path).expect(401);
    for (const role of ['STUDENT', 'TEACHER', 'UNKNOWN']) {
      await request(app.getHttpServer()).get(path).set('x-test-role', role).expect(403);
    }
    expect(list).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get(path).set('x-test-role', 'ADMIN').expect(200);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('removes account creation and role promotion endpoints even for administrators', async () => {
    await request(app.getHttpServer()).post('/admin/users').set('x-test-role', 'ADMIN')
      .send({ role: 'TEACHER' }).expect(404);
    await request(app.getHttpServer()).patch('/admin/users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/role')
      .set('x-test-role', 'ADMIN').send({ role: 'TEACHER' }).expect(404);
  });

  it('rejects the retired role as an account filter', async () => {
    await request(app.getHttpServer()).get('/admin/users?role=TEACHER').set('x-test-role', 'ADMIN').expect(400);
    expect(list).not.toHaveBeenCalled();
  });
});
