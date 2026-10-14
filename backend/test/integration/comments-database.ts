import 'reflect-metadata';
import 'dotenv/config';
import assert = require('node:assert/strict');
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { AddSkillComments1760000013000 } from '../../src/database/migrations/1760000013000-AddSkillComments';
import { CommentsService } from '../../src/features/comments/comments.service';

async function main() {
  const db = new DataSource({ ...createDataSourceOptions(), logging: false });
  await db.initialize();
  const runner = db.createQueryRunner();
  await runner.connect(); await runner.startTransaction();
  try {
    const [exists] = await runner.query("SELECT to_regclass('public.skill_comments') AS name");
    if (!exists.name) await new AddSkillComments1760000013000().up(runner);
    const service = new CommentsService({ query: runner.query.bind(runner),
      transaction: (fn: (manager: EntityManager) => Promise<unknown>) => runner.manager.transaction(fn) } as unknown as DataSource);
    const alice = randomUUID(), bob = randomUUID();
    for (const [id, name] of [[alice, 'Alice'], [bob, 'Bob']]) await runner.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only-not-a-password',$3,'Comment',id,'ACTIVE' FROM roles WHERE code='STUDENT'`, [id, `comment-${id}@example.invalid`, name]);
    const root = await service.create(alice, { skill: 'writing', content: 'Writing root' });
    const self = await service.create(alice, { skill: 'writing', content: 'Self reply', replyToId: root.id });
    assert.equal(self.mention, null);
    const reply = await service.create(bob, { skill: 'writing', content: 'Bob replies', replyToId: root.id });
    assert.equal(reply.mention, 'Alice Comment');
    const nested = await service.create(alice, { skill: 'writing', content: 'Alice answers Bob', replyToId: reply.id });
    assert.equal(nested.parentId, root.id); assert.equal(nested.mention, 'Bob Comment');
    const ownNested = await service.create(bob, { skill: 'writing', content: 'Bob continues', replyToId: reply.id });
    assert.equal(ownNested.mention, null); assert.equal(ownNested.parentId, root.id);
    await assert.rejects(service.create(bob, { skill: 'reading', content: 'Cross-skill', replyToId: reply.id }), /no longer available/);
    await service.create(bob, { skill: 'reading', content: 'Reading only' });
    const writing = await service.list('writing', 1), reading = await service.list('reading', 1);
    assert.ok(!reading.comments.some((c: any) => c.id === root.id));
    assert.equal(writing.comments.find((c: any) => c.id === root.id).replies.length, 4);
    await assert.rejects(service.remove(bob, root.id, 'writing'), /no longer available/);
    // Savepoints allow SQL rejection checks without aborting the rollback-only test transaction.
    for (const [skill, parentId, targetId] of [['writing', reply.id, reply.id], ['reading', root.id, root.id]]) {
      await runner.query('SAVEPOINT reject_invalid_thread');
      await assert.rejects(runner.query(`INSERT INTO skill_comments(skill,author_id,content,parent_id,reply_to_id)
        VALUES($1,$2,'invalid',$3,$4)`, [skill, alice, parentId, targetId]), /at most two levels/);
      await runner.query('ROLLBACK TO SAVEPOINT reject_invalid_thread');
    }
    await service.remove(alice, root.id, 'writing');
    const deleted = (await service.list('writing', 1)).comments.find((c: any) => c.id === root.id);
    assert.equal(deleted.content, ''); assert.ok(deleted.deletedAt); assert.equal(deleted.replies.length, 4);
    await assert.rejects(service.create(bob, { skill: 'writing', content: 'Deleted target', replyToId: root.id }), /no longer available/);
    await service.create(alice, { skill: 'writing', content: 'Still answer live reply', replyToId: reply.id });
    for (let i = 0; i < 22; i++) await service.create(alice, { skill: 'speaking', content: `Page ${i}` });
    const page1 = await service.list('speaking', 1), page2 = await service.list('speaking', 2);
    assert.equal(page1.comments.length, 20); assert.ok(page1.hasMore);
    assert.ok(page2.comments.length >= 2);
    assert.ok(!page2.comments.some((c: any) => page1.comments.some((p: any) => p.id === c.id)));
    console.log('Comment database integration passed: skill isolation, mentions, two levels, ownership, deletion and pagination.');
  } finally {
    await runner.rollbackTransaction(); await runner.release(); await db.destroy();
  }
}
main().catch(error => {
  console.error('Comment database integration failed:', error?.code ?? error?.name,
    error?.query ? 'SQL statement failed' : error?.message);
  if (error?.driverError?.message) console.error(error.driverError.message);
  process.exitCode = 1;
});
