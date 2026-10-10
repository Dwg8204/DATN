import 'reflect-metadata';
import 'dotenv/config';
import { Controller, Get, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { JwtAuthGuard } from '../../src/features/auth/guards/jwt-auth.guard';
import { StudyController } from '../../src/features/vocabulary/controllers/study.controller';
import { DictationController } from '../../src/features/vocabulary/controllers/dictation.controller';
import { UserNotebookController } from '../../src/features/vocabulary/controllers/user-notebook.controller';
import { VocabularyFoldersController } from '../../src/features/vocabulary/controllers/vocabulary-folders.controller';
import { StudyRepository } from '../../src/features/vocabulary/repositories/study.repository';
import { DictationRepository } from '../../src/features/vocabulary/repositories/dictation.repository';
import { UserNotebookRepository } from '../../src/features/vocabulary/repositories/user-notebook.repository';
import { VocabularyFoldersRepository } from '../../src/features/vocabulary/repositories/vocabulary-folders.repository';
import { DictationService } from '../../src/features/vocabulary/services/dictation.service';
import { UserNotebookService } from '../../src/features/vocabulary/services/user-notebook.service';
import { VocabularyFoldersService } from '../../src/features/vocabulary/services/vocabulary-folders.service';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

// Isolated UI fixture, localhost only. Production JWT authentication is unchanged.
// Only one newly generated user is accessible. All fixture writes are rolled back on quit.
const user = { id: randomUUID(), email: 'dictation-ui@example.invalid', firstName: 'Dictation', lastName: 'UI test', role: 'STUDENT', status: 'ACTIVE' };
@Controller()
class SessionFixture {
  @Get('profile/me') profile() { return user; }
  @Get('auth/me') me() { return user; }
  @Get('notifications') notifications() { return { data: [], unreadCount: 0 }; }
}
async function main() {
  const connection = new DataSource({ ...createDataSourceOptions(), logging: false });
  await connection.initialize();
  const runner = connection.createQueryRunner(); await runner.connect(); await runner.startTransaction();
  let app;
  try {
    await runner.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only-not-a-password',$3,$4,id,'ACTIVE' FROM roles WHERE code='STUDENT'`, [user.id, `${user.id}@example.invalid`, user.firstName, user.lastName]);
    // One rollback-only connection cannot run overlapping savepoints. Serialize
    // complete operations here; the production DataSource uses a normal pool.
    let queue = Promise.resolve();
    const enqueue = <T>(operation: () => Promise<T>) => {
      const pending = queue.then(operation);
      queue = pending.then(() => undefined, () => undefined);
      return pending;
    };
    const db = { query: (sql: string, params?: unknown[]) => enqueue(() => runner.query(sql, params)),
      transaction: (op: (m: EntityManager) => Promise<unknown>) => enqueue(() => runner.manager.transaction(op)) } as unknown as DataSource;
    const module = await Test.createTestingModule({
      controllers: [StudyController, DictationController, UserNotebookController, VocabularyFoldersController, SessionFixture],
      providers: [{ provide: DataSource, useValue: db }, StudyRepository, DictationRepository, UserNotebookRepository,
        VocabularyFoldersRepository, DictationService, UserNotebookService, VocabularyFoldersService],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) { context.switchToHttp().getRequest().user = user; return true; } }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1'); app.useGlobalPipes(createValidationPipe()); app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors({ origin: 'http://localhost:5180', credentials: true });
    await app.listen(3033, '127.0.0.1');
    console.log('UI fixture ready at http://localhost:3033/api/v1. Type quit to stop and roll back all fixture data.');
    await new Promise<void>(resolve => {
      process.once('SIGINT', resolve); process.once('SIGTERM', resolve);
      process.stdin.once('end', resolve);
      process.stdin.on('data', chunk => { if (chunk.toString().includes('quit')) resolve(); }); process.stdin.resume();
    });
  } finally {
    await app?.close(); await runner.rollbackTransaction(); await runner.release(); await connection.destroy();
    console.log('UI fixture stopped; test data rolled back.');
    process.stdin.pause();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'UI fixture failed'); process.exitCode = 1; });
