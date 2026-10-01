import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate, PaginatedResponse } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ListWritingTestsQueryDto } from '../dto/list-writing-tests-query.dto';
import { CreateWritingTestDto, UpdateWritingTestDto } from '../dto/save-writing-test.dto';
import { WritingTestsRepository, WritingRepositoryMutation } from '../repositories/writing-tests.repository';
import { WritingAudit, WritingTestAggregate, WritingTestSummary } from '../types/writing-test.type';
import { WritingTestContentService } from './writing-test-content.service';

@Injectable()
export class WritingTestsService {
  constructor(private readonly repository: WritingTestsRepository, private readonly content: WritingTestContentService) {}

  async list(query: ListWritingTestsQueryDto, actor: AuthUser): Promise<PaginatedResponse<WritingTestSummary>> {
    const result = await this.repository.list(query, actor);
    return paginate(result.tests, result.total, query);
  }

  async listPublished(query: ListWritingTestsQueryDto): Promise<PaginatedResponse<WritingTestSummary>> {
    const result = await this.repository.listPublished(query);
    return paginate(result.tests, result.total, query);
  }

  async get(id: string, actor: AuthUser): Promise<WritingTestAggregate> {
    const test = await this.repository.findAggregate(id);
    if (!test || test.status === 'ARCHIVED') this.notFound();
    await this.assertOwner(id, actor);
    return test;
  }

  async getPublished(id: string): Promise<unknown> {
    const test = await this.repository.findPublishedAggregate(id);
    if (!test) this.notFound();
    return this.content.learnerSafe(test);
  }

  async create(actor: AuthUser, dto: CreateWritingTestDto, audit: WritingAudit): Promise<WritingTestAggregate> {
    const test = this.content.normalize(dto);
    this.content.assertDraftShape(test);
    return this.repository.create(actor, test, audit);
  }

  async update(id: string, actor: AuthUser, dto: UpdateWritingTestDto, audit: WritingAudit): Promise<WritingTestAggregate> {
    const test = this.content.normalize(dto);
    this.content.assertDraftShape(test);
    return this.unwrap(await this.repository.update(id, actor, dto.version, test, audit));
  }

  async publish(id: string, actor: AuthUser, audit: WritingAudit): Promise<WritingTestAggregate> {
    const test = await this.repository.findAggregate(id);
    if (!test || test.status === 'ARCHIVED') this.notFound();
    await this.assertOwner(id, actor);
    this.content.assertPublishable(test);
    return this.unwrap(await this.repository.publish(id, actor, test.version!, test, audit));
  }

  async archive(id: string, actor: AuthUser, audit: WritingAudit): Promise<void> {
    this.unwrap(await this.repository.archive(id, actor, audit));
  }

  private async assertOwner(id: string, actor: AuthUser): Promise<void> {
    const owner = await this.repository.findOwner(id);
    if (!owner || owner.status === 'ARCHIVED') this.notFound();
    if (actor.role === 'TEACHER' && owner.createdBy !== actor.id) {
      throw new ApplicationError('WRITING_TEST_FORBIDDEN', 'You can only manage tests that you created.', 403);
    }
  }

  private unwrap(result: WritingRepositoryMutation): WritingTestAggregate {
    if (result.outcome === 'SUCCESS') return result.value;
    if (result.outcome === 'NOT_FOUND') this.notFound();
    if (result.outcome === 'FORBIDDEN') {
      throw new ApplicationError('WRITING_TEST_FORBIDDEN', 'You can only manage tests that you created.', 403);
    }
    return this.conflict();
  }

  private notFound(): never {
    throw new ApplicationError('WRITING_TEST_NOT_FOUND', 'Writing test not found.', 404);
  }

  private conflict(): never {
    throw new ApplicationError('WRITING_TEST_VERSION_CONFLICT', 'This test was changed in another session. Reload it before saving again.', 409);
  }
}

