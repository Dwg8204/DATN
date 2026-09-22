-- AptiMate unified database schema
-- Target: PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Identity and authentication -------------------------------------------------

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE CHECK (code = upper(code)),
  name varchar(80) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO roles (code, name) VALUES
  ('ADMIN', 'Administrator'),
  ('TEACHER', 'Teacher'),
  ('STUDENT', 'Student')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name varchar(150) NOT NULL,
  avatar_url text,
  phone varchar(30),
  bio text,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED')),
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_status ON users(role_id, status);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_info text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user_active
  ON refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

-- Reusable uploaded files -----------------------------------------------------

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  storage_key text NOT NULL UNIQUE,
  original_name varchar(255) NOT NULL,
  mime_type varchar(150) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Test authoring: all skills use the same structure --------------------------

CREATE TABLE tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  title varchar(255) NOT NULL,
  description text,
  test_type varchar(20) NOT NULL DEFAULT 'FULL'
    CHECK (test_type IN ('FULL', 'SKILL', 'PART', 'PRACTICE')),
  status varchar(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON tests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE test_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  component varchar(20) NOT NULL
    CHECK (component IN ('GRAMMAR', 'VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING')),
  part_number smallint NOT NULL CHECK (part_number > 0),
  title varchar(255),
  instructions text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (test_id, component, part_number)
);

CREATE INDEX idx_test_sections_test_order ON test_sections(test_id, sort_order);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
  question_type varchar(50) NOT NULL,
  prompt jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  points numeric(8,2) NOT NULL DEFAULT 1 CHECK (points >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_section_order ON questions(section_id, sort_order);
CREATE INDEX idx_questions_prompt_gin ON questions USING gin(prompt);
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE question_media (
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  purpose varchar(30) NOT NULL DEFAULT 'ATTACHMENT'
    CHECK (purpose IN ('AUDIO', 'IMAGE', 'VIDEO', 'ATTACHMENT')),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, asset_id, purpose)
);

-- Attempts, answers and review -----------------------------------------------

CREATE TABLE test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id),
  test_id uuid NOT NULL REFERENCES tests(id),
  status varchar(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED', 'ABANDONED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  total_score numeric(8,2),
  max_score numeric(8,2),
  percentage numeric(5,2) CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100),
  cefr_level varchar(5),
  time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0)
);

CREATE INDEX idx_attempts_student_created ON test_attempts(student_id, started_at DESC);
CREATE INDEX idx_attempts_test_status ON test_attempts(test_id, status);

CREATE TABLE attempt_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES test_sections(id),
  status varchar(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
  score numeric(8,2),
  max_score numeric(8,2),
  ai_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  teacher_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  UNIQUE (attempt_id, section_id)
);

CREATE TABLE attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_section_id uuid NOT NULL REFERENCES attempt_sections(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_correct boolean,
  score numeric(8,2),
  ai_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  teacher_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_section_id, question_id)
);

-- Vocabulary Notebook, Flashcard and Dictation -------------------------------

CREATE TABLE vocabulary_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  slug varchar(100) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_system AND owner_user_id IS NULL) OR (NOT is_system AND owner_user_id IS NOT NULL))
);

CREATE UNIQUE INDEX uq_system_topic_slug ON vocabulary_topics(slug) WHERE owner_user_id IS NULL;
CREATE UNIQUE INDEX uq_user_topic_slug ON vocabulary_topics(owner_user_id, slug) WHERE owner_user_id IS NOT NULL;
CREATE TRIGGER trg_topics_updated_at BEFORE UPDATE ON vocabulary_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vocabulary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  topic_id uuid NOT NULL REFERENCES vocabulary_topics(id),
  visibility varchar(20) NOT NULL DEFAULT 'PERSONAL'
    CHECK (visibility IN ('SYSTEM', 'PERSONAL')),
  entry_type varchar(20) NOT NULL
    CHECK (entry_type IN ('WORD', 'PHRASE', 'SENTENCE')),
  term text NOT NULL,
  pronunciation varchar(255),
  part_of_speech varchar(40),
  vietnamese_meaning text,
  example_sentence text,
  dictation_text text,
  locale varchar(20) NOT NULL DEFAULT 'en-GB',
  source_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (entry_type <> 'SENTENCE' OR dictation_text IS NOT NULL)
);

CREATE INDEX idx_vocab_topic_type ON vocabulary_entries(topic_id, entry_type);
CREATE INDEX idx_vocab_term_search ON vocabulary_entries USING gin(to_tsvector('simple', term));
CREATE TRIGGER trg_vocab_entries_updated_at BEFORE UPDATE ON vocabulary_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_vocabulary_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_entry_id uuid NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
  is_favourite boolean NOT NULL DEFAULT false,
  note text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vocabulary_entry_id)
);

CREATE TABLE flashcard_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_entry_id uuid NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
  learning_state varchar(20) NOT NULL DEFAULT 'NEW'
    CHECK (learning_state IN ('NEW', 'LEARNING', 'KNOWN')),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  PRIMARY KEY (user_id, vocabulary_entry_id)
);

CREATE TABLE dictation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_entry_id uuid NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
  submitted_text text NOT NULL,
  accuracy numeric(5,2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  speed numeric(3,2) NOT NULL DEFAULT 1 CHECK (speed > 0),
  used_hint boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dictation_attempts_user_entry
  ON dictation_attempts(user_id, vocabulary_entry_id, created_at DESC);

-- Notifications: message, audience and per-user state are separated ----------

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  title varchar(255),
  content text NOT NULL,
  audience_type varchar(20) NOT NULL
    CHECK (audience_type IN ('EVERYONE', 'ROLE', 'USERS')),
  delivery_mode varchar(20) NOT NULL DEFAULT 'NOW'
    CHECK (delivery_mode IN ('NOW', 'SCHEDULED')),
  status varchar(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (delivery_mode = 'NOW' AND scheduled_at IS NULL) OR
    (delivery_mode = 'SCHEDULED' AND scheduled_at IS NOT NULL)
  )
);

CREATE INDEX idx_notifications_dispatch ON notifications(status, scheduled_at);
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notification_channels (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL CHECK (channel IN ('IN_APP', 'PUSH', 'EMAIL')),
  PRIMARY KEY (notification_id, channel)
);

CREATE TABLE notification_target_roles (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  PRIMARY KEY (notification_id, role_id)
);

CREATE TABLE notification_target_users (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE notification_attachments (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  PRIMARY KEY (notification_id, asset_id)
);

CREATE TABLE user_notifications (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  read_at timestamptz,
  clicked_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX idx_user_notifications_inbox
  ON user_notifications(user_id, delivered_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_notifications_unread
  ON user_notifications(user_id, delivered_at DESC) WHERE read_at IS NULL AND deleted_at IS NULL;

-- Feedback, discussion and AI chat -------------------------------------------

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  category varchar(40) NOT NULL,
  subject varchar(255),
  content text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
  responded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON feedback
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE component_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id),
  component varchar(20) NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES component_discussions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  parent_reply_id uuid REFERENCES discussion_replies(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE discussion_likes (
  discussion_id uuid NOT NULL REFERENCES component_discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender varchar(20) NOT NULL CHECK (sender IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session_time ON chat_messages(session_id, created_at);

