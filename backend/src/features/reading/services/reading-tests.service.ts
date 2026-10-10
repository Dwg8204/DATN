import { Injectable, NotFoundException } from '@nestjs/common';
import { ReadingTestsRepository, TestRow, QuestionRow, TestSnapshotRow } from '../repositories/reading-tests.repository';
import { CreateReadingTestDto } from '../dto/create-reading-test.dto';
import { UpdateReadingTestDto } from '../dto/update-reading-test.dto';
import { QueryReadingTestDto } from '../dto/query-reading-test.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';

@Injectable()
export class ReadingTestsService {
  constructor(private readonly testsRepo: ReadingTestsRepository) {}

  async listTests(query: QueryReadingTestDto) {
    const { data, total } = await this.testsRepo.findTests(query);
    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getTestDetail(id: string): Promise<{ test: TestRow; questions: QuestionRow[] }> {
    const test = await this.testsRepo.findTestById(id);
    if (!test) throw new NotFoundException('Reading test not found');

    const questions = await this.testsRepo.findQuestionsByTestId(id);
    return { test, questions };
  }

  async createTest(creatorId: string, dto: CreateReadingTestDto): Promise<TestRow> {
    return this.testsRepo.createTest(creatorId, dto);
  }

  async updateTest(id: string, dto: UpdateReadingTestDto): Promise<TestRow> {
    const updated = await this.testsRepo.updateTest(id, dto);
    if (!updated) throw new NotFoundException('Reading test not found');
    return updated;
  }

  async addQuestion(dto: CreateQuestionDto): Promise<QuestionRow> {
    const test = await this.testsRepo.findTestById(dto.testId);
    if (!test) throw new NotFoundException('Reading test not found');

    return this.testsRepo.addQuestion(dto);
  }

  async publishSnapshot(id: string): Promise<TestSnapshotRow> {
    const test = await this.testsRepo.findTestById(id);
    if (!test) throw new NotFoundException('Reading test not found');

    return this.testsRepo.publishSnapshot(id);
  }
}
