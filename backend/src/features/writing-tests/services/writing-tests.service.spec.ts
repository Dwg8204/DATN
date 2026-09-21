import { AuthUser } from '../../auth/types/auth-user.type';
import { WritingTestsRepository } from '../repositories/writing-tests.repository';
import { WritingTestContentService } from './writing-test-content.service';
import { WritingTestsService } from './writing-tests.service';

describe('WritingTestsService', () => {
  const actor: AuthUser = { id: 'teacher-id', email: 'teacher@example.com', firstName: 'T', lastName: 'One', role: 'TEACHER', status: 'ACTIVE' };
  const repository = {
    findAggregate: jest.fn(), findOwner: jest.fn(), update: jest.fn(), publish: jest.fn(), archive: jest.fn(),
    create: jest.fn(), list: jest.fn(), listPublished: jest.fn(), findPublishedAggregate: jest.fn(),
  } as unknown as jest.Mocked<WritingTestsRepository>;
  const service = new WritingTestsService(repository, new WritingTestContentService());

  beforeEach(() => jest.clearAllMocks());

  it('returns a conflict when a stale test version is saved', async () => {
    repository.update.mockResolvedValue({ outcome: 'VERSION_CONFLICT' });
    const dto = {
      version: 1,
      mode: 'part1' as const,
      details: { title: 'Writing practice', pictureUrl: '' },
      parts: { 1: { context: '', questions: ['', '', '', '', ''], sampleAnswers: ['', '', '', '', ''] } },
    };
    await expect(service.update('test-id', actor, dto, {})).rejects.toMatchObject({ code: 'WRITING_TEST_VERSION_CONFLICT', statusCode: 409 });
  });

  it('prevents a teacher from loading another teacher’s test', async () => {
    repository.findAggregate.mockResolvedValue({ id: 'test-id', mode: 'part1', details: { title: 'Writing practice' }, parts: {}, status: 'DRAFT' });
    repository.findOwner.mockResolvedValue({ createdBy: 'other-teacher', status: 'DRAFT' });
    await expect(service.get('test-id', actor)).rejects.toMatchObject({ code: 'WRITING_TEST_FORBIDDEN', statusCode: 403 });
  });

  it('publishes the current persisted version without a version in the request body', async () => {
    const aggregate = {
      id: 'test-id', version: 6, status: 'DRAFT' as const, mode: 'part1' as const,
      details: { title: 'Complete writing test', pictureUrl: '' },
      parts: { 1: {
        context: 'Answer all questions about your language club.',
        questions: ['Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5'],
        sampleAnswers: ['One', 'Two', 'Three', 'Four', 'Five'],
      } },
    };
    repository.findAggregate.mockResolvedValue(aggregate);
    repository.findOwner.mockResolvedValue({ createdBy: actor.id, status: 'DRAFT' });
    repository.publish.mockResolvedValue({ outcome: 'SUCCESS', value: { ...aggregate, status: 'PUBLISHED' } });

    await expect(service.publish('test-id', actor, {})).resolves.toMatchObject({ status: 'PUBLISHED' });
    expect(repository.publish).toHaveBeenCalledWith('test-id', actor, 6, aggregate, {});
  });
});

