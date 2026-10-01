import { Injectable, NotFoundException } from '@nestjs/common';
import { VocabularyEntriesRepository, VocabularyEntryRow } from '../repositories/vocabulary-entries.repository';
import { CreateEntryDto } from '../dto/create-entry.dto';
import { QueryEntryDto } from '../dto/query-entry.dto';

@Injectable()
export class VocabularyEntriesService {
  constructor(private readonly entriesRepo: VocabularyEntriesRepository) {}

  async listEntries(query: QueryEntryDto, userId?: string) {
    const { data, total } = await this.entriesRepo.findEntries(query, userId);
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

  async getEntryById(id: string): Promise<VocabularyEntryRow> {
    const entry = await this.entriesRepo.findById(id);
    if (!entry) throw new NotFoundException('Vocabulary entry not found');
    return entry;
  }

  async createEntry(userId: string | null, dto: CreateEntryDto): Promise<VocabularyEntryRow> {
    return this.entriesRepo.create(userId, dto);
  }
}
