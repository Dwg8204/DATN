import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { ListReadingTestsQueryDto } from '../dto/list-reading-tests-query.dto';
import { CreateReadingTestDto, PublishReadingTestDto, UpdateReadingTestDto } from '../dto/save-reading-test.dto';
import { ReadingTestsRepository } from '../repositories/reading-tests.repository';
import { ReadingActor, ReadingAudit } from '../types/reading-test.type';
import { ReadingTestContentService } from './reading-test-content.service';

@Injectable()
export class ReadingTestsService {
  constructor(private readonly repository: ReadingTestsRepository, private readonly content: ReadingTestContentService) {}
  list(query: ListReadingTestsQueryDto, actor: ReadingActor) { return this.repository.list(query, actor); }
  listPublished(query: ListReadingTestsQueryDto) { return this.repository.listPublished(query); }
  async getOne(id: string, actor: ReadingActor) {
    const test = await this.repository.findAggregate(id);
    if (!test) this.notFound();
    if (actor.role === 'TEACHER' && (await this.repository.findOwner(id))?.createdBy !== actor.id) this.forbidden();
    return test;
  }
  async getPublished(id: string) {
    const test = await this.repository.findPublishedAggregate(id);
    if (!test) this.notFound();
    return this.content.learnerSafe(test);
  }
  async create(dto: CreateReadingTestDto, actor: ReadingActor, audit: ReadingAudit) {
    const test = this.content.normalize(dto); this.content.assertDraftShape(test);
    return this.repository.create(actor, test, audit);
  }
  async update(id: string, dto: UpdateReadingTestDto, actor: ReadingActor, audit: ReadingAudit) {
    const test = this.content.normalize(dto); this.content.assertDraftShape(test);
    return this.unwrap(await this.repository.update(id, actor, dto.version, test, audit));
  }
  async publish(id: string, dto: PublishReadingTestDto, actor: ReadingActor, audit: ReadingAudit) {
    const test = await this.getOne(id, actor); this.content.assertPublishable(test);
    return this.unwrap(await this.repository.publish(id, actor, dto.version, test, audit));
  }
  async archive(id: string, actor: ReadingActor, audit: ReadingAudit) {
    await this.unwrap(await this.repository.archive(id, actor, audit));
  }
  private unwrap(result: Awaited<ReturnType<ReadingTestsRepository['update']>>) {
    if (result.outcome === 'SUCCESS') return result.value;
    if (result.outcome === 'NOT_FOUND') this.notFound();
    if (result.outcome === 'FORBIDDEN') this.forbidden();
    if (result.outcome === 'VERSION_CONFLICT') throw new ApplicationError('VERSION_CONFLICT', 'Test was modified elsewhere. Reload and try again.', 409);
    throw new ApplicationError('INTERNAL_SERVER_ERROR', 'Unknown Reading test repository outcome.', 500);
  }
  private notFound(): never { throw new ApplicationError('READING_TEST_NOT_FOUND', 'Reading test not found.', 404); }
  private forbidden(): never { throw new ApplicationError('FORBIDDEN', 'You cannot modify this Reading test.', 403); }
}
