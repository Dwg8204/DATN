import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandGrammarTopics1760000020000 implements MigrationInterface {
  name = "ExpandGrammarTopics1760000020000";
  async up(q: QueryRunner) {
    const topics = [
      ["question-tags", "Question tags"],
      ["past-perfect", "Past perfect simple and continuous"],
      ["indirect-questions", "Indirect questions and noun clauses"],
      ["verb-patterns", "Verb patterns: gerunds and infinitives"],
      ["past-continuous", "Past continuous"],
      ["conjunctions", "Conjunctions and linking clauses"],
      ["relative-clauses", "Relative clauses"],
      ["adjectives-adverbs", "Adjectives, adverbs and comparison"],
      ["subject-verb-agreement", "Subject–verb agreement"],
      ["participle-clauses", "Participle clauses"],
      ["pronouns", "Pronouns"],
      ["subjunctive", "Subjunctive"],
      ["unreal-past", "Unreal past: wish and would rather"],
      ["inversion", "Inversion"],
      ["causative", "Causative have and get"],
    ];
    for (const [code, name] of topics)
      await q.query(
        `INSERT INTO learning_topics(code,name,component,topic_type) VALUES($1,$2,'GRAMMAR_VOCAB','KNOWLEDGE') ON CONFLICT(code) DO NOTHING`,
        [code, name],
      );
  }
  async down() {
    // Keep catalog entries: admins may already have reviewed labels using them.
  }
}
