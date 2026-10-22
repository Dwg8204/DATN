import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SpeakingAiConfig } from './speaking-ai-config.service';
import { ConfigService } from '@nestjs/config';

/** Only used for sealed submissions. A session lock deduplicates ASR across workers. */
@Injectable()
export class SharedSpeakingTranscript {
  active = false;
  constructor(private readonly db: DataSource, private readonly config: SpeakingAiConfig, private readonly settings: ConfigService) {}
  get enabled() { return this.active && String(this.settings.get('GROQ_REFERENCE_ENABLED','false'))==='true'; }
  async get(attemptId: string, key: string, load: () => Promise<Buffer>): Promise<string> {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    const lock = `transcript:${attemptId}:${key}`;
    let locked = false;
    try {
      for (let index=0;index<120;index++) {
        const [gate] = await runner.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS acquired', [lock]);
        if (gate.acquired) { locked=true; break; }
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
      if (!locked) throw new Error('GROQ_HTTP_429');
      const [cached] = await runner.query('SELECT transcript FROM speaking_transcript_cache WHERE attempt_id=$1 AND response_key=$2', [attemptId,key]);
      if (cached) return cached.transcript;
      const bytes = await load();
      const form = new FormData();
      form.set('file', new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }), 'recording.mp3');
      form.set('model','whisper-large-v3'); form.set('language','en'); form.set('temperature','0');
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method:'POST', headers:{Authorization:`Bearer ${this.config.groqKey}`}, body:form,
        signal:AbortSignal.timeout(90000), redirect:'error',
      });
      if (!response.ok) throw new Error(`GROQ_HTTP_${response.status}`);
      const value = await response.json() as {text?: unknown};
      if (typeof value.text !== 'string' || value.text.length > 20000) throw new Error('GROQ_INVALID_RESPONSE');
      const transcript = value.text.trim();
      await runner.query('INSERT INTO speaking_transcript_cache(attempt_id,response_key,transcript) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [attemptId,key,transcript]);
      return transcript;
    } finally {
      if (locked) await runner.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [lock]);
      await runner.release();
    }
  }
}
