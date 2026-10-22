import { EntityManager } from "typeorm";

export const TOPIC_SEEDS = [
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "present-simple", "Present simple"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "present-continuous", "Present continuous"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "past-simple", "Past simple"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "present-perfect", "Present perfect"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "future-forms", "Future forms"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "conditionals", "Conditionals"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "passive-voice", "Passive voice"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "modals", "Modal verbs"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "articles", "Articles and determiners"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "prepositions", "Prepositions"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "word-meaning", "Word meaning and synonyms"],
  ["GRAMMAR_VOCAB", "KNOWLEDGE", "collocations", "Collocations"],
  ["READING", "STRATEGY", "reading-detail", "Reading for detail"],
  ["READING", "STRATEGY", "reading-cohesion", "Text cohesion and sequencing"],
  ["READING", "STRATEGY", "reading-opinion", "Matching opinions"],
  ["READING", "STRATEGY", "reading-main-idea", "Identifying main ideas"],
  ["READING", "STRATEGY", "reading-inference", "Reading inference"],
  ["LISTENING", "STRATEGY", "listening-detail", "Listening for detail"],
  ["LISTENING", "STRATEGY", "listening-main-idea", "Listening for main ideas"],
  ["LISTENING", "STRATEGY", "listening-opinion", "Speaker opinions"],
  ["LISTENING", "STRATEGY", "listening-inference", "Listening inference"],
  ["LISTENING", "STRATEGY", "listening-matching", "Matching speakers"],
  ["WRITING", "CRITERION", "writing-task", "Task fulfilment"],
  ["WRITING", "CRITERION", "writing-cohesion", "Coherence and cohesion"],
  ["WRITING", "CRITERION", "writing-grammar", "Grammar range and accuracy"],
  [
    "WRITING",
    "CRITERION",
    "writing-vocabulary",
    "Vocabulary range and accuracy",
  ],
  ["SPEAKING", "CRITERION", "speaking-fluency", "Fluency and coherence"],
  ["SPEAKING", "CRITERION", "speaking-pronunciation", "Pronunciation"],
  ["SPEAKING", "CRITERION", "speaking-grammar", "Grammar range and accuracy"],
  [
    "SPEAKING",
    "CRITERION",
    "speaking-vocabulary",
    "Vocabulary range and accuracy",
  ],
] as const;

export async function seedTopics(manager: EntityManager) {
  for (const [component, type, code, name] of TOPIC_SEEDS)
    await manager.query(
      `INSERT INTO learning_topics(code,name,component,topic_type) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO NOTHING`,
      [code, name, component, type],
    );
}
