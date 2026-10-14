import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkillComments1760000013000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE skill_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      skill varchar(30) NOT NULL CHECK (skill IN ('grammar-vocab','writing','reading','listening','speaking')),
      author_id uuid NOT NULL REFERENCES users(id),
      content text NOT NULL CHECK (char_length(content)<=2000),
      parent_id uuid REFERENCES skill_comments(id),
      reply_to_id uuid REFERENCES skill_comments(id),
      created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CHECK ((parent_id IS NULL)=(reply_to_id IS NULL)),
      CHECK (id IS DISTINCT FROM parent_id AND id IS DISTINCT FROM reply_to_id),
      CHECK (deleted_at IS NOT NULL OR char_length(btrim(content))>0)
    )`);
    await runner.query(`CREATE INDEX skill_comments_roots ON skill_comments(skill,created_at DESC,id DESC) WHERE parent_id IS NULL`);
    await runner.query(`CREATE INDEX skill_comments_replies ON skill_comments(parent_id,created_at,id) WHERE parent_id IS NOT NULL`);
    // The database also rejects deeper nesting/cross-skill references, even outside the API.
    await runner.query(`CREATE FUNCTION validate_skill_comment_thread() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP='UPDATE' AND (NEW.skill,NEW.author_id,NEW.parent_id,NEW.reply_to_id)
          IS DISTINCT FROM (OLD.skill,OLD.author_id,OLD.parent_id,OLD.reply_to_id) THEN
          RAISE EXCEPTION 'Comment scope and thread are immutable';
        END IF;
        IF NEW.parent_id IS NOT NULL THEN
          IF NOT EXISTS (SELECT 1 FROM skill_comments WHERE id=NEW.parent_id AND parent_id IS NULL AND skill=NEW.skill)
            OR NOT EXISTS (SELECT 1 FROM skill_comments WHERE id=NEW.reply_to_id AND skill=NEW.skill
              AND (id=NEW.parent_id OR parent_id=NEW.parent_id)) THEN
            RAISE EXCEPTION 'Comments must have at most two levels in the same skill';
          END IF;
        END IF;
        RETURN NEW;
      END; $$`);
    await runner.query(`CREATE TRIGGER skill_comments_validate BEFORE INSERT OR UPDATE ON skill_comments
      FOR EACH ROW EXECUTE FUNCTION validate_skill_comment_thread()`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE skill_comments');
    await runner.query('DROP FUNCTION validate_skill_comment_thread()');
  }
}
