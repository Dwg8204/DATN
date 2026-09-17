import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate, PaginatedResponse } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { CreateGrammarTestDto, PublishGrammarTestDto, UpdateGrammarTestDto } from '../dto/save-grammar-test.dto';
import { ListGrammarTestsQueryDto } from '../dto/list-grammar-tests-query.dto';
import { GrammarTestsRepository, RepositoryMutation } from '../repositories/grammar-tests.repository';
import { GrammarTestContentService } from './grammar-test-content.service';
import { GrammarAudit, GrammarTestAggregate, GrammarTestSummary } from '../types/grammar-test.type';

@Injectable()
export class GrammarTestsService {
  constructor(
    private readonly repository: GrammarTestsRepository,
    private readonly content: GrammarTestContentService,
  ) {}

  async list(query: ListGrammarTestsQueryDto, actor: AuthUser): Promise<PaginatedResponse<GrammarTestSummary>> {
    const result = await this.repository.list(query, actor);
    return paginate(result.tests, result.total, query);
  }

  async listPublished(query: ListGrammarTestsQueryDto): Promise<PaginatedResponse<GrammarTestSummary>> {
    const result = await this.repository.listPublished(query);
    return paginate(result.tests, result.total, query);
  }

  async get(id: string, actor: AuthUser): Promise<GrammarTestAggregate> {
    const aggregate = await this.repository.findAggregate(id);
    if (!aggregate || aggregate.status === 'ARCHIVED') this.notFound();
    await this.assertOwner(id, actor);
    return aggregate;
  }

  async getPublished(id: string): Promise<unknown> {
    const aggregate = await this.repository.findPublishedAggregate(id);
    if (!aggregate) this.notFound();
    return this.content.learnerSafe(aggregate);
  }

  async create(actor: AuthUser, dto: CreateGrammarTestDto, audit: GrammarAudit): Promise<GrammarTestAggregate> {
    const aggregate = this.content.normalize(dto);
    this.content.assertDraftShape(aggregate);
    return this.repository.create(actor, aggregate, audit);
  }

  async update(id: string, actor: AuthUser, dto: UpdateGrammarTestDto, audit: GrammarAudit): Promise<GrammarTestAggregate> {
    const aggregate = this.content.normalize(dto);
    this.content.assertDraftShape(aggregate);
    return this.unwrap(await this.repository.update(id, actor, dto.version, aggregate, audit));
  }

  async publish(id: string, actor: AuthUser, dto: PublishGrammarTestDto, audit: GrammarAudit): Promise<GrammarTestAggregate> {
    const aggregate = await this.repository.findAggregate(id);
    if (!aggregate || aggregate.status === 'ARCHIVED') this.notFound();
    await this.assertOwner(id, actor);
    if (aggregate.version !== dto.version) this.versionConflict();
    this.content.assertPublishable(aggregate);
    return this.unwrap(await this.repository.publish(id, actor, dto.version, aggregate, audit));
  }

  async archive(id: string, actor: AuthUser, audit: GrammarAudit): Promise<void> {
    this.unwrap(await this.repository.archive(id, actor, audit));
  }

  private async assertOwner(id: string, actor: AuthUser): Promise<void> {
    const owner = await this.repository.findOwner(id);
    if (!owner || owner.status === 'ARCHIVED') this.notFound();
    if (actor.role === 'TEACHER' && owner.createdBy !== actor.id) {
      throw new ApplicationError('GRAMMAR_TEST_FORBIDDEN', 'You can only manage tests that you created.', 403);
    }
  }

  private unwrap(result: RepositoryMutation): GrammarTestAggregate {
    if (result.outcome === 'SUCCESS') return result.value;
    if (result.outcome === 'NOT_FOUND') this.notFound();
    if (result.outcome === 'FORBIDDEN') {
      throw new ApplicationError('GRAMMAR_TEST_FORBIDDEN', 'You can only manage tests that you created.', 403);
    }
    return this.versionConflict();
  }

  private notFound(): never {
    throw new ApplicationError('GRAMMAR_TEST_NOT_FOUND', 'Grammar & Vocabulary test not found.', 404);
  }

  private versionConflict(): never {
    throw new ApplicationError(
      'GRAMMAR_TEST_VERSION_CONFLICT',
      'This test was changed in another session. Reload it before saving again.',
      409,
    );
  }
}
