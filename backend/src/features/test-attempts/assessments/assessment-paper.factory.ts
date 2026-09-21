import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { AssessmentPaper, AssessableItem, SkillComponent } from '../types/attempt.type';
import { PaperAdapter } from './adapters/paper-adapter.type';
import { grammarPaperAdapter } from './adapters/grammar-paper.adapter';
import { listeningPaperAdapter } from './adapters/listening-paper.adapter';
import { writingPaperAdapter } from './adapters/writing-paper.adapter';

const adapters: Partial<Record<SkillComponent, PaperAdapter>> = {
  GRAMMAR_VOCAB: grammarPaperAdapter,
  LISTENING: listeningPaperAdapter,
  WRITING: writingPaperAdapter,
};

@Injectable()
export class AssessmentPaperFactory {
  private readonly cache = new Map<string, Promise<AssessmentPaper>>();
  private readonly maxEntries = 100;

  async getOrBuild(snapshotId: string, component: SkillComponent, load: () => Promise<Record<string, unknown>>): Promise<AssessmentPaper> {
    const existing = this.cache.get(snapshotId);
    if (existing) {
      this.cache.delete(snapshotId);
      this.cache.set(snapshotId, existing);
      return existing;
    }
    const pending = load().then(snapshot => this.build(component, snapshot));
    this.cache.set(snapshotId, pending);
    if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value!);
    try { return await pending; } catch (error) {
      if (this.cache.get(snapshotId) === pending) this.cache.delete(snapshotId);
      throw error;
    }
  }

  build(component: SkillComponent, snapshot: Record<string, unknown>): AssessmentPaper {
    const adapter = adapters[component];
    if (!adapter) throw new ApplicationError('ATTEMPT_COMPONENT_UNSUPPORTED', 'This skill is not yet available for the shared attempt flow.', 422);
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.parts || typeof snapshot.parts !== 'object' ||
        !snapshot.details || typeof snapshot.details !== 'object' || typeof snapshot.mode !== 'string') {
      throw this.invalidSnapshot();
    }
    let assembled: ReturnType<PaperAdapter>;
    try {
      assembled = adapter(snapshot);
    } catch {
      throw this.invalidSnapshot();
    }
    const { parts, items } = assembled;
    if (!items.length) throw this.invalidSnapshot();
    const expectedParts = snapshot.mode === 'full'
      ? component === 'GRAMMAR_VOCAB' ? [1, 2] : [1, 2, 3, 4]
      : /^part[1-4]$/.test(snapshot.mode) ? [Number(snapshot.mode.slice(4))] : [];
    const actualParts = Object.keys(parts).map(Number).sort((a, b) => a - b);
    if (expectedParts.join(',') !== actualParts.join(',')) throw this.invalidSnapshot();
    if (component === 'LISTENING') {
      const required: Record<number, number> = { 1: 13, 2: 4, 3: 4, 4: 4 };
      if (actualParts.some(part => items.filter(item => item.partNumber === part).length !== required[part])) {
        throw this.invalidSnapshot();
      }
    }
    if (component === 'GRAMMAR_VOCAB') {
      const required: Record<number, number> = { 1: 25, 2: 25 };
      if (actualParts.some(part => items.filter(item => item.partNumber === part).length !== required[part])) {
        throw this.invalidSnapshot();
      }
    }
    if (new Set(items.map(item => item.key)).size !== items.length || items.some(item => !this.validItem(item))) {
      throw this.invalidSnapshot();
    }
    const details = snapshot.details as { title?: unknown };
    return { component, title: typeof details.title === 'string' ? details.title : '', mode: snapshot.mode, parts, items };
  }

  private validItem(item: AssessableItem): boolean {
    if (item.kind === 'TEXT' || item.kind === 'AUDIO') return true;
    return !!item.correctOptionId && !!item.optionIds?.includes(item.correctOptionId) && item.points > 0;
  }

  private invalidSnapshot(): ApplicationError {
    return new ApplicationError('ATTEMPT_INVALID_SNAPSHOT', 'Published test contains invalid questions or parts.', 422);
  }
}
