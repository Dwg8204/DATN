import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { CommentsService } from './comments.service';
import { CreateCommentDto, ListCommentsDto } from './comments.dto';

describe('Skill comments', () => {
  it('validates skill, trimmed content, reply UUID and pagination', async () => {
    const valid = plainToInstance(CreateCommentDto, { skill: 'writing', content: '  Hello  ' });
    expect(valid.content).toBe('Hello'); expect(await validate(valid)).toHaveLength(0);
    for (const input of [
      { skill: 'unknown', content: 'Hi' }, { skill: 'reading', content: '   ' },
      { skill: 'speaking', content: 'a'.repeat(2001) }, { skill: 'listening', content: 'Hi', replyToId: 'bad' },
    ]) expect((await validate(plainToInstance(CreateCommentDto, input))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(ListCommentsDto, { skill: 'reading', page: '2' }))).toHaveLength(0);
    expect((await validate(plainToInstance(ListCommentsDto, { skill: 'reading', page: '-1' }))).length).toBeGreaterThan(0);
  });

  it.each([null, 'root-id'])('flattens reply targets with parent %s into the root thread', async parent => {
    const manager = { query: jest.fn().mockResolvedValueOnce([{ id: 'target-id', parent_id: parent }])
      .mockResolvedValueOnce([{ id: 'new-id' }]).mockResolvedValueOnce([{ id: 'new-id' }]) };
    const db = { transaction: (fn: any) => fn(manager) } as unknown as DataSource;
    await new CommentsService(db).create('user-id', { skill: 'writing', content: 'Reply', replyToId: 'target-id' });
    expect(manager.query.mock.calls[0][1]).toEqual(['target-id', 'writing']);
    expect(manager.query.mock.calls[1][1]).toEqual(['writing', 'user-id', 'Reply', parent ?? 'target-id', 'target-id']);
  });

  it('rejects replies to a missing/deleted/other-skill target without inserting', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const service = new CommentsService({ transaction: (fn: any) => fn(manager) } as unknown as DataSource);
    await expect(service.create('user-id', { skill: 'reading', content: 'Reply', replyToId: 'target-id' }))
      .rejects.toMatchObject({ code: 'COMMENT_NOT_FOUND' });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });
});
