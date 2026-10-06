import 'reflect-metadata';
import 'dotenv/config';
import assert = require('node:assert/strict');
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { StudyRepository } from '../../src/features/vocabulary/repositories/study.repository';
import { DictationRepository } from '../../src/features/vocabulary/repositories/dictation.repository';
import { DictationService } from '../../src/features/vocabulary/services/dictation.service';
import { UserNotebookRepository } from '../../src/features/vocabulary/repositories/user-notebook.repository';
import { VocabularyFoldersRepository } from '../../src/features/vocabulary/repositories/vocabulary-folders.repository';
import { StudyKind } from '../../src/features/vocabulary/dto/study-item.dto';
import { VocabularyRating } from '../../src/features/vocabulary/dto/flashcard-review.dto';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { StudyItemDto } from '../../src/features/vocabulary/dto/study-item.dto';

// Real PostgreSQL checks in one rollback-only transaction: no test users/items remain.
async function main() {
  const connection = new DataSource({ ...createDataSourceOptions(), logging: false });
  await connection.initialize();
  const runner = connection.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const db = { query: runner.query.bind(runner),
      transaction: (operation: (m: EntityManager) => Promise<unknown>) => runner.manager.transaction(operation) } as unknown as DataSource;
    const study = new StudyRepository(db), dictation = new DictationRepository(db);
    const grading = new DictationService(dictation), notebook = new UserNotebookRepository(db);
    const folders = new VocabularyFoldersRepository(db);
    const userA = randomUUID(), userB = randomUUID();
    for (const id of [userA, userB]) await runner.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only-not-a-password','DB integration','Test',id,'ACTIVE' FROM roles WHERE code='STUDENT'`, [id, `study-${id}@example.invalid`]);
    const a = await study.state(userA), b = await study.state(userB);
    assert.equal(a.words.length, 10); assert.equal(a.exercises.length, 5);
    assert.equal((await study.state(userA)).words.length, 10, 'bootstrap is idempotent');
    assert.notEqual(a.words[0].id, b.words[0].id, 'notebook items belong to individual users');

    const folder = await folders.create(userA, { name: 'Integration private' });
    assert.equal((await folders.create(userA, { name: 'integration private' })).id, folder.id, 'topic creation can be retried');
    const wordDto = { kind: StudyKind.WORD, folderId: folder.id, word: 'unique test word', meaning: 'từ thử', clientRequestId: randomUUID() };
    const word = await study.create(userA, wordDto);
    assert.equal((await study.create(userA, wordDto)).id, word.id, 'item creation can be retried');
    await assert.rejects(study.create(userA, { ...wordDto, meaning: 'different' }), /identifier already used/);
    await assert.rejects(study.create(userB, { ...wordDto, clientRequestId: randomUUID() }), /Topic not found/);
    await assert.rejects(study.update(userB, word.id, wordDto), /not found/);
    await assert.rejects(study.remove(userB, word.id), /not found/);
    assert.ok(!(await study.state(userB)).words.some(w => w.id === word.id), 'no cross-account word leakage');
    await study.update(userA, word.id, { ...wordDto, word: 'edited test word' });
    assert.equal((await study.state(userA)).words.find(w => w.id === word.id)?.word, 'edited test word');
    const review = { notebookItemId: word.id, clientEventId: randomUUID(), rating: VocabularyRating.KNOWN };
    assert.equal(await notebook.recordReviewEvent(userB, review), false);
    await notebook.recordReviewEvent(userA, review); await notebook.recordReviewEvent(userA, review);
    const [reviewed] = await runner.query('SELECT review_count FROM user_notebook_items WHERE id=$1', [word.id]);
    assert.equal(reviewed.review_count, 1, 'review retry does not increment twice');
    assert.equal((await study.state(userA)).ratings[word.id], 'know');

    const sentence = await study.create(userA, { kind: StudyKind.SENTENCE, folderId: folder.id, word: 'Practice test', meaning: "I don't give up." });
    const exercise = (await study.state(userA)).exercises.find(e => e.notebookId === sentence.id)!;
    assert.equal(await dictation.findExerciseById(exercise.id, userB), null);
    await assert.rejects(grading.submitAttempt(userB, { exerciseId: exercise.id, typedText: "I don't give up." }), /not found/);
    const submission = { exerciseId: exercise.id, typedText: "I don't give up.", hintUsed: false, playbackRate: 0.85, playbackCount: 2, clientEventId: randomUUID() };
    const good = await grading.submitAttempt(userA, submission);
    assert.equal(Number(good.data.accuracy), 100);
    assert.equal((await grading.submitAttempt(userA, submission)).data.id, good.data.id);
    await assert.rejects(grading.submitAttempt(userA, { ...submission, typedText: 'changed' }), /identifier already used/);
    await grading.submitAttempt(userA, { ...submission, typedText: 'wrong', clientEventId: randomUUID() });
    const p = (await study.state(userA)).progress[exercise.id] as { attempts: number; lastAccuracy: number; bestAccuracy: number };
    assert.deepEqual([p.attempts, p.lastAccuracy, p.bestAccuracy], [2, 0, 100], 'DB returns latest score, not highest');
    const [snapshot] = await runner.query('SELECT exercise_snapshot FROM dictation_attempts WHERE id=$1', [good.data.id]);
    assert.equal(snapshot.exercise_snapshot.transcript, "I don't give up.");

    const seed = a.exercises[0];
    await study.update(userA, seed.notebookId, { kind: StudyKind.SENTENCE, folderId: seed.folderId, word: 'My version', meaning: 'A personal sentence.' });
    assert.equal((await study.state(userB)).exercises.find(e => e.id === seed.id)?.title, seed.title, 'editing a seed does not change other users');
    const personalCopy = (await study.state(userA)).exercises.find(e => e.notebookId === seed.notebookId)!;
    assert.notEqual(personalCopy.id, seed.id);
    assert.equal(await dictation.findExerciseById(personalCopy.id, userB), null);

    const legacy = { topics: ['Old browser topic'], items: [{ legacyId: 'browser-sentence', kind: StudyKind.SENTENCE,
      word: 'Old browser sentence', meaning: 'I keep my old data.', topic: 'Old browser topic',
      progress: { attempts: 3, lastAccuracy: 60, bestAccuracy: 90 } }] };
    assert.equal((await study.importBrowser(userA, legacy)).imported, 1);
    assert.equal((await study.importBrowser(userA, legacy)).imported, 0, 'legacy import is idempotent');
    const imported = (await study.state(userA)).exercises.find(e => e.legacyId === 'browser-sentence')!;
    assert.equal(((await study.state(userA)).progress[imported.id] as { imported: boolean }).imported, true);
    await grading.submitAttempt(userA, { exerciseId: imported.id, typedText: 'wrong', clientEventId: randomUUID() });
    assert.equal(((await study.state(userA)).progress[imported.id] as { lastAccuracy: number }).lastAccuracy, 0, 'new graded result wins over imported score');

    await study.remove(userA, sentence.id);
    assert.equal(await dictation.findExerciseById(exercise.id, userA), null, 'deleted personal sentence is unavailable');
    await study.remove(userA, a.words[0].id);
    assert.ok(!(await study.state(userA)).words.some(w => w.id === a.words[0].id), 'bootstrap does not resurrect deleted seeds');
    await study.remove(userA, word.id);
    assert.ok(!(await study.state(userA)).words.some(w => w.id === word.id));

    const validation = createValidationPipe();
    await assert.rejects(validation.transform({ ...wordDto, word: '  ' }, { type: 'body', metatype: StudyItemDto }), /should not be empty/);
    await assert.rejects(validation.transform({ ...wordDto, userId: userB }, { type: 'body', metatype: StudyItemDto }), /not an accepted field/);
    console.log('PASS: PostgreSQL CRUD, account isolation, copy-on-write, server grading/latest score, retry deduplication, import, deletion, DTO validation.');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await connection.destroy();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : 'Integration check failed'); process.exitCode = 1; });
