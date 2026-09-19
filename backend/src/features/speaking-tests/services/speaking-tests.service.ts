import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { CreateSpeakingTestDto, PublishSpeakingTestDto, UpdateSpeakingTestDto } from '../dto/save-speaking-test.dto';
import { ListSpeakingTestsQueryDto } from '../dto/list-speaking-tests-query.dto';
import { SpeakingActor, SpeakingAudit } from '../types/speaking-test.type';
import { SpeakingTestContentService } from './speaking-test-content.service';
import { SpeakingTestsRepository } from '../repositories/speaking-tests.repository';

@Injectable()
export class SpeakingTestsService {
  constructor(
    private readonly repository: SpeakingTestsRepository,
    private readonly contentService: SpeakingTestContentService,
  ) {}

  async list(query: ListSpeakingTestsQueryDto, actor: SpeakingActor) {
    return this.repository.list(query, actor);
  }

  async listPublished(query: ListSpeakingTestsQueryDto) {
    return this.repository.listPublished(query);
  }

  async getOne(id: string, actor: SpeakingActor) {
    const test = await this.repository.findAggregate(id);
    if (!test) throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found', 404);

    if (actor.role === 'TEACHER') {
      const owner = await this.repository.findOwner(id);
      if (owner?.createdBy !== actor.id) {
        throw new ApplicationError('FORBIDDEN', 'Cannot access tests created by other teachers', 403);
      }
    }
    return test;
  }

  async getPublished(id: string) {
    const test = await this.repository.findPublishedAggregate(id);
    if (!test) throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found or not published', 404);
    return this.contentService.learnerSafe(test);
  }

  async create(dto: CreateSpeakingTestDto, actor: SpeakingActor, audit: SpeakingAudit) {
    const aggregate = this.contentService.normalize(dto);
    this.contentService.assertDraftShape(aggregate);
    return this.repository.create(actor, aggregate, audit);
  }

  async update(id: string, dto: UpdateSpeakingTestDto, actor: SpeakingActor, audit: SpeakingAudit) {
    const aggregate = this.contentService.normalize(dto);
    this.contentService.assertDraftShape(aggregate);

    const result = await this.repository.update(id, actor, dto.version, aggregate, audit);
    if (result.outcome === 'NOT_FOUND') throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found', 404);
    if (result.outcome === 'FORBIDDEN') throw new ApplicationError('FORBIDDEN', 'Cannot modify tests created by other teachers', 403);
    if (result.outcome === 'VERSION_CONFLICT') throw new ApplicationError('VERSION_CONFLICT', 'Test was modified by someone else', 409);
    if (result.outcome !== 'SUCCESS') throw new ApplicationError('INTERNAL_SERVER_ERROR', 'Unknown repository error', 500);
    
    return result.value;
  }

  async publish(id: string, dto: PublishSpeakingTestDto, actor: SpeakingActor, audit: SpeakingAudit) {
    const test = await this.repository.findAggregate(id);
    if (!test) throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found', 404);

    this.contentService.assertPublishable(test);

    const result = await this.repository.publish(id, actor, dto.version, test, audit);
    if (result.outcome === 'NOT_FOUND') throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found', 404);
    if (result.outcome === 'FORBIDDEN') throw new ApplicationError('FORBIDDEN', 'Cannot modify tests created by other teachers', 403);
    if (result.outcome === 'VERSION_CONFLICT') throw new ApplicationError('VERSION_CONFLICT', 'Test was modified by someone else', 409);
    if (result.outcome !== 'SUCCESS') throw new ApplicationError('INTERNAL_SERVER_ERROR', 'Unknown repository error', 500);
    
    return result.value;
  }

  async archive(id: string, actor: SpeakingActor, audit: SpeakingAudit) {
    const result = await this.repository.archive(id, actor, audit);
    if (result.outcome === 'NOT_FOUND') throw new ApplicationError('SPEAKING_TEST_NOT_FOUND', 'Speaking test not found', 404);
    if (result.outcome === 'FORBIDDEN') throw new ApplicationError('FORBIDDEN', 'Cannot modify tests created by other teachers', 403);
  }
}
