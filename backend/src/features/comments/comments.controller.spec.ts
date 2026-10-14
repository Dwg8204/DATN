import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createValidationPipe } from '../../common/validation/create-validation.pipe';

describe('Comments HTTP contract', () => {
  let app: INestApplication;
  const service = { list: jest.fn().mockResolvedValue({ comments: [], total: 0 }),
    create: jest.fn().mockResolvedValue({ id: 'created' }), remove: jest.fn().mockResolvedValue({ id: 'removed' }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [CommentsController], providers: [{ provide: CommentsService, useValue: service }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        if (!req.headers['x-test-user']) return false;
        req.user = { id: 'authenticated-user' }; return true;
      } }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(createValidationPipe()); await app.init();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  it('allows public reading with validated skill and page', async () => {
    await request(app.getHttpServer()).get('/comments?skill=reading&page=2').expect(200);
    expect(service.list).toHaveBeenCalledWith('reading', 2);
    await request(app.getHttpServer()).get('/comments?skill=unsupported').expect(400);
  });
  it('requires authentication to create and delete', async () => {
    await request(app.getHttpServer()).post('/comments').send({ skill: 'writing', content: 'Hi' }).expect(403);
    await request(app.getHttpServer()).delete('/comments/11111111-1111-4111-8111-111111111111?skill=writing').expect(403);
    expect(service.create).not.toHaveBeenCalled(); expect(service.remove).not.toHaveBeenCalled();
  });
  it('gets author only from session and rejects client-supplied author/parent/mention', async () => {
    await request(app.getHttpServer()).post('/comments').set('x-test-user', 'yes').send({ skill: 'writing', content: '  Hi  ' }).expect(201);
    expect(service.create).toHaveBeenCalledWith('authenticated-user', expect.objectContaining({ content: 'Hi', skill: 'writing' }));
    for (const field of ['authorId', 'parentId', 'mention']) {
      await request(app.getHttpServer()).post('/comments').set('x-test-user', 'yes').send({ skill: 'writing', content: 'Hi', [field]: 'forged' }).expect(400);
    }
    expect(service.create).toHaveBeenCalledTimes(1);
  });
});
