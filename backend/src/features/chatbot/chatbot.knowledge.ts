import { Injectable } from '@nestjs/common';
import { KnowledgeSearchService } from '../retrieval/knowledge-search.service';
export { reciprocalRankFusion } from '../retrieval/hybrid-search';
@Injectable()
export class ChatbotKnowledge {
  constructor(private readonly knowledge: KnowledgeSearchService) {}
  async search(query: string, signal: AbortSignal) {
    const sources = await this.knowledge.search(query, { limit: 6 }, signal);
    return sources.length
      ? { sources }
      : {
          sources: [],
          notice:
            'Kho tài liệu đang được chuẩn bị. Không khẳng định quy định Aptis khi chưa có nguồn.',
        };
  }
}
