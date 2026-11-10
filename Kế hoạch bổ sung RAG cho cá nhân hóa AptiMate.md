# Kế hoạch bổ sung RAG cho cá nhân hóa AptiMate

Nov 9, 2026 · @VMMS

## Tóm tắt

Kế hoạch gồm 8 đợt (R0–R7), khoảng 17–22 ngày công. Mục tiêu: thay việc chọn đề ngẫu nhiên bằng truy xuất (RAG) dựa trên lỗi thật của người học, giải thích câu sai có trích nguồn, và dùng ngay dữ liệu bài đánh giá đầu vào cho người dùng mới.

- **Căn cứ:** nhánh `develop` tại `52edbd2` (09/11/2026) và các quyết định chốt trong hội thoại.
- **Nguyên tắc:** RAG là lớp ưu tiên đặt lên trên logic cũ. Không tìm được thì quay về đúng hành vi hiện tại, nên hệ thống mới không bao giờ gợi ý tệ hơn.
- **Tái sử dụng:** hạ tầng RAG của chatbot (`pgvector`, `gemini-embedding-001` 768 chiều, tìm kiếm lai `tsvector` + vector, gộp RRF trong `chatbot.knowledge.ts`), `JsonGenerationService`, rate limiter Gemini, cơ chế thay ngày chưa học của GĐ7.
- **Quy trình:** mỗi đợt một nhánh từ `develop`, commit tiếng Việt theo task, dừng nghiệm thu sau mỗi đợt, ghi báo cáo `docs/PERSONALIZATION_RAG_Rx_REPORT.md` và cập nhật `SESSION_HANDOFF.md`.

**Trong phạm vi:** module `personalization`, `ai-shared`, `chatbot` (tách phần tìm kiếm), `topics` (hook embed khi xuất bản), trang ôn câu sai, Dashboard/lộ trình, trang báo cáo, admin (kho kiến thức, thiếu hụt nội dung).

**Ngoài phạm vi:** mô hình người học Elo/IRT/BKT (đã loại vì khó chứng minh căn cứ trong thời gian đồ án), GĐ11 rubric đánh giá lời AI (làm sau, có thể dùng chung bộ đánh giá R7), thay đổi cách tính band CEFR hiện tại.

## Quyết định đã chốt

| Chủ đề | Hiện trạng trong code | Quyết định |
| --- | --- | --- |
| Hướng cá nhân hóa | Chọn đề theo Part yếu rồi xếp `md5(userId:week:testId)` | Chỉ dùng RAG, không dùng Elo/IRT |
| Chọn đề | `ORDER BY is_weak, used, random_seed` trong `plan-candidates.service.ts` | Thêm bậc truy xuất và số câu khớp; seed chỉ còn phá hòa |
| Ứng viên gửi AI | Ẩn danh: `candidateId, activityType, component, partNumber, purpose` | Gửi thêm tiêu đề đề, bậc, số câu khớp, nhóm lỗi khớp |
| Không tìm được đề tương tự | — | Bậc thang 4 bậc; bậc 3 = logic cũ; ghi log thiếu hụt |
| Ngưỡng tương đồng | — | Không đoán; xác định từ bộ nhãn đánh giá R0/R7, lưu trong `.env` |
| Giải thích câu sai | Chỉ hiện đáp án đúng và `explanation` | AI giải thích dựa trên đoạn bài học, bắt buộc `chunkId` hợp lệ; có cache |
| Người dùng mới | Placement ngày 1–3; ngày 4–7 xếp lúc tạo mục tiêu, chưa có dữ liệu | Giữ placement; tự xếp lại ngày chưa học ngay khi đủ 3 bài đánh giá, một lần/plan |
| Writing/Speaking | Chỉ dùng số đếm tiêu chí; phản hồi văn bản bị loại khỏi snapshot | Không tìm câu tương tự; tìm bài học theo tiêu chí yếu; R5 đưa `corrections` vào kho lỗi |
| Quyền riêng | — | Kho lỗi người học luôn lọc `user_id`; không đưa nội dung bài làm của người khác vào prompt |
| Tắt/bật | — | Mọi tính năng mới sau cờ `PERSONALIZATION_RAG_ENABLED`, mặc định `false` |

## Kiến trúc tổng thể

Mọi luồng cá nhân hóa mới gọi chung một dịch vụ truy xuất. Dịch vụ này đọc ba kho vector trong PostgreSQL, không thêm hạ tầng mới ngoài `pgvector` đã bật.

&#91;embedded content: kiến trúc RAG · 3 nguồn, 3 kho, 1 dịch vụ truy xuất, 3 luồng sử dụng\]

Kho kiến thức đã có sẵn từ chatbot; hai kho còn lại là bảng mới. Mọi kết quả dưới ngưỡng đều quay về logic hiện tại.

### Truy vấn được tạo thế nào

Truy vấn không do người dùng gõ. Code ghép từ một câu sai theo mẫu cố định:

```
[Kỹ năng] GRAMMAR_VOCAB · Part 1
[Đề] If I ___ rich, I would buy a big house.
[Đã chọn] am   [Đáp án đúng] were
[Giải thích có sẵn] (nếu có)
```

Writing dùng tiêu chí yếu và `corrections` (original → replacement) thay cho đáp án. Speaking dùng tiêu chí yếu.

### Bậc thang dự phòng khi chọn đề

| Bậc | Điều kiện | Gợi ý | `reason` |
| --- | --- | --- | --- |
| 1 | Có đề chưa làm chứa ≥ `RAG_MIN_MATCHES_PER_TEST` (mặc định 2) câu vượt ngưỡng | Đề có điểm khớp cao nhất | `SIMILAR_QUESTIONS` |
| 2 | Lỗi có nhãn chủ đề APPROVED | Đề chưa làm có nhiều câu cùng chủ đề nhất | `WEAK_TOPIC` |
| 3 | Không có bậc 1, 2 | Đề chưa làm cùng Part yếu, đúng logic cũ | `WEAK_PART` / `GOAL_PACE` |
| 4 | Đã làm hết đề phù hợp | Làm lại câu sai (MISTAKE\_REVIEW), rồi đề cũ khớp nhất | `RECENT_MISTAKES` |

Bậc 3 và 4 luôn ghi một dòng `retrieval_gaps`. Validator cấm `reason` nhắc “câu tương tự” khi ứng viên có `matchCount = 0`.

## Thiết kế database

Cần 4 migration, đánh số tiếp sau `1760000023000-AddPlanProgressFinalizedAt`. Mỗi migration có `down` đầy đủ và được kiểm tra up/down/up trong test PostgreSQL riêng (`TEST_DATABASE_URL` kết thúc bằng `_test`), theo đúng nếp các đợt trước.

| Migration | Đợt | Nội dung |
| --- | --- | --- |
| `1760000024000-AddRagRetrievalStores` | R1 | `question_embeddings`, `question_embedding_jobs`, cột mới cho `knowledge_documents`, trigger xếp hàng embed |
| `1760000025000-AddMistakeExplanations` | R2 | `mistake_explanations`, `retrieval_gaps` |
| `1760000026000-AddPlanRetrievalTrace` | R3, R4 | `study_plan_items.retrieval`, `study_plans.replanned_after_placement_at` |
| `1760000027000-AddLearnerErrorChunks` | R5 | `learner_error_chunks`, `learner_error_jobs` |

### 1760000024000 — kho câu hỏi và kho kiến thức

```sql
CREATE TABLE question_embeddings (
  question_id       uuid PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  question_hash     text NOT NULL,              -- lấy từ view topic_question_catalog
  test_id           uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  component         skill_component NOT NULL,
  part_number       smallint,
  question_key      text NOT NULL,              -- p1:q3 … khớp với result.items
  content_text      text NOT NULL,              -- đề + đáp án + giải thích, ≤ 2.000 ký tự
  search_vector     tsvector NOT NULL,          -- to_tsvector('simple', content_text)
  embedding         vector(768) NOT NULL,
  embedding_model   varchar(100) NOT NULL,      -- 'gemini-embedding-001'
  embedding_version varchar(50) NOT NULL,       -- đổi khi đổi cách ghép content_text
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX question_embeddings_scope_idx  ON question_embeddings(component, part_number);
CREATE INDEX question_embeddings_test_idx   ON question_embeddings(test_id);
CREATE INDEX question_embeddings_search_idx ON question_embeddings USING gin(search_vector);

CREATE TABLE question_embedding_jobs (          -- cùng mẫu topic_tagging_jobs
  test_id uuid PRIMARY KEY REFERENCES tests(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  retry_count integer NOT NULL DEFAULT 0, error_code text, completed_at timestamptz
);

ALTER TABLE knowledge_documents
  ADD COLUMN topic_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN criterion   varchar(30),           -- TASK, GRAMMAR, REGISTER … cho Writing/Speaking
  ADD COLUMN usage       varchar(20) NOT NULL DEFAULT 'GENERAL'
    CHECK (usage IN ('GENERAL','LESSON','PART_STRATEGY','CRITERION_GUIDE'));
CREATE INDEX knowledge_documents_topic_codes_idx ON knowledge_documents USING gin(topic_codes);
```

- **Không tạo index HNSW lúc đầu.** Kho khoảng 2.000 câu, quét chính xác có lọc `component` vẫn dưới vài chục ms. Index xấp xỉ cộng mệnh đề `WHERE` dễ trả về thiếu kết quả. Ghi chú trong README: bật HNSW khi vượt khoảng 50.000 dòng.
- **Trigger:** khi `tests.published_snapshot_id` thay đổi thì upsert một dòng `question_embedding_jobs` (reset `completed_at`). Theo mẫu `enqueue_topic_test()` có sẵn.
- **Giữ dữ liệu chatbot:** ba cột mới có giá trị mặc định, nên tài liệu cũ không đổi hành vi.

### 1760000025000 — cache giải thích và log thiếu hụt

```sql
CREATE TABLE mistake_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  assessment_revision integer NOT NULL,
  question_key text NOT NULL,
  locale varchar(5) NOT NULL CHECK (locale IN ('vi','en')),
  prompt_version varchar(50) NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('READY','FALLBACK')),
  content jsonb NOT NULL,                 -- {explanation, ruleSummary, tip, citations:[chunkId]}
  chunk_ids uuid[] NOT NULL DEFAULT '{}',
  ai_request_id uuid,                     -- liên kết bản ghi request/token dùng chung
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attempt_id, assessment_revision, question_key, locale, prompt_version)
);

CREATE TABLE retrieval_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  feature varchar(20) NOT NULL CHECK (feature IN ('PLAN','EXPLAIN','REPORT')),
  component skill_component NOT NULL, part_number smallint,
  topic_codes text[] NOT NULL DEFAULT '{}',
  tier smallint CHECK (tier BETWEEN 1 AND 4),
  top_similarity real,
  source_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX retrieval_gaps_report_idx ON retrieval_gaps(feature, component, part_number, created_at DESC);
```

`retrieval_gaps` chỉ lưu `source_question_id` (câu trong ngân hàng đề), không lưu đáp án hay văn bản người học viết. R6 thêm bước xoá dòng cũ hơn 180 ngày vào `personalization.worker.ts`.

### 1760000026000 — vết truy xuất trên lộ trình

```sql
ALTER TABLE study_plan_items ADD COLUMN retrieval jsonb;
-- {tier:1..4, matchCount, score, matchedQuestionIds:[≤ 5], sourceMistakeKeys:[≤ 5], ragVersion}
ALTER TABLE study_plans ADD COLUMN replanned_after_placement_at timestamptz;
```

`retrieval` dùng cho ba việc: hiển thị “vì sao gợi ý đề này”, kiểm tra `reason` của AI, và số liệu đánh giá R7. Dòng cũ có giá trị `NULL`, giao diện hiển thị như hiện tại.

### 1760000027000 — kho lỗi người học

```sql
CREATE TABLE learner_error_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  assessment_revision integer NOT NULL,
  source_kind varchar(30) NOT NULL
    CHECK (source_kind IN ('OBJECTIVE_MISTAKE','WRITING_CORRECTION','WRITING_WEAKNESS')),
  ordinal smallint NOT NULL DEFAULT 0,
  component skill_component NOT NULL, part_number smallint, question_key text,
  criterion varchar(30), topic_codes text[] NOT NULL DEFAULT '{}',
  content_text text NOT NULL, search_vector tsvector NOT NULL,
  embedding vector(768) NOT NULL, embedding_model varchar(100) NOT NULL,
  observed_at timestamptz NOT NULL,
  UNIQUE (attempt_id, assessment_revision, source_kind, question_key, ordinal)
);
CREATE INDEX learner_error_chunks_user_idx ON learner_error_chunks(user_id, observed_at DESC);

CREATE TABLE learner_error_jobs (attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(), next_retry_at timestamptz NOT NULL DEFAULT now(),
  retry_count integer NOT NULL DEFAULT 0, error_code text);
```

Chấm lại bài (`assessment_revision` tăng) thì xoá các dòng của revision cũ rồi embed lại, giống cách `processTopicEvidence` xoá và ghi lại `learning_evidence`.

## Lộ trình các đợt

Làm tuần tự R0 → R7. Sau R4 (khoảng 13–14 ngày) đã có bản demo đầy đủ phần người học nhìn thấy: giải thích câu sai, chọn đề theo lỗi, xếp lại lộ trình cho người mới.

&#91;embedded content: lộ trình 8 đợt · mốc demo sau R4\]

Nếu thiếu thời gian, có thể làm R7 ngay sau R4 và để R5, R6 sang sau; R7 vẫn đo được R1–R4.

## Chi tiết từng đợt

Mỗi đợt liệt kê việc theo database, backend, frontend, kiểm thử và tiêu chí nghiệm thu. Đường dẫn file tính từ `backend/src` và `frontend/src`.

### R0 — Chuẩn bị dữ liệu và nội dung (2–3 ngày)

Nhánh `feat/rag-r0-content`. Không sửa code chạy; chỉ tạo nội dung và bộ nhãn đánh giá.

**Nội dung kho kiến thức** (`backend/resources/chatbot-knowledge/corpus.json`)

- [ ] Thêm trường cho mỗi tài liệu: `usage` (`LESSON` / `PART_STRATEGY` / `CRITERION_GUIDE`), `topicCodes`, `component`, `part`, `criterion`.
- [ ] 45 bài `LESSON`, mỗi bài ứng với một mã trong `learning_topics`, 300–600 từ. Cấu trúc cố định: quy tắc · ví dụ đúng/sai · lỗi người Việt hay gặp · mẹo làm bài Aptis. 8 bài “AptiMate biên soạn” đã có được gắn mã thay vì viết lại.
- [ ] Bài `PART_STRATEGY` cho từng Part của 5 kỹ năng.
- [ ] Bài `CRITERION_GUIDE`: 6 tiêu chí Writing (`TASK, GRAMMAR, VOCABULARY, COHERENCE, REGISTER, MECHANICS`) và 4 tiêu chí Speaking (`grammarVocabulary, pronunciation, fluency, taskFulfillment`).
- [ ] AI soạn nháp, người duyệt từng bài. Giữ `variant` là `ENGLISH` để chatbot cũng dùng được.

**Bộ nhãn đánh giá** (`backend/test/fixtures/rag-gold.json`)

- [ ] 60 câu sai mẫu: 20 Grammar & Vocabulary, 20 Reading, 20 Listening. Lấy câu từ ngân hàng đề, đáp án sai giả lập, không dùng bài làm thật của người dùng.
- [ ] Mỗi câu ghi: `documentKey` bài học đúng và 3–5 `questionId` tương tự đúng.
- [ ] Ghi chép cách gắn nhãn vào `docs/PERSONALIZATION_RAG_R0_REPORT.md` để đưa vào đồ án.

**Kiểm tra dữ liệu**

- [ ] Chạy `SELECT DISTINCT question_type` trên DB local, lập danh sách loại câu cần hàm ghép văn bản ở R1.
- [ ] Kiểm tra đề Listening có lưu lời thoại trong `content` không. Không có thì R1 chỉ embed câu hỏi + phương án.

**Nghiệm thu R0:** `npm run knowledge:validate` đạt với trường mới (sau khi R1 mở rộng validator); 45/45 mã chủ đề có bài học đã duyệt; bộ nhãn đủ 60 câu.

### R1 — Nền tảng truy xuất (3 ngày)

Nhánh `feat/rag-r1-retrieval`. Kết thúc đợt này, hệ thống tìm được câu tương tự và bài học nhưng chưa thay đổi gì người học nhìn thấy.

**Database:** migration `1760000024000-AddRagRetrievalStores` (xem phần Thiết kế database).

**Backend — module mới `features/retrieval/`**

| File | Vai trò |
| --- | --- |
| `retrieval.module.ts` | Export các service dưới; `ChatbotModule` và `PersonalizationModule` import |
| `embedding.service.ts` | Chuyển `embed()` từ `chatbot.provider.ts` sang đây. Dùng `gemini-client`, rate limiter và `ai-request-recorder` có sẵn. Thêm `embedMany()` theo lô |
| `hybrid-search.ts` | Hàm thuần: dựng SQL hai nhánh (vector `<=>` và `ts_rank_cd`) + `reciprocalRankFusion` chuyển từ `chatbot.knowledge.ts` |
| `knowledge-search.service.ts` | `search(query, {component, part, topicCodes, usage, criterion, limit, minSimilarity})` → `{chunkId, documentKey, title, content, similarity, rrfScore}` |
| `question-search.service.ts` | `similar(vectors, {component, part, excludeTestIds, excludeQuestionIds, perSource, minSimilarity})` → danh sách câu khớp kèm `test_id` và độ tương đồng |
| `question-text.ts` | Hàm thuần `buildQuestionText(row)` theo từng `question_type`; hằng `QUESTION_TEXT_VERSION = 'q-text-v1'` |
| `question-embedding.worker.ts` | Mỗi 60 giây lấy tối đa 5 job bằng `FOR UPDATE SKIP LOCKED`; chỉ embed câu chưa có hoặc đã đổi `question_hash`; retry có backoff; tắt khi `PERSONALIZATION_RAG_ENABLED=false` |

**Backend — sửa file có sẵn**

- [ ] `features/chatbot/chatbot.knowledge.ts`: gọi `KnowledgeSearchService`, giữ nguyên đầu ra và bộ lọc `examVariant`. Vẫn export `reciprocalRankFusion` để test cũ không vỡ.
- [ ] `features/chatbot/chatbot.provider.ts`: `embed()` ủy quyền sang `EmbeddingService`.
- [ ] `scripts/chatbot-knowledge.ts`: validate và ghi `topic_codes`, `criterion`, `usage`; kiểm tra mã chủ đề tồn tại trong `learning_topics`.
- [ ] Script mới `scripts/question-embed.ts`, lệnh `npm run questions:embed` (mặc định chỉ đếm, `-- --apply` mới xếp hàng job), theo mẫu `topics:backfill`.
- [ ] `config/env.validation.ts`, `.env.example`, `backend/README.md`: thêm biến `PERSONALIZATION_RAG_ENABLED` và `RAG_*` (phần Cấu hình).

**Frontend:** không đổi.

**Kiểm thử**

- [ ] Unit: `buildQuestionText` cho mọi `question_type`; `reciprocalRankFusion`; SQL builder có đủ bộ lọc và tham số hóa.
- [ ] PostgreSQL `npm run test:rag:db`: migration up/down/up; xuất bản đề tạo job; worker chạy hai lần không nhân đôi; sửa câu đổi hash thì embed lại; tìm kiếm lọc đúng `component` và loại đề đã làm. Dùng provider giả sinh vector từ hash, không gọi Gemini thật.
- [ ] Hồi quy: `npm run test:chatbot` và `test:chatbot:db` đạt.

**Nghiệm thu R1**

- Số dòng `question_embeddings` bằng số câu của đề PUBLISHED trong `topic_question_catalog`.
- Chạy bộ nhãn R0 lần đầu, ghi Recall@5 của ba cách tìm (từ khóa, vector, kết hợp) làm mốc.
- Chatbot trả lời như cũ.

## Cấu hình, vận hành và rủi ro

Tắt `PERSONALIZATION_RAG_ENABLED` là hệ thống quay về hành vi hiện tại, không cần revert migration.

### Biến môi trường mới

Thêm vào `config/env.validation.ts` (Joi), `.env.example` và `backend/README.md`.

| Biến | Mặc định | Đợt | Ý nghĩa |
| --- | --- | --- | --- |
| `PERSONALIZATION_RAG_ENABLED` | `false` | R1 | Bật/tắt toàn bộ tính năng RAG và các worker embed |
| `RAG_QUESTION_MIN_SIMILARITY` | `0.75` | R1 | Ngưỡng câu tương tự; giá trị tạm, R7 hiệu chỉnh |
| `RAG_KNOWLEDGE_MIN_SIMILARITY` | `0.70` | R1 | Ngưỡng đoạn bài học; giá trị tạm, R7 hiệu chỉnh |
| `RAG_EMBED_MAX_RPM` | `60` | R1 | Giới hạn gọi embedding mỗi phút của worker |
| `RAG_EXPLAIN_DAILY_LIMIT` | `50` | R2 | Số lượt gọi AI giải thích mỗi người mỗi ngày |
| `RAG_SIMILAR_PER_MISTAKE` | `10` | R3 | Số câu gần nhất lấy cho mỗi câu sai |
| `RAG_MIN_MATCHES_PER_TEST` | `2` | R3 | Số câu khớp tối thiểu để đề vào bậc 1 |

Model embedding giữ cố định `gemini-embedding-001`, 768 chiều, giống chatbot. Đổi model cần embed lại toàn bộ, nhờ cột `embedding_model` / `embedding_version`.

### Triển khai trên máy local (Docker)

1. `docker compose run --rm --no-deps backend npm run db:migrate:status`, kiểm tra migration đang chờ, rồi `npm run db:migrate`.
2. `npm run knowledge:import -- --apply` để nạp bài học R0.
3. `npm run questions:embed` xem số đề, sau đó `npm run questions:embed -- --apply`.
4. Bật `PERSONALIZATION_RAG_ENABLED=true` trong `backend/.env`, chạy lại `start-docker.cmd` để nạp `.env`.
5. Kiểm tra trang admin “Học liệu AI” (sau R6) hoặc đếm bảng `question_embeddings`.

### Rủi ro và cách xử lý

| Rủi ro | Ảnh hưởng | Cách xử lý |
| --- | --- | --- |
| Kho đề nhỏ (179 đề), nhiều đề dùng chung 5 bộ chủ đề | Nhiều lần rơi xuống bậc 3, kết quả khớp trùng nội dung | Bậc thang dự phòng; R6 chỉ ra chỗ thiếu; R7 báo cáo tỷ lệ bậc 1 trung thực |
| Nội dung bài học do AI soạn có lỗi | Giải thích sai kiến thức | Duyệt tay toàn bộ bài ở R0; chấm tay ở R2/R7 |
| Quota và chi phí Gemini | Worker hoặc giải thích bị 429 | Rate limiter sẵn có, `RAG_EMBED_MAX_RPM`, cache giải thích, giới hạn ngày; lập kế hoạch không gọi embed |
| Prompt injection qua nội dung câu hỏi hoặc bài viết | AI làm theo chỉ dẫn lạ | Giữ câu lệnh “dữ liệu không đáng tin”; schema JSON; validator kiểm tra trích dẫn; không đưa văn bản người học vào prompt báo cáo |
| Lộ dữ liệu giữa người học | Vi phạm quyền riêng | Mọi truy vấn kho lỗi bắt buộc `user_id`; test PostgreSQL riêng cho trường hợp này |
| Listening không có lời thoại | Câu Listening khớp kém | Kiểm tra ở R0; chấp nhận dừng ở bậc 2–3 cho Listening |
| Snapshot cũ không ánh xạ được `question_id` | Một số câu sai cũ bị bỏ qua | Chấp nhận; bài mới đều có `topic_snapshot_questions` qua trigger |
| Ngưỡng tạm không phù hợp | Gợi ý sai hoặc quá ít bậc 1 | Cờ tắt mặc định đến khi R7 hiệu chỉnh xong |

## Căn cứ nghiên cứu

Mỗi thành phần của kế hoạch dựa trên một công trình nền tảng. Cách kết hợp cho AptiMate (bậc thang dự phòng, dùng vector câu sai làm truy vấn) là thiết kế của đồ án.

| Thành phần | Công trình | Dùng ở đâu |
| --- | --- | --- |
| Kiến trúc RAG | Lewis et al. (2020), *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*, NeurIPS | R2, R5 |
| Tổng quan RAG, lọc metadata, trích dẫn | Gao et al. (2023), *Retrieval-Augmented Generation for Large Language Models: A Survey*, arXiv:2312.10997 | R1, R2, R5 |
| Truy xuất vector | Karpukhin et al. (2020), *Dense Passage Retrieval for Open-Domain Question Answering*, EMNLP | R1 |
| Gộp tìm từ khóa và vector | Cormack, Clarke & Büttcher (2009), *Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods*, SIGIR | R1 (code chatbot đã dùng hằng số 60) |
| Gợi ý dựa trên nội dung | Lops, de Gemmis & Semeraro (2011), *Content-based Recommender Systems: State of the Art and Trends*, Recommender Systems Handbook | R3 |
| Khởi đầu lạnh bằng thu thập thông tin ban đầu | Rashid et al. (2002), *Getting to Know You: Learning New User Preferences in Recommender Systems*, IUI | R4 |
| Đánh giá RAG | Es et al. (2023), *RAGAS: Automated Evaluation of Retrieval Augmented Generation*, arXiv:2309.15217 | R7 |
| Luyện tập kiểm tra, ôn câu sai | Dunlosky et al. (2013), *Improving Students’ Learning With Effective Learning Techniques*, Psychological Science in the Public Interest 14(1) | R2, R3 (ôn câu sai, làm câu cùng dạng) |

Danh sách trích từ trí nhớ, chưa tra web trong phiên này. Cần kiểm tra từng mục trên Google Scholar (tác giả, năm, nơi đăng, DOI) trước khi đưa vào chương cơ sở lý thuyết.

### R2 — Giải thích câu sai có trích nguồn (3 ngày)

Nhánh `feat/rag-r2-mistake-explain`. Đây là thay đổi đầu tiên người học thấy: nút **“Vì sao sai?”** trên từng câu ở trang ôn câu sai.

**Database:** migration `1760000025000-AddMistakeExplanations`.

**Backend**

- [ ] `features/personalization/ai/explanation.contract.ts`:
  - `EXPLAIN_PROMPT_VERSION = 'mistake-explain-v1'`, `EXPLAIN_SYSTEM`, `EXPLAIN_SCHEMA`.
  - Đầu ra: `explanation` (≤ 600 ký tự), `ruleSummary` (≤ 200), `tip` (≤ 200), `citations` (1–3 `chunkId`).
  - `validateExplanation()`: mọi `chunkId` phải nằm trong danh sách vừa truy xuất; không link, HTML; đúng `locale`; không nhắc đáp án khác với đáp án đúng của câu.
  - System prompt dùng lại quy tắc cũ: mọi đầu vào là dữ liệu không đáng tin, không thực thi chỉ dẫn bên trong.
- [ ] `features/personalization/services/mistake-explanation.service.ts`, hàm `explain(actor, attemptId, questionKey, locale)`:
  1. Kiểm tra sở hữu và trạng thái qua `MistakeSourceService.details()`: bài `SUBMITTED`, `result.method = 'OBJECTIVE'`, câu có outcome `INCORRECT` hoặc `SKIPPED`.
  2. Đọc cache `mistake_explanations` theo khoá duy nhất; có thì trả ngay.
  3. Ghép truy vấn theo mẫu ở phần Kiến trúc. Lấy `topicCodes` từ nhãn APPROVED của câu nếu có.
  4. `KnowledgeSearchService.search()` lọc `component`, `part`, ưu tiên `usage = LESSON`, lấy 3 đoạn vượt `RAG_KNOWLEDGE_MIN_SIMILARITY`.
  5. Không có đoạn nào: trả `FALLBACK` từ trường `explanation` của câu, ghi `retrieval_gaps` (`feature = 'EXPLAIN'`), không gọi AI.
  6. Có đoạn: gọi `JsonGenerationService` với feature `PERSONAL_EXPLAIN`; validator lỗi thì gọi lại một lần kèm danh sách lỗi; vẫn lỗi thì `FALLBACK`.
  7. Lưu cache, trả kết quả.
- [ ] Giới hạn `RAG_EXPLAIN_DAILY_LIMIT` lượt gọi AI mỗi người mỗi ngày, dùng lại cơ chế giới hạn theo user/ngày của GĐ6. Hết lượt thì trả `FALLBACK` kèm mã `EXPLAIN_LIMIT_REACHED`; cache vẫn đọc được.
- [ ] API trong `controllers/personalization.controller.ts`, role STUDENT:

```
GET /api/v1/me/mistakes/:attemptId/questions/:questionKey/explanation?locale=vi
→ 200 { status: 'READY' | 'FALLBACK', explanation, ruleSummary, tip,
        sources: [{ chunkId, title, excerpt, url }], notice?: 'EXPLAIN_LIMIT_REACHED' | 'NO_LESSON' }
→ 404 MISTAKE_SOURCE_UNAVAILABLE · 400 MISTAKE_QUESTION_NOT_INCORRECT
```

- [ ] Thêm `PERSONAL_EXPLAIN` vào danh sách feature của bản ghi request/token dùng chung.

**Frontend**

- [ ] `features/personalization/services/personalizationApi.js`: thêm `getMistakeExplanation(attemptId, questionKey, locale)`.
- [ ] Component mới `features/personalization/components/MistakeExplanation.jsx` + CSS module:
  - Thu gọn mặc định. Mở ra mới gọi API, không tải sẵn cho cả trang.
  - Hiển thị: giải thích · quy tắc · mẹo · nguồn (tiêu đề + trích đoạn, link nếu có, mở tab mới `noopener`).
  - Trạng thái: đang tải (`PageLoader` compact) · `FALLBACK` có dòng “Chưa có bài học chi tiết cho dạng này” · lỗi có nút thử lại.
- [ ] `MistakeReviewPage.jsx`: gắn `MistakeExplanation` dưới mỗi câu sai.
- [ ] `i18n/locales/vi.json`, `en.json`: thêm khoá giao diện. Không dịch nội dung đề và đáp án, theo `docs/I18N_AUDIT.md`. Ngôn ngữ giải thích theo ngôn ngữ giao diện hiện tại.

**Kiểm thử**

- [ ] Unit: validator (chunkId lạ, quá dài, sai locale); service với provider giả: bài của người khác → 404, câu đúng → 400, cache hit không gọi AI, không có đoạn → FALLBACK và có dòng gap, hết lượt → FALLBACK.
- [ ] PostgreSQL: ràng buộc unique cache, cascade khi xoá user/attempt, migration up/down/up.
- [ ] Browser `tests/mistakeExplanation.browser.test.mjs`: mở giải thích, hiển thị nguồn, FALLBACK, thử lại; desktop 1280 và mobile 390 không tràn ngang.

**Nghiệm thu R2:** 100% giải thích READY có `chunkId` hợp lệ; chấm tay 30 giải thích trên bộ nhãn R0 theo rubric đúng kiến thức / bám nguồn / dễ hiểu; tắt cờ RAG thì nút ẩn và trang như cũ.

### R3 — Chọn đề bằng truy xuất (3 ngày)

Nhánh `feat/rag-r3-retrieval-plan`. Thay `random_seed` bằng bậc và số câu khớp; seed chỉ còn phá hòa.

**Điểm mấu chốt:** câu sai của người học cũng nằm trong ngân hàng đề, nên vector truy vấn lấy thẳng từ `question_embeddings`. Lập lộ trình **không gọi API embedding**, nhanh và cho kết quả lặp lại được.

**Database:** migration `1760000026000-AddPlanRetrievalTrace` (cột `study_plan_items.retrieval`; cột `replanned_after_placement_at` dùng ở R4).

**Backend**

- [ ] Service mới `features/personalization/services/retrieval-candidates.service.ts`, hàm `rankTests(manager, userId, snapshot)`:
  1. Đổi `snapshot.mistakes.references` (≤ 30 câu sai) sang `question_id` qua `test_attempts.snapshot_id` + `topic_snapshot_questions.question_key`. Snapshot cũ không ánh xạ được thì bỏ qua câu đó.
  2. Mỗi câu sai lấy `RAG_SIMILAR_PER_MISTAKE` (mặc định 10) câu gần nhất cùng `component`, vượt `RAG_QUESTION_MIN_SIMILARITY`, loại câu thuộc chính đề đó. Đề ứng viên phải qua điều kiện REGULAR\_TEST\_SQL, nên đề đánh giá và Part cùng placement\_family\_id không bao giờ được gợi ý, dù câu của chúng vẫn có trong kho để làm truy vấn.
  3. Gộp theo `test_id`: `matchCount` = số câu sai khác nhau có câu khớp trong đề; `score` = tổng độ tương đồng. Giữ tối đa 5 `matchedQuestionIds` và 5 `sourceMistakeKeys`.
  4. Trả `Map<testId, {tier: 1, matchCount, score, ...}>` cho đề đạt `RAG_MIN_MATCHES_PER_TEST`.
- [ ] `services/plan-candidates.service.ts`:
  - Gọi `rankTests()` trước truy vấn chính, truyền danh sách đề bậc 1 vào CTE để chúng luôn lọt top 21 mỗi kỹ năng.
  - Thứ tự mới: `placement → tier → matchCount DESC → score DESC → used → random_seed → id`. Đề không có trong Map và cùng Part yếu là bậc 3; còn lại xếp như cũ.
  - Sửa truy vấn TOPIC\_REVIEW (bậc 2): bỏ `DISTINCT ON (topic_id) ORDER BY t.id`, thay bằng đếm số câu cùng chủ đề trong từng đề, chọn đề chưa làm có số câu cao nhất.
  - Gắn `tier`, `matchCount`, `retrieval` vào `PlanCandidate` loại TEST và TOPIC\_REVIEW.
  - Thuật toán tách thành hàm thuần `rankTestCandidates()` trong `policies/` để viết unit test.
- [ ] `policies/rule-plan.ts`: không đổi cách xếp ngày. Chỉ chuyển `retrieval` sang item và đặt `reason = 'SIMILAR_QUESTIONS'` cho đề bậc 1.
- [ ] `repositories/study-plans.repository.ts`: ghi và đọc cột `retrieval`.
- [ ] `ai/report.contract.ts`:
  - `reportPromptInput` gửi thêm `title`, `tier`, `matchCount`, `matchedTopics` (tên chủ đề của câu khớp nếu có nhãn).
  - `REPORT_SYSTEM` thêm: ưu tiên bậc thấp; `reason` chỉ được nói “tương tự / cùng dạng” khi `matchCount > 0` và phải dùng đúng số đó.
  - `validateWeeklyContent`: lỗi mới `REASON_CLAIMS_SIMILARITY` (bắt các cụm “tương tự”, “giống lỗi”, “cùng dạng”, “similar”) và `REASON_MATCH_COUNT_MISMATCH`.
  - Tăng `REPORT_PROMPT_VERSION` lên `personal-weekly-v6`. Snapshot không đổi nên giữ `SNAPSHOT_VERSION = 5`.
- [ ] Ghi `retrieval_gaps` (`feature = 'PLAN'`) cho mỗi kỹ năng có câu sai nhưng không có đề bậc 1; tối đa một dòng mỗi kỹ năng mỗi lần lập kế hoạch.
- [ ] `services/plan.service.ts` → `presentPlan`: trả thêm `retrieval: {tier, matchCount, matchedTopics}` cho mỗi item.
- [ ] Writing và Speaking: không truy xuất câu, giữ logic cũ (bậc 3).

**Frontend**

- [ ] `features/personalization/components/StudyPlanCard.jsx`: dòng phụ dưới đề được gợi ý.
  - Bậc 1: “Khớp 5 câu với lỗi gần đây”, kèm chủ đề nếu có.
  - Bậc 2: “Chủ đề cần ôn: Câu điều kiện”.
  - Bậc 3, 4 và item cũ có `retrieval = null`: không hiển thị gì thêm.
- [ ] Khoá i18n vi/en.

**Kiểm thử**

- [ ] Unit `rankTestCandidates`: bậc, số câu khớp, phá hòa; **không có embedding thì thứ tự giống hệt hàm cũ** (so bằng snapshot test).
- [ ] Unit validator: AI nói “tương tự” với ứng viên `matchCount = 0` bị từ chối; nêu sai số câu bị từ chối.
- [ ] PostgreSQL fixture: người học sai 5 câu điều kiện → đề có nhiều câu điều kiện nhất đứng đầu; đề đã làm bị đẩy xuống; TOPIC\_REVIEW chọn đề mật độ cao; gap được ghi. Chạy lại hồi quy GĐ4/GĐ7/S1/S4.
- [ ] Browser: badge bậc 1, 2; desktop/mobile.

**Nghiệm thu R3:** trên bộ nhãn R0, số câu khớp trung bình của đề được gợi ý cao hơn cách chọn ngẫu nhiên (ghi số cụ thể vào báo cáo); tắt cờ RAG thì lộ trình giống hệt bản cũ.

### R4 — Người dùng mới: xếp lại sau đánh giá đầu vào (2 ngày)

Nhánh `feat/rag-r4-placement-replan`. Khi đủ 3 bài đánh giá (G&V, Reading, Listening), các ngày chưa học của tuần hiện tại được xếp lại ngay bằng logic R3, không chờ báo cáo cuối tuần.

**Database:** dùng cột `study_plans.replanned_after_placement_at` của migration R3.

**Backend**

- [ ] `services/plan.service.ts`, hàm mới `replanAfterPlacementLocked(manager, goal, plan)`:
  1. Điều kiện: mục tiêu ACTIVE; plan là tuần hiện tại và có item `reason = 'PLACEMENT'`; `replanned_after_placement_at IS NULL`; `missingPlacement(profile)` rỗng.
  2. Dựng snapshot mới → `PlanCandidatesService.build()` (đã có bậc truy xuất R3) → `buildRulePlan()` cho phần còn lại của tuần.
  3. Gọi `ReportJobsService.replaceUntouched(manager, goal, plan, null, items, today)` có sẵn từ GĐ7. Hàm này đã đóng băng ngày có tiến độ, ngày đã qua, và bỏ qua nếu đề vừa bị lưu trữ.
  4. Đặt `replanned_after_placement_at = now()` trong cùng transaction.
- [ ] Dùng lịch RULE, không gọi AI: không trễ, không tốn quota. Báo cáo cuối tuần vẫn do AI viết như cũ.
- [ ] Điểm kích hoạt, không tạo phụ thuộc vòng giữa module:
  - `workers/personalization.worker.ts`: mỗi lượt 60 giây quét plan đủ điều kiện (tối đa 50, `FOR UPDATE SKIP LOCKED`), khoá user bằng `goals.lockUser` rồi gọi hàm trên.
  - `PlanService.current()` và `sync()`: kiểm tra cùng điều kiện khi người dùng mở Dashboard, nên thường thấy lộ trình mới ngay.
  - Không gọi từ `PersonalizationProgressService.afterLearning()`: module tiến độ cố ý không phụ thuộc service lập kế hoạch (README personalization).
- [ ] Overview API trả thêm `plan.replannedAfterPlacementAt`.

**Frontend**

- [ ] `StudyPlanCard.jsx`: thông báo một lần “Lộ trình tuần này đã được điều chỉnh theo kết quả đánh giá đầu vào”, có nút đóng. Trạng thái đã đóng lưu `localStorage` theo `planId`, bọc try/catch.
- [ ] `AbilityAssessmentCard.jsx`: sửa câu nhắc thành “Hoàn thành 3 bài đánh giá để lộ trình được điều chỉnh ngay”.
- [ ] Khoá i18n vi/en.

**Kiểm thử (PostgreSQL)**

- [ ] Xong bài đánh giá thứ 3 vào ngày 3: ngày 4–7 được thay, ngày 1–3 giữ nguyên, cờ được đặt.
- [ ] Chạy worker lần hai và gọi `current()` đồng thời: không xếp lại lần nữa.
- [ ] Mới xong 2/3 bài: không xếp lại. Người đã có band từ trước (không có item PLACEMENT): không xếp lại.
- [ ] Ngày 4 đã làm một việc trước khi worker chạy: ngày 4 giữ nguyên, chỉ thay ngày 5–7.
- [ ] Browser: thông báo hiện một lần, đóng xong không hiện lại.

**Nghiệm thu R4:** kịch bản “bạn Lan” chạy đúng trên DB local: sau bài đánh giá cuối, tối đa 60 giây là lộ trình đổi, và đề ngày 4 khớp với câu sai trong bài đánh giá.

### R5 — Kho lỗi người học và báo cáo tuần có trích dẫn (4 ngày)

Nhánh `feat/rag-r5-grounded-report`. Báo cáo WEEKLY/MIDTERM nêu được **nhóm lỗi lặp lại** trong tuần, và mỗi `nextStep` gắn với một bài học có thật.

**Database:** migration `1760000027000-AddLearnerErrorChunks`, kèm trigger `enqueue_learner_errors` trên `test_attempts` viết theo mẫu `enqueue_topic_evidence()` (kích hoạt khi `status`, `result` hoặc `assessment_revision` đổi).

**Backend — kho lỗi**

- [ ] `features/retrieval/learner-errors.worker.ts`: lấy job bằng `FOR UPDATE SKIP LOCKED`, xoá dòng của revision cũ, tạo dòng mới:
  - `OBJECTIVE_MISTAKE`: **không gọi embed**, sao chép vector từ `question_embeddings` của câu sai.
  - `WRITING_CORRECTION`, `WRITING_WEAKNESS`: lấy từ `result.writing.details` (`corrections`, `weaknesses`), tối đa 10 mục mỗi bài, gọi `embedMany()`.
- [ ] `features/personalization/services/error-patterns.service.ts`, hàm `forPeriod(manager, userId, from, to)`:
  1. Đọc lỗi trong kỳ của chính user.
  2. Mỗi lỗi tìm bài học gần nhất trong kho kiến thức bằng vector có sẵn.
  3. Nhóm theo bài học, xếp theo số lỗi, lấy tối đa 5 nhóm: `{patternId, lessonTitle, chunkId, count, components, priorCount}`. `priorCount` = số lỗi cùng nhóm trước kỳ, dùng để nói “lặp lại”.
- [ ] `services/snapshot.service.ts`: thêm `errorPatterns` vào snapshot báo cáo, tăng `SNAPSHOT_VERSION` lên 6. Chỉ đưa số đếm và bài học vào prompt, không đưa văn bản người học viết (giữ quy tắc cũ “không trích lại nội dung bài làm”).
- [ ] `ai/report.contract.ts`:
  - `ReportJob` thêm `sources: [{chunkId, title, excerpt ≤ 400 ký tự}]` từ các nhóm lỗi.
  - Schema `report` thêm `citations: [{nextStepIndex, chunkId?, candidateId?}]`; giữ `nextSteps` là mảng chuỗi nên frontend cũ vẫn đọc được.
  - Validator: mỗi `nextStep` có ít nhất một trích dẫn hợp lệ; số lỗi nhắc trong văn bản phải có trong `errorPatterns` (mở rộng `groundedTextIssues`).
  - Tăng `REPORT_PROMPT_VERSION` lên `personal-weekly-v7`. FINAL áp dụng tương tự và tăng `FINAL_PROMPT_VERSION`.
- [ ] `services/insight-context.service.ts` (GĐ9): đưa `sources` vào ngữ cảnh chatbot để câu trả lời trích cùng bài học.
- [ ] API mới `GET /api/v1/me/knowledge/chunks/:id`: trả nội dung đoạn có `access_scope = 'LEARNER'` để xem bài học.
- [ ] Báo cáo đã READY trước R5 không viết lại.

**Frontend**

- [ ] `WeeklyReportPage.jsx`:
  - Khối mới “Lỗi lặp lại trong tuần”: tên bài học · số lỗi · “đã gặp N lần trước đó”.
  - Dưới mỗi bước tiếp theo: chip “Bài học: …” mở `Modal` chung hiển thị nội dung bài học; chip “Đề gợi ý” dẫn tới đề.
  - Báo cáo cũ không có `citations`: hiển thị như hiện tại.
- [ ] Khoá i18n vi/en.

**Kiểm thử**

- [ ] PostgreSQL: trigger xếp job; chấm lại thay revision cũ; không đọc được lỗi của user khác; xoá user cascade; migration up/down/up.
- [ ] Unit: gom nhóm lỗi; validator từ chối `nextStep` không trích dẫn hoặc trích `chunkId` lạ; số lỗi bịa.
- [ ] Hồi quy GĐ7–GĐ9 và S5 (statusEcho, bandClaim, retry/fallback).
- [ ] Browser: khối lỗi lặp lại, modal bài học, báo cáo cũ.

**Nghiệm thu R5:** tỷ lệ báo cáo qua validator ngay lần đầu ≥ 90% trên bộ smoke tổng hợp (`ai:personalization:smoke`); không có trích dẫn nào trỏ tới đoạn không tồn tại.

### R6 — Admin: độ phủ học liệu và thiếu hụt (2 ngày)

Nhánh `feat/rag-r6-admin`. Admin biết cần soạn thêm đề hay bài học cho dạng nào dựa trên số liệu thiếu hụt thật.

**Database:** không có migration mới.

**Backend** — controller mới `features/retrieval/admin-rag.controller.ts`, chỉ ADMIN:

| API | Trả về |
| --- | --- |
| `GET /admin/rag/status` | Số câu đã embed / số câu của đề PUBLISHED theo kỹ năng; job đang chờ / lỗi; mã chủ đề chưa có bài `LESSON`; tiêu chí chưa có `CRITERION_GUIDE` |
| `GET /admin/rag/gaps?feature&component&from&to&page&pageSize` | Thiếu hụt gộp theo kỹ năng · Part · chủ đề, kèm số lần, số người học khác nhau, độ tương đồng cao nhất trung bình, tối đa 3 câu nguồn mẫu |
| `POST /admin/rag/reembed` | Xếp hàng embed lại theo kỹ năng hoặc toàn bộ; có audit; giữ job đang chạy |

- [ ] Phân trang bằng helper `common/pagination` có sẵn; `pageSize` 1–100.
- [ ] `personalization.worker.ts`: xoá `retrieval_gaps` cũ hơn 180 ngày.

**Frontend** — trang mới `features/admin/rag/RagPage.jsx` + `ragApi.js`, mục sidebar **“Học liệu AI”** đặt cạnh “Quản lý chủ đề”, ba tab:

1. **Độ phủ:** 5 khung thống kê embed theo kỹ năng (cùng kiểu khung độ phủ chủ đề ở GĐ10); danh sách chủ đề thiếu bài học.
2. **Thiếu hụt:** bảng xếp theo số lần, lọc kỹ năng/tính năng/khoảng ngày; bấm câu mẫu mở trình sửa đề tương ứng.
3. **Thao tác:** nút embed lại có `ConfirmModal`, tiến độ poll 10 giây như trang chủ đề.

- [ ] Dùng lại `Button`, `Modal`, `ConfirmModal`, `Pagination`, `PageLoader`; tông đỏ admin; mobile xếp thẻ.
- [ ] Thêm route trong `adminRoutes.jsx`, khoá i18n vi/en.

**Kiểm thử:** PostgreSQL (quyền ADMIN, STUDENT bị 403, gộp và phân trang đúng, xoá 180 ngày); browser trang admin Anh–Việt, thêm vào `adminResponsive.browser.test.mjs`.

**Nghiệm thu R6:** admin nhìn thấy dạng thiếu nhiều nhất; embed lại một kỹ năng chạy xong và độ phủ trở về 100%.

### R7 — Đánh giá và hiệu chỉnh ngưỡng (2 ngày)

Nhánh `feat/rag-r7-evaluation`. Tạo số liệu cho chương thực nghiệm của đồ án và chốt giá trị ngưỡng.

- [ ] Script `scripts/rag-eval.ts`, lệnh `npm run rag:eval`, đọc bộ nhãn R0 và ghi kết quả vào `docs/PERSONALIZATION_RAG_EVAL.md`.
- [ ] **Truy xuất:** Recall@1/3/5 và MRR cho ba cách (từ khóa, vector, kết hợp RRF), tách theo kho kiến thức và kho câu hỏi, tách theo kỹ năng.
- [ ] **Ngưỡng:** quét độ tương đồng 0,50–0,90 bước 0,05; chọn mức thấp nhất có precision ≥ 0,8; cập nhật `.env.example` và báo cáo.
- [ ] **Chọn đề:** với mỗi câu sai trong bộ nhãn, so đề xếp đầu bởi R3 với đề chọn ngẫu nhiên theo cách cũ (trung bình 20 seed): số câu tương tự đúng trong đề.
- [ ] **Sinh văn bản:** tỷ lệ qua validator lần đầu (đếm từ bản ghi AI request); chấm tay 30 giải thích và 10 báo cáo theo 3 tiêu chí (đúng kiến thức, bám nguồn, dễ hiểu), thang 1–5.
- [ ] **Vận hành:** truy vấn DB tỷ lệ hoàn thành item bậc 1 so với bậc 3, tỷ lệ thiếu hụt theo tuần. Ghi rõ đây là số liệu quan sát, chưa phải thử nghiệm có đối chứng.

**Nghiệm thu R7:** báo cáo đánh giá có đủ các bảng trên; ngưỡng trong `.env.example` khớp với kết quả quét.
