import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { TestAttemptsService } from '../../test-attempts/services/test-attempts.service';

@Injectable()
export class ListeningAttemptService {
  constructor(private readonly sharedAttempts: TestAttemptsService) {}

  async startAttempt(testId: string, mode: string, actor: AuthUser) {
    const started = await this.sharedAttempts.start(testId, randomUUID(), actor, mode, 'LISTENING');
    return { attemptId: started.attemptId };
  }
}
