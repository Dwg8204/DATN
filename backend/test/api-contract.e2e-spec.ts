import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { createValidationPipe } from '../src/common/validation/create-validation.pipe';
import { dashboardRange } from '../src/features/admin-dashboard/helpers/dashboard-period.helper';
import { AdminDashboardRepository } from '../src/features/admin-dashboard/repositories/admin-dashboard.repository';
import { ListGrammarTestsQueryDto } from '../src/features/grammar-tests/dto/list-grammar-tests-query.dto';
import { GrammarTestsRepository } from '../src/features/grammar-tests/repositories/grammar-tests.repository';
import { ListWritingTestsQueryDto } from '../src/features/writing-tests/dto/list-writing-tests-query.dto';
import { WritingTestsRepository } from '../src/features/writing-tests/repositories/writing-tests.repository';

describe('API contract (HTTP)', () => {
  let app: INestApplication;
  let grammar: GrammarTestsRepository;
  let writing: WritingTestsRepository;
  let dashboard: AdminDashboardRepository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    grammar = module.get(GrammarTestsRepository);
    writing = module.get(WritingTestsRepository);
    dashboard = module.get(AdminDashboardRepository);
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reports a ready database using the configured API prefix', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it.each([
    '/api/v1/auth/me',
    '/api/v1/admin/dashboard',
    '/api/v1/admin/grammar-tests',
    '/api/v1/admin/writing-tests',
    '/api/v1/admin/users',
  ])('requires authentication at %s', async path => {
    const response = await request(app.getHttpServer()).get(path).expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns a useful validation error for an invalid registration', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({}).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fieldErrors.length).toBeGreaterThan(0);
  });

  it('queries paginated admin and published lists without loading complete test payloads', async () => {
    const grammarQuery = new ListGrammarTestsQueryDto();
    const writingQuery = new ListWritingTestsQueryDto();
    grammarQuery.pageSize = writingQuery.pageSize = 5;
    for (const result of await Promise.all([
      grammar.list(grammarQuery), grammar.listPublished(grammarQuery),
      writing.list(writingQuery), writing.listPublished(writingQuery),
    ])) {
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.tests.length).toBeLessThanOrEqual(5);
    }
  });

  it('queries all dashboard aggregates for a real 24-hour period', async () => {
    const range = dashboardRange('24-hours');
    const [totals, active, users, created, activity] = await Promise.all([
      dashboard.totals(range), dashboard.activeLearnerTrend(range), dashboard.newUserTrend(range),
      dashboard.testsCreated(range), dashboard.testActivity(range),
    ]);
    expect(Number(totals.active_current)).toBeGreaterThanOrEqual(0);
    expect([active, users, created, activity].every(Array.isArray)).toBe(true);
  });
});
