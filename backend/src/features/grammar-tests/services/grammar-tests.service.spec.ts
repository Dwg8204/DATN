import { GrammarTestsService } from './grammar-tests.service';
import { GrammarTestContentService } from './grammar-test-content.service';
import { GrammarTestsRepository } from '../repositories/grammar-tests.repository';
import { AuthUser } from '../../auth/types/auth-user.type';

describe('GrammarTestsService', () => {
  const actor: AuthUser = { id: 'actor', email: 'teacher@example.com', firstName: 'T', lastName: 'One', role: 'TEACHER', status: 'ACTIVE' };
  const repository = {
    findAggregate: jest.fn(), findOwner: jest.fn(), update: jest.fn(), publish: jest.fn(), archive: jest.fn(),
    create: jest.fn(), list: jest.fn(), listPublished: jest.fn(), findPublishedAggregate: jest.fn(),
  } as unknown as jest.Mocked<GrammarTestsRepository>;
  const content = new GrammarTestContentService();
  const service = new GrammarTestsService(repository, content);

  beforeEach(() => jest.clearAllMocks());

  it('maps an optimistic concurrency conflict to a stable API error', async () => {
    repository.update.mockResolvedValue({ outcome: 'VERSION_CONFLICT' });
    await expect(service.update('id', actor, {
      version: 1, mode: 'part1', details: { title: 'Draft' },
      parts: { 1: { instruction: '', questions: Array.from({ length: 25 }, (_, index) => ({ id: index + 1, text: '', options: ['', '', ''], correctAnswer: 0 })) } },
    }, {})).rejects.toMatchObject({ code: 'GRAMMAR_TEST_VERSION_CONFLICT', statusCode: 409 });
  });

  it('does not let a teacher access another teacher test', async () => {
    repository.findAggregate.mockResolvedValue({ id: 'id', mode: 'part1', details: { title: 'Test' }, parts: {}, status: 'DRAFT' });
    repository.findOwner.mockResolvedValue({ createdBy: 'someone-else', status: 'DRAFT' });
    await expect(service.get('id', actor)).rejects.toMatchObject({ code: 'GRAMMAR_TEST_FORBIDDEN', statusCode: 403 });
  });
});

