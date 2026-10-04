import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { JwtAuthGuard } from '../../features/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../features/auth/guards/roles.guard';
import { PublishedGrammarTestsController } from '../../features/grammar-tests/controllers/grammar-tests.controller';
import { GrammarTestsService } from '../../features/grammar-tests/services/grammar-tests.service';
import { PublishedWritingTestsController } from '../../features/writing-tests/controllers/writing-tests.controller';
import { WritingTestsService } from '../../features/writing-tests/services/writing-tests.service';
import { PublishedListeningTestsController } from '../../features/listening-tests/controllers/listening-tests.controller';
import { ListeningTestsService } from '../../features/listening-tests/services/listening-tests.service';
import { ListeningAttemptService } from '../../features/listening-tests/services/listening-attempt.service';

describe('public published test catalogs', () => {
  let app: INestApplication;
  const listPublished = jest.fn().mockResolvedValue({ data: [{ id: 'published-test', status: 'PUBLISHED' }] });
  const getPublished = jest.fn();
  const startAttempt = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublishedGrammarTestsController, PublishedWritingTestsController, PublishedListeningTestsController],
      providers: [
        ...[GrammarTestsService, WritingTestsService, ListeningTestsService].map(provide => ({ provide, useValue: { listPublished, getPublished } })),
        { provide: ListeningAttemptService, useValue: { startAttempt } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: () => false })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  it.each(['grammar', 'writing', 'listening'])('allows guests to list %s exams and practice tests', async skill => {
    for (const purpose of ['EXAM', 'PRACTICE']) {
      await request(app.getHttpServer()).get(`/${skill}-tests`).query({ purpose }).expect(200);
      expect(listPublished).toHaveBeenCalledWith(expect.objectContaining({ purpose }));
    }
  });
  it.each(['grammar', 'writing', 'listening'])('keeps %s test details authenticated', async skill => {
    await request(app.getHttpServer()).get(`/${skill}-tests/123e4567-e89b-42d3-a456-426614174000`).expect(403);
    expect(getPublished).not.toHaveBeenCalled();
  });
  it('keeps starting Listening attempts authenticated', async () => {
    await request(app.getHttpServer()).post('/listening-tests/123e4567-e89b-42d3-a456-426614174000/attempts').expect(403);
    expect(startAttempt).not.toHaveBeenCalled();
  });
});
