import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { GeminiGenerationInput, GeminiUsage } from './gemini.types';

@Injectable()
export class AiRequestRecorder {
  constructor(private readonly db: DataSource) {}

  async start(
    input: Pick<GeminiGenerationInput, 'model' | 'context'>,
    request: unknown,
    provider = 'gemini',
  ): Promise<string> {
    const id = randomUUID();
    const { context, model } = input;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
    await this.db.query(
      `INSERT INTO ai_requests(
      id,user_id,purpose,provider,model,chat_message_id,idempotency_key,
      request_fingerprint,config_snapshot,status,pricing_snapshot,currency,started_at)
      VALUES($1,$2,$3,$8,$4,$5,$1,$6,$7,'RUNNING',$9,'USD',now())`,
      [
        id,
        context.userId,
        context.purpose,
        model,
        context.chatMessageId ?? null,
        fingerprint,
        JSON.stringify({ promptVersion: context.promptVersion, model }),
        provider,
        JSON.stringify({ tier: provider === 'gemini' ? 'FREE' : 'UNPRICED' }),
      ],
    );
    return id;
  }

  async complete(
    id: string,
    usage: GeminiUsage,
    actualCost: number | null = 0,
  ) {
    await this.db.query(
      `UPDATE ai_requests SET status='COMPLETED',completed_at=now(),
      input_tokens=$2,output_tokens=$3,cached_input_tokens=$4,reasoning_tokens=$5,actual_cost=$6 WHERE id=$1`,
      [
        id,
        usage.promptTokenCount ?? null,
        usage.candidatesTokenCount ?? null,
        usage.cachedContentTokenCount ?? null,
        usage.thoughtsTokenCount ?? null,
        actualCost,
      ],
    );
  }

  async fail(id: string, code: string) {
    await this.db.query(
      "UPDATE ai_requests SET status='FAILED',error_code=$2,completed_at=now() WHERE id=$1",
      [id, code],
    );
  }
}
