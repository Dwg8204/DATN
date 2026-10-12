# Kế hoạch triển khai chấm Writing bằng AI — bản thử nghiệm

Ngày: 11/10/2026. Trạng thái: **đề xuất triển khai**, chưa nối API, chưa tạo migration, chưa chạy chấm thực tế. Dataset và hiệu chỉnh độ chính xác được tạm hoãn theo yêu cầu. Các kiểm thử luồng dữ liệu và lỗi hệ thống vẫn cần làm.

**Cập nhật sau pull, đối chiếu HEAD `2e3a721`:** Speaking đã có chấm AI thật trong code. Bản này thay thế các giả định cũ về provider, method AI, polling và hàng đợi. Chỉ kế hoạch Writing được sửa; không thay code Speaking, không đọc/in giá trị key, không gọi API thật để tiêu thụ quota. Người dùng đã cấu hình key; tái sử dụng `GEMINI_API_KEY` hiện có.

## 1. Kết quả cần đạt

| Loại bài | CEFR | Trang kết quả | Trang kết quả chi tiết |
|---|---|---|---|
| Writing Full | CEFR Writing ước lượng của toàn bộ bài | Nhận xét toàn bài và nhận xét ngắn cho từng Part | Điểm mạnh/yếu từng Part; đánh giá từng câu; lỗi, cách sửa và góp ý cho Part |
| Writing một Part | Không có CEFR | Nhận xét tổng quát bài làm của Part đó và tóm tắt Part | Cùng cấu trúc chi tiết như Full, chỉ chứa Part đã làm |

Một lần chấm tạo **một kết quả có hai phần `summary` và `details`**. Hai trang lấy các phần tương ứng từ dữ liệu đã lưu; mở trang chi tiết hoặc tải lại trang không gọi AI thêm lần nữa.

CEFR Full Writing hoàn toàn độc lập với kết quả Grammar, Reading, Listening và Speaking. Quyết định Full/Part dựa trên `test_attempts.scope`, không dựa vào URL frontend. Với Full Practice cũng áp dụng Full; lưu rõ việc đã xem bài mẫu/gợi ý để người dùng biết kết quả có hỗ trợ.

Các trường hợp ngoại lệ có chủ đích:

- Bài trắng: lưu đủ trạng thái bỏ trống và góp ý, `cefr.level = null`, lý do `NO_RESPONSE`; không ép A1.
- Bài quá ít bằng chứng: `cefr.level = null`, lý do `INSUFFICIENT_EVIDENCE`; vẫn có đánh giá các câu đã viết.
- Một vài câu bỏ trống: vẫn đưa đủ 11 câu vào kết quả, đánh giá mức đáp ứng nhiệm vụ; chỉ xuất CEFR nếu bằng chứng đủ cho kết luận toàn bài. Không có ngưỡng số từ tự động để gán CEFR.
- Lỗi API: trạng thái thất bại/chờ thử lại, không biến thành mức A1 hoặc điểm 0.

**Đề xuất cho MVP:** hiển thị CEFR và nhận xét làm kết quả chính, chưa tự tạo thang điểm số Aptis `/50`. Yêu cầu hiện tại xác định rõ CEFR nhưng chưa chốt công thức điểm số. Giữ `score`/`max_score` bằng NULL và sửa UI để kết quả AI hoàn thành có thể hiển thị dù chưa có điểm số. Nếu tiếp tục yêu cầu điểm số, phải chốt rubric/trọng số riêng; không nhân một tổng điểm nội bộ thành CEFR. Đây là lựa chọn đề xuất của kế hoạch, không phải thang chấm đã được phê duyệt.

## 2. Những gì đã có và cần nối thêm

Đã đọc code hiện tại:

- `writing-paper.adapter.ts` tạo câu TEXT với `points: 0`; keys Part 1 `p1:q1`–`p1:q5`, Part 2 `p2:q1`, Part 3 `p3:q1`–`p3:q3`, Part 4 `p4:q1` và `p4:q2`.
- Exam submit dùng `PENDING_AI`, repository lưu `grading_status = QUEUED`. Chưa có worker chấm Writing.
- `PracticeAttemptsService.complete()` hiện giữ `PENDING_AI` cho SPEAKING, chuyển các kỹ năng còn lại thành `UNASSESSED`. Thêm ngoại lệ WRITING khi Writing AI bật, tuyệt đối giữ nguyên ngoại lệ SPEAKING.
- Đã có `test_snapshots`, `test_attempts`, `attempt_progress`, `assessment_revision`, `grading_status`, `result JSONB`, `estimated_cefr` và `result_source`.
- `result_source` hiện chỉ có `AUTOMATIC` và `TEACHER`: dùng `AUTOMATIC`, phân biệt chấm AI bằng `result.method = AI` và metadata; không cần thêm enum AI.
- `AssessmentResult` **đã có `method = AI`**, `gradingNotice`, `speaking` và `items[].assessment` của Speaking. Chỉ bổ sung `writing`, không tái định nghĩa AI thành Writing hoặc thay cấu trúc assessment của audio.
- `WritingResultPage` và `WritingResultDetailPage` đã có khung kết quả, câu đã nộp và bài mẫu. Feedback/AI Answer hiện chưa có dữ liệu thật.
- `useAttemptResult` **đã polling riêng SPEAKING** mỗi 5 giây, tối đa khoảng 60 lần, giữ dữ liệu cũ khi lỗi mạng tạm thời. `useAttemptPartResult` đã có tham số thứ tư `refreshKey`; Speaking dùng revision để tải lại chi tiết. Writing chưa có polling; bổ sung riêng, không viết lại hành vi Speaking.

Đáp án chuẩn lấy từ `attempt_progress.answers` đã khóa; đề lấy snapshot của attempt. Không lấy đề mới nhất trong bảng tests để chấm một bài cũ.

### 2.1. Luồng Speaking hiện có — vùng phải giữ nguyên

1. `SpeakingAiConsentGate` gọi `/speaking-grading/:attemptId/consent`; backend dùng policy/version và xác nhận điều kiện tuổi, Free/Paid.
2. Exam/Practice nộp audio, khóa progress, lưu PENDING_AI. `ObjectiveGraderService` có nhánh SPEAKING riêng qua `assessSpeaking`.
3. `SpeakingGradingWorker` chạy mỗi 5 giây khi enabled; `SpeakingGradingRepository.claim()` tự tạo job từ attempt SPEAKING đã nộp và consent đúng policy. Đây là cơ chế riêng, không giống enqueue Writing trong transaction submit.
4. Provider kiểm tra model, tải/chuẩn hóa audio bằng FFmpeg, tải ảnh đề khi có; Groq `whisper-large-v3` tạo transcript và cache. Gemini nhận audio + transcript + ảnh/context và rubric Speaking.
5. Trước generateContent có countTokens, reserve ngân sách trong `speaking_ai_costs`; sau đó charge theo usage. Có lease 10 phút, renew, cache assessment, retry/blocked riêng.
6. `finalizeSpeaking()` giữ điểm nội bộ /50, bốn tiêu chí, CEFR ước lượng và feedback/transcript từng câu. Repository ghi result, tăng assessment_revision; UI đọc `result.speaking` và `items[].assessment`.

Các file nền tảng (đường dẫn tương đối repository):

| Nhóm | File hiện có, không đổi trong MVP Writing |
|---|---|
| Config/provider | `backend/src/features/test-attempts/services/speaking-ai-config.service.ts`, `speaking-ai-provider.service.ts` |
| Audio | `backend/src/features/test-attempts/services/speaking-audio.service.ts` |
| Rubric/finalizer | `backend/src/features/test-attempts/assessments/speaking-ai-policy.ts`, `speaking-assessment.ts` |
| Job | `backend/src/features/test-attempts/workers/speaking-grading.worker.ts`, `repositories/speaking-grading.repository.ts` |
| Consent/budget | `backend/src/features/test-attempts/controllers/speaking-grading.controller.ts` |
| Migration | `backend/src/database/migrations/1760000011000-AddSpeakingAiGrading.ts` |

### 2.2. Ranh giới tái sử dụng

- Dùng cùng Gemini Developer API, `GEMINI_API_KEY`, model mặc định **`gemini-3.1-flash-lite`** đang được `SpeakingAiConfig.model` khai báo. Không phải Gemini 2.5 và không còn chọn 3.5 như kế hoạch trước.
- Không inject `SpeakingAiProvider` vào Writing: `assess()` phụ thuộc audio, speaking job, rubric và ngân sách Speaking. Không giả lập audio để gửi text.
- MVP Writing thêm adapter text nhỏ theo đúng cách gọi REST Gemini hiện có. Chấp nhận trùng phần HTTP mỏng để không refactor code đang chạy của dev khác. “Dùng chung API” không có nghĩa bắt buộc dùng chung service nghiệp vụ.
- Chưa chuyển Speaking sang `common/ai`; việc gom transport sau này là task riêng cần dev Speaking phối hợp và test hồi quy. Cấu trúc mới chỉ phục vụ Writing ở giai đoạn này.
- Cùng key/project/model vẫn dùng chung quota upstream. Có thể giảm rủi ro bằng Writing concurrency 1, nhịp chậm và không chạy bài thử đồng thời Speaking; **không cam kết cách ly quota tuyệt đối chỉ bằng tách bảng/worker**. Muốn bảo đảm tuyệt đối phải có project riêng hoặc limiter chung được phê duyệt; không lén sửa Speaking để đạt điều này.

## 3. API miễn phí cho giai đoạn thử

### 3.1. Lựa chọn đề xuất

Sử dụng **Gemini Developer API**, model khởi đầu **`gemini-3.1-flash-lite`**, khớp SpeakingAiConfig và test provider hiện tại. Không nâng/hạ model Speaking. Giá/quota thực tế phải kiểm tra ở project đang dùng; không suy ra miễn phí chỉ vì tên model. [Bảng giá chính thức](https://ai.google.dev/gemini-api/docs/pricing).

Không khởi đầu project mới bằng Gemini 2.5: tài liệu hiện giới hạn dòng này cho người dùng đã sử dụng trước đó. Model phải nằm trong cấu hình, không hardcode trong nghiệp vụ. [Vòng đời model](https://ai.google.dev/gemini-api/docs/deprecations).

Lý do chọn: có Free Tier phù hợp thử ít bài, hỗ trợ đầu ra có cấu trúc và chỉ cần text API; không cần tự vận hành GPU. Chưa cần so sánh mọi model hoặc mua gói trả phí. Quyết định này tối ưu việc thử luồng, **không khẳng định đây là model chấm tốt nhất hoặc API miễn phí không giới hạn**. Nếu project không được cấp quota, dừng bước tích hợp thật và chọn model có Free Tier trong project; không tự bật thanh toán.

Không ghi cố định “X request/ngày” trong ứng dụng. Quota phụ thuộc model/project/tier và xem trực tiếp ở AI Studio; giới hạn tính theo project, không tăng quota bằng cách tạo thêm key. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Free Tier có điều khoản dùng nội dung để cải thiện sản phẩm. Giai đoạn test dùng bài tự viết và loại bỏ thông tin định danh trước gửi. [Bảng giá và xử lý dữ liệu](https://ai.google.dev/gemini-api/docs/pricing).

Chạy một call cho Full hoặc một Part; không mặc định gọi 11 call, không dùng Search, chatbot, agent hay upload file. Nội dung Writing chỉ cần gửi text.

### 3.2. Lấy key và kiểm tra quyền sử dụng

**Ở checkout hiện tại người dùng đã thêm key: bỏ qua tạo key/project mới.** Chỉ kiểm tra cấu hình qua backend/smoke khi triển khai; không ghi đè `.env`, không gửi key vào chat. Danh sách dưới dành cho máy triển khai mới hoặc cần cấp lại key:

1. Đăng nhập [Google AI Studio](https://aistudio.google.com/).
2. Mở [API Keys](https://aistudio.google.com/apikey), chọn/tạo project dùng cho AptiMate thử nghiệm, rồi tạo key. AI Studio có thể tạo project mặc định cho tài khoản mới; tài khoản đã có project có thể cần import project.
3. Kiểm tra project đang dùng Free Tier và có quota cho model lựa chọn. Giai đoạn thử giữ project ở Free Tier; không cần chủ động bật billing.
4. Lưu key ở máy phát triển trong `backend/.env`; không đưa key vào frontend, biến `VITE_*`, database hoặc Git.
5. Giới hạn key cho Gemini API trong AI Studio. Tạo key mới theo hướng dẫn hiện hành của Google; không sao chép lại key cũ không còn được hỗ trợ.
6. Khởi động lại backend sau khi đổi `.env`.
7. Chạy script backend `npm run ai:writing:smoke` dự kiến sẽ bổ sung: gửi một câu tự viết không chứa dữ liệu học viên và yêu cầu JSON nhỏ. Script chỉ in `OK`, model, thời gian hoặc mã lỗi an toàn, không in key.

Hướng dẫn quản lý project/key và môi trường: [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key). Chưa cần người dùng gửi key trong chat; việc tạo key là bước thao tác trong tài khoản của người dùng.

### 3.3. Cấu hình backend đề xuất

```dotenv
WRITING_AI_ENABLED=false
WRITING_AI_PROVIDER=gemini
WRITING_AI_MODEL=gemini-3.1-flash-lite
WRITING_AI_REQUEST_TIMEOUT_MS=60000
WRITING_AI_MAX_OUTPUT_TOKENS=8192
WRITING_AI_WORKER_CONCURRENCY=1
WRITING_AI_MIN_INTERVAL_MS=15000
WRITING_AI_MAX_ATTEMPTS=3
# GEMINI_API_KEY: tái sử dụng giá trị đã có, KHÔNG ghi đè bằng rỗng.
# GEMINI_BILLING_TIER / GEMINI_FREE_PROJECT_CONFIRMED /
# GEMINI_PAID_PROJECT_CONFIRMED: chỉ đọc cấu hình hiện có, không đổi cho Speaking.
```

Các biến này **chưa tồn tại như chức năng đã triển khai**. Khi code, thêm giá trị mẫu vào `.env.example`, mapping vào `configuration.ts` và validation vào `env.validation.ts`.

- `WRITING_AI_ENABLED=false`: không ảnh hưởng `SPEAKING_AI_ENABLED`; UI Writing thông báo chưa bật chấm, không tạo hàng đợi vô hạn.
- Khi enabled, thiếu key hoặc provider không được hỗ trợ: báo cấu hình không hợp lệ sớm.
- `8192` là trần output để đủ nhận xét 11 câu, không phải token luôn tiêu thụ. Part có thể dùng trần nhỏ hơn; giới hạn chiều dài nhận xét trong schema/prompt.
- Khoảng cách 15 giây chỉ là mức khởi đầu thận trọng, cần điều chỉnh theo quota project thực tế.
- Không có auto-fallback sang model trả phí. Model unavailable/quota bằng 0 phải báo rõ rồi chọn model Free Tier có quota trong cùng adapter.

`WritingAiConfig` đọc `GEMINI_API_KEY` qua ConfigService, không inject SpeakingAiConfig để tránh kéo theo Groq/Cloudinary/FFmpeg. Giữ toàn bộ `SPEAKING_*`, `GROQ_*`, giá Gemini và các flag xác nhận hiện có. Speaking config mặc định tier PAID; vì Writing thử nghiệm không có ledger chi phí, chỉ cho bật Writing khi tier là FREE, free-confirmed=true và paid-confirmed=false. Nếu project hiện là PAID, trả lỗi cấu hình Writing rõ ràng và dừng, không đổi cờ chung thành FREE để vượt kiểm tra. Muốn Writing chạy trên PAID cần kế hoạch ngân sách riêng được duyệt; cap $1 của Speaking **không bao phủ Writing**.

### 3.4. Ghép API vào ứng dụng

Đề xuất dùng REST qua `fetch` trong backend để giảm phụ thuộc SDK; chỉ adapter Gemini biết endpoint, header và envelope của Google:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
Content-Type: application/json
x-goog-api-key: <đọc từ backend env>
```

Request gồm system instruction, payload đề/bài làm và generation config yêu cầu JSON theo schema. Không gắn key trong URL hoặc log. Adapter kiểm tra HTTP status, safety block, finish reason, text và JSON; dùng timeout thực sự qua AbortController.

Gemini có structured output theo JSON Schema. Adapter ánh xạ schema chung sang cấu hình Google hỗ trợ tại thời điểm triển khai; schema phức tạp cần thử bằng smoke test. JSON đúng cấu trúc vẫn phải qua kiểm tra nghiệp vụ của backend. [Structured outputs cho generateContent](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [generateContent reference](https://ai.google.dev/api/generate-content).

Envelope dự kiến bên trong adapter (mã minh họa, không phải toàn bộ implementation):

```ts
const body = {
  systemInstruction: { parts: [{ text: request.systemInstruction }] },
  contents: [{ role: 'user', parts: [{ text: JSON.stringify(request.input) }] }],
  generationConfig: {
    maxOutputTokens: request.maxOutputTokens,
    temperature: 0,
    candidateCount: 1,
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(request.outputSchema),
  },
};
// fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal });
// Kiểm tra status/finishReason; bỏ các part nội bộ không phải câu trả lời;
// parse phần text cuối thành unknown rồi validate tại lớp nghiệp vụ.
```

Google hiện đánh dấu tài liệu generateContent là Legacy. MVP cô lập transport này trong adapter; nếu phải chuyển sang Interactions thì chỉ thay adapter và contract test, không đổi rubric/database/UI. Không triển khai cả hai transport cùng lúc.

Smoke script cần chạy qua đúng adapter/config của app (không dùng key khác trên trình duyệt). Chỉ thành công khi HTTP thành công, JSON qua schema và có nội dung mong đợi. `401/403`: kiểm tra key/quyền/project; `404`: kiểm tra model/endpoint; `429`: xem quota AI Studio; timeout/5xx: báo lỗi có thể thử lại. Smoke thành công mới đặt `WRITING_AI_ENABLED=true` và nộp một bài Part thử; đây mới là kiểm tra kết nối, chưa chứng minh chấm đúng. Smoke phải áp dụng cùng kiểm tra tier FREE và giới hạn output, không gửi audio hay gọi Groq.

Envelope dùng `responseMimeType/responseSchema` giống code Speaking hiện tại. `toGeminiSchema` là hàm mới cần triển khai/test, không phải API có sẵn; chỉ chuyển schema Writing sang tập cấu trúc Gemini hỗ trợ (nullable, enum, required, array), backend vẫn validate đầy đủ. Không sửa `SPEAKING_RESPONSE_SCHEMA` hay cấu hình thinking của Speaking để phục vụ Writing.

Luồng kết nối:

```text
React → API AptiMate → khóa đáp án + tạo job → PostgreSQL
                                              ↓
                                           Worker
                                              ↓
                              WritingAssessmentService
                                              ↓
                                    AiProvider interface
                                              ↓
                                     Gemini REST adapter
                                              ↓
                         JSON → validation → lưu kết quả
                                              ↓
                         API kết quả → React polling → UI
```

## 4. Cấu trúc thư mục để dễ đổi nhà cung cấp

```text
backend/src/common/ai/
  ai-provider.interface.ts          # Yêu cầu/trả lời trung lập với provider
  ai-provider.token.ts              # Injection token của NestJS
  ai-provider.factory.ts            # Chọn adapter theo env
  ai.module.ts                     # Export provider cho module Writing
  ai-error.ts                      # Chuẩn hóa AUTH/RATE_LIMIT/TIMEOUT/...
  providers/
    gemini.provider.ts             # HTTP, auth, envelope, schema mapping

backend/src/features/writing-assessment/
  writing-assessment.module.ts
  writing-ai-config.service.ts     # Chỉ WRITING_* + key/tier Gemini hiện có
  contracts/
    writing-assessment-input.ts
    writing-assessment-output.ts
    writing-assessment.schema.ts
  rubrics/
    writing-rubric-v1.ts
    writing-cefr-descriptors-v1.ts
  prompts/
    writing-system-v1.ts
    writing-prompt-builder.ts
  services/
    writing-input-builder.service.ts
    writing-assessment.service.ts
    writing-assessment-validator.service.ts
    writing-cefr-policy.service.ts
    writing-result-presenter.service.ts
  repositories/
    writing-grading-jobs.repository.ts
  workers/
    writing-assessment.worker.ts

frontend/src/features/writing/components/assessment/
  WritingAssessmentStatus.jsx
  WritingAiSummary.jsx
  WritingPartOverview.jsx
  WritingPartFeedback.jsx
  WritingQuestionFeedback.jsx
  WritingCorrectionList.jsx

frontend/src/features/writing/hooks/
  useWritingAssessmentPolling.js
```

Không gộp prompt Writing vào `gemini.provider.ts`. Provider chỉ chịu trách nhiệm gửi yêu cầu; rubric, CEFR và các trang không phụ thuộc Google.

Interface dự kiến:

```ts
interface AiProvider {
  generateStructured(request: {
    model: string;
    systemInstruction: string;
    input: unknown;
    outputSchema: object;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<{ output: unknown; finishReason: string }>;
}
```

Khi đổi sang API khác:

1. Thêm adapter mới triển khai interface này và schema mapping của provider đó.
2. Đăng ký factory, thêm tên key tương ứng vào cấu hình/validation.
3. Đổi `WRITING_AI_PROVIDER`, `WRITING_AI_MODEL` và key của adapter mới; không đổi cấu hình Speaking. Với Gemini dùng key chung hiện tại, không tự xoay key vì sẽ ảnh hưởng Speaking.
4. Chạy contract/smoke test. Không thay schema lưu kết quả hay các component React.

Đổi provider thuận tiện về kỹ thuật không đồng nghĩa điểm sẽ tương đương. Lưu provider/model/rubric version của lần chấm để biết nguồn kết quả; bài đã lưu không tự bị chấm lại khi đổi env.

Quy tắc module: `AiModule` mới không import Writing/Speaking và chưa thay provider nào của Speaking. `WritingAssessmentModule` dùng `AiModule` và DB chung, export dịch vụ enqueue nhận transaction manager. `TestAttemptsModule` chỉ thêm import WritingAssessmentModule, giữ nguyên toàn bộ provider/controller Speaking. Worker Writing đọc DB qua repository chuyên trách, không import ngược TestAttemptsModule/controller/service submit, tránh vòng phụ thuộc. Nếu cần paper builder, tách hàm thuần Writing hoặc dùng snapshot trực tiếp theo adapter hiện có; không tự di chuyển AssessmentPaperFactory khỏi module chung.

**Chưa làm RAG ở MVP.** Rubric và descriptors được version hóa trong code là ngữ cảnh đủ để thử luồng. Chưa thêm vector database, embedding, bảng tài liệu hay truy xuất bài mẫu. Sau này có thể thêm `AssessmentContextProvider` vào prompt builder để truy xuất tài liệu rubric đã kiểm duyệt; không phải sửa adapter. Bỏ dataset đối chiếu không ngăn gọi API, nhưng chưa thể xác nhận độ tin cậy của CEFR.

## 5. Database: chỉ thêm một bảng chính

### 5.1. Tái sử dụng các bảng đã có

| Bảng | Vai trò |
|---|---|
| `test_snapshots` | Đề bất biến đúng phiên bản học viên đã làm |
| `test_attempts` | Trạng thái, kết quả cuối, CEFR, revision |
| `attempt_progress` | Đáp án thật đã khóa sau khi nộp |

Kết quả AI lưu trong `test_attempts.result`; không cần thêm bảng feedback/question assessment cho từng câu. JSONB có cấu trúc là đủ cho MVP.

Thêm một cột nhỏ vào bảng hiện có: `test_attempts.feedback_locale varchar(5) NOT NULL DEFAULT 'vi' CHECK (feedback_locale IN ('vi','en'))`. Lưu từ lúc start để đường tự nộp khi hết giờ vẫn biết ngôn ngữ nhận xét; submit/complete được cập nhật trước khi enqueue, sau đó job giữ bản chụp bất biến. Không nhét cấu hình này vào answers hoặc progress do client autosave. Đây là thay đổi cột, không phải bảng mới.

Các bảng AI request/budget/learning/chat đã có trong schema nhưng chưa cần nối vào chức năng này. Không thêm bảng thống kê token, chi phí, dashboard AI hoặc dataset.

### 5.2. Bảng mới `writing_grading_jobs`

Bảng này quản lý công việc chấm để app restart vẫn tiếp tục được. Một job tương ứng một attempt/revision, Full hay Part đều một job.

Đổi tên từ `assessment_jobs` trong bản cũ thành `writing_grading_jobs` để nói rõ phạm vi. Giữ nguyên ba bảng Speaking đã có: `speaking_grading_jobs`, `speaking_ai_consents`, `speaking_ai_costs`. Không chuyển dữ liệu, đổi constraint, dùng chung ledger hoặc xóa bảng của dev khác. Migration mới có timestamp riêng sau migration Speaking, không sửa `1760000011000-AddSpeakingAiGrading.ts`.

| Cột | Kiểu đề xuất | Mục đích |
|---|---|---|
| `id` | UUID PK | Mã công việc |
| `attempt_id` | UUID FK | Attempt cần chấm |
| `assessment_revision` | integer | Phiên bản chấm, khác revision autosave |
| `status` | varchar + CHECK | QUEUED, PROCESSING, COMPLETED, FAILED |
| `input_hash` | varchar(64) | Nhận diện snapshot/đáp án/cấu hình được chấm |
| `config_snapshot` | JSONB | Provider, model, prompt/rubric/schema version, feedback locale, generation limits; tuyệt đối không có key |
| `attempt_count` | integer | Số lần gọi đã thử |
| `available_at` | timestamptz | Thời điểm worker được retry |
| `lease_token` | UUID nullable | Quyền của worker đang xử lý |
| `lease_expires_at` | timestamptz nullable | Phục hồi job bị worker bỏ dở |
| `error_code` | varchar nullable | Lỗi chuẩn hóa, an toàn để trả UI |
| `created_at`, `updated_at` | timestamptz | Thời điểm tạo/cập nhật |
| `completed_at` | timestamptz nullable | Chấm xong/thất bại cuối |

Constraints/index:

- UNIQUE `(attempt_id, assessment_revision)` ngăn submit lặp tạo nhiều job.
- FK `attempt_id` cùng chính sách xóa với attempt; CHECK revision/count không âm.
- Repository kiểm tra component WRITING cả lúc enqueue và claim bằng JOIN attempt; FK một mình không kiểm tra kỹ năng. Test cố tình đưa attempt Speaking vào bảng job Writing phải bị từ chối khi chạy, không tạo kết quả Writing cho audio.
- Index `(available_at, created_at)` cho job QUEUED; index lease hết hạn cho PROCESSING.
- Không có cột kết quả trùng lặp trong job: kết quả học viên chỉ lưu ở attempt.

Migration mới tạo bảng; dùng các trạng thái attempt hiện có. TypeScript đã có method AI: chỉ thêm cấu trúc `writing`, giữ đọc được kết quả Speaking cũ/mới. Không sửa migration cũ để thêm bảng. Mọi enqueue/claim/finish/fail/retry Writing đều kiểm tra `test_attempts.component='WRITING'`; không lọc chỉ bằng `method='PENDING_AI'` vì Speaking cũng dùng giá trị đó.

### 5.3. Hai revision cần phân biệt

- `attempt_progress.revision`: chống ghi đè khi autosave, không còn thay đổi sau submit.
- `test_attempts.assessment_revision`: chống worker cũ ghi kết quả vào lần chấm mới.

Trong Writing, enqueue lấy revision hiện tại + 1 rồi lưu vào job; không hardcode 1 vì repository chung có thể đã tăng revision lúc complete. Retry tự động giữ revision của job, tăng attempt_count; retry thủ công tạo revision mới. Speaking hiện tăng assessment_revision ở claim/finish/fail để thông báo thay đổi UI: **giữ nguyên semantics Speaking**, không áp đặt revision cố định của job Writing lên worker Speaking. UI Writing refresh detail bằng trạng thái COMPLETED cùng revision (vì auto retry không đổi revision). Chấm lại bài thành công là chức năng tương lai, chưa cần nút này.

## 6. Quy trình chấm thống nhất Exam và Practice

### 6.1. Khi nộp bài

1. Xác minh chủ sở hữu, component WRITING và trạng thái attempt.
2. Exam giữ nguyên cơ chế revision/deadline; Practice giữ nguyên chính sách lưu đáp án cuối lúc complete, không thêm autosave/khôi phục tự động.
3. Trong cùng transaction: khóa đáp án, lưu SUBMITTED/PENDING_AI, cập nhật assessment revision, INSERT job QUEUED.
4. Nếu submit/complete bị gọi lại: trả attempt đã lưu, không thêm job.
5. Commit rồi trả HTTP response để học viên chuyển sang trang kết quả.

Trong Practice, giữ nhánh SPEAKING hiện có trước rồi xét WRITING + enabled. Không đổi điều kiện thành “mọi method PENDING_AI đều enqueue Writing”, không biến SPEAKING thành UNASSESSED khi Writing disabled. Trong Exam/expiry cũng chỉ enqueue khi component WRITING. Retry API Writing từ chối attempt SPEAKING dù user sở hữu nó.

Đường submit tay và `finalizeExpiredBatch()` phải gọi cùng helper enqueue để bài hết giờ cũng được chấm. Exam giữ thứ tự khóa progress rồi attempt như luồng hiện tại. Practice hiện khóa attempt rồi tạo progress khi complete: giữ riêng luồng này, không áp dụng máy móc thứ tự của Exam. Worker không cập nhật progress đã khóa; mọi transaction tác động cả job/attempt phải dùng một thứ tự thống nhất, kiểm thử deadlock với retry/submit. Không gọi AI trong transaction hoặc giữ khóa DB trong lúc đợi mạng.

Khi chưa bật AI: vẫn cho nộp Writing, lưu `UNASSESSED/NOT_STARTED`, không tạo job và hiển thị “Chấm AI chưa được bật”. Bật lại cấu hình không tự chấm hàng loạt bài cũ. Khi đã tạo job rồi mới tắt AI: worker ngừng claim; giữ job chờ và hiển thị trạng thái tạm dừng theo khả năng dịch vụ trả từ backend.

### 6.2. Worker

1. Poll PostgreSQL theo nhịp vài giây; tránh chạy chồng một vòng worker.
2. Trong transaction ngắn: claim job bằng `FOR UPDATE SKIP LOCKED`, gán lease token/expiry, đổi PROCESSING và tăng số lần thử.
3. Commit; sau đó đọc snapshot và answers đã khóa, build payload, xác minh hash và gọi provider ngoài transaction.
4. Validate response; chuẩn hóa kết quả `summary`/`details`; áp dụng CEFR policy Full/Part.
5. Trong transaction ngắn, chỉ ghi nếu job vẫn PROCESSING, lease token khớp, attempt vẫn SUBMITTED, revision hiện tại khớp.
6. Ghi `result`, `estimated_cefr`, `result_source=AUTOMATIC`, `grading_status=COMPLETED`, `completed_at`; đổi job COMPLETED cùng transaction.

Lease đề xuất 120 giây với timeout API 60 giây, hoặc heartbeat kéo dài lease khi cần. Worker chết: job hết lease được đưa lại QUEUED. Không cho worker cũ ghi kết quả sau khi lease đã chuyển cho worker khác.

MVP một worker có concurrency 1. Nếu deploy nhiều instance, giới hạn theo project phải được phối hợp bằng DB/advisory lock hoặc chỉ bật một instance worker; giới hạn memory riêng từng instance không đủ để bảo vệ quota chung.

Không thể bảo đảm chỉ gọi provider đúng một lần nếu worker chết sau khi API trả lời nhưng trước khi ghi DB. Có thể bảo đảm chỉ một kết quả hợp lệ được commit cho revision; có retry giới hạn để hạn chế gọi dư.

### 6.3. Lỗi và retry

| Tình huống | Cách xử lý |
|---|---|
| 429, timeout, 5xx | Retry có backoff/jitter, ưu tiên Retry-After, tổng tối đa 3 lần |
| Quota ngày đã hết | Không retry liên tục; trì hoãn theo thông tin provider hoặc báo chờ quota, cho phép thử lại sau |
| 401/403, model/config sai | FAILED với lỗi cấu hình; sửa key/model trước khi retry |
| JSON sai, thiếu câu/Part, output bị cắt | Không lưu thành công; cho một lần thử lại có giới hạn trong tổng số lần thử |
| Safety block | Mã lỗi riêng; không đổi thành điểm kém |
| Bài trắng | Không gọi API; backend sinh kết quả đầy đủ với CEFR null |

Nút “Thử chấm lại” chỉ cho job FAILED, kiểm tra owner/WRITING/SUBMITTED, không retry job đang chạy hoặc đã hoàn thành. Đề xuất cooldown 60 giây và tối đa 3 lần retry thủ công/attempt/ngày, đếm từ các job/revision đã có, không thêm bảng thống kê. Mỗi retry thủ công tạo revision mới trong transaction, lấy config hiện tại và hash mới, giữ job FAILED cũ; retry tự động vẫn cùng revision và tổng tối đa 3 lần gọi. UNIQUE và khóa attempt ngăn double-click tạo hai revision. Không âm thầm đổi cấu hình của job đang chạy. MVP chưa cần chấm lại kết quả thành công.

Bài Writing cũ đang QUEUED nhưng chưa có job và Practice UNASSESSED: không tự enqueue hàng loạt khi deploy. Có script preview/backfill riêng, chọn attempt cụ thể và chỉ enqueue khi được yêu cầu, để tránh dùng hết quota ngay lúc bật AI.

## 7. Payload đầu vào và cách AI đánh giá

Payload gửi provider gồm:

- Scope, Part cần chấm, feedback locale `vi`/`en` và rubric version.
- Context, instruction, prompt của từng câu lấy từ snapshot; số từ yêu cầu khi đã được xác định trong định nghĩa task.
- `questionKey`, bài viết nguyên văn và word count do backend tính.
- Part 4 đánh dấu `informal`/`formal`, gửi cả hai email trong Full/Part 4 để so sánh văn phong.
- Trạng thái bỏ trống; dữ liệu có xem mẫu/gợi ý nếu là Practice.

Không gửi tên tài khoản, email, ID học viên, điểm kỹ năng khác. Không lấy model answer để đo độ giống; giai đoạn đầu không đưa sample vào prompt chấm. Bài mẫu vẫn lấy snapshot và hiển thị riêng sau nộp.

Phần rubric và system instruction là cấu hình tin cậy; phần đề và bài viết là dữ liệu. Prompt yêu cầu bỏ qua chỉ dẫn tự xưng hệ thống trong bài viết, không thực thi công cụ, không truy cập URL do học viên viết. Không dùng model response để thao tác database trực tiếp.

### 7.1. Nhóm tiêu chí chung

| Tiêu chí | Nội dung đánh giá |
|---|---|
| Đáp ứng nhiệm vụ | Trả lời đúng câu hỏi, đủ nội dung, phù hợp mục đích/người nhận |
| Ngữ pháp | Độ đúng và mức kiểm soát cấu trúc, mức ảnh hưởng của lỗi tới nghĩa |
| Từ vựng | Dùng đúng từ, kết hợp từ và phạm vi từ phù hợp nhiệm vụ |
| Tổ chức/liên kết | Trình tự ý, đoạn văn và liên kết khi nhiệm vụ cần |
| Văn phong | Giọng điệu và mức trang trọng phù hợp |
| Chính tả/dấu câu | Lỗi thực có ảnh hưởng tới cách đọc; không cộng trừ máy móc |

Tiêu chí không áp dụng trả `NOT_APPLICABLE` cùng giải thích. Không cần viết đoạn văn cho Part 1 để đạt đánh giá tốt.

Với câu trắng: TASK là NEEDS_IMPROVEMENT vì chưa đáp ứng yêu cầu; các tiêu chí ngôn ngữ là NOT_ASSESSABLE vì không có bằng chứng, không phải NOT_APPLICABLE. Không bịa điểm mạnh hoặc lỗi ngữ pháp của câu trắng. Backend xác định BLANK từ nội dung đã chuẩn hóa khoảng trắng. TOO_SHORT chỉ dùng khi task có giới hạn tối thiểu xác định được và bài ngắn hơn giới hạn đó; không đồng nghĩa năng lực A1. Không có giới hạn từ trong snapshot thì không tự bịa con số để trừ điểm.

### 7.2. Đánh giá theo Part và câu

| Part | Đơn vị chi tiết | Cách đánh giá |
|---|---|---|
| 1 | 5 câu độc lập | Ngắn, đúng yêu cầu, hiểu được; không yêu cầu cấu trúc phức hoặc liên kết đoạn |
| 2 | 1 câu trả lời | Nội dung đầy đủ trong đoạn ngắn, câu hoàn chỉnh, ngữ pháp/từ vựng/liên kết |
| 3 | 3 phản hồi | Mỗi phản hồi đáp ứng message tương ứng; dùng văn phong hội thoại và triển khai ý |
| 4 | 2 email | Chấm từng email riêng, sau đó tổng hợp mức phù hợp người nhận và sự khác biệt informal/formal |

Mỗi Part có điểm mạnh, điểm yếu, góp ý ưu tiên. Mỗi câu có nhận xét theo tiêu chí, dẫn chứng, lỗi cần sửa, giải thích và bản sửa gợi ý.

Phân biệt `ERROR` với `SUGGESTION`: lỗi ngữ pháp thật khác với cách diễn đạt có thể hay hơn. Không tự tạo lỗi để câu nào cũng có lỗi. Cho phép các mảng rỗng nếu không thấy vấn đề.

Trích dẫn phải tồn tại trong bài học viên. Các vấn đề đáp ứng nhiệm vụ như “thiếu yêu cầu xin hoàn phí” được ghi riêng, không bịa trích dẫn cho phần chưa viết. Bản sửa giữ ý học viên; bài trắng không có “bản sửa” như thể học viên đã viết.

### 7.3. CEFR Writing Full

AI đối chiếu mô tả năng lực Writing A1–C2, trả mức đề xuất cùng bằng chứng từ nhiều Part/câu. File descriptors sẽ được xây từ tài liệu CEFR Writing phù hợp ở bước làm rubric; bảng dưới là tóm tắt định hướng nội bộ, chưa phải rubric Aptis chính thức:

| Mức | Định hướng mô tả |
|---|---|
| A1 | Từ/cụm và câu rất đơn giản cho thông tin quen thuộc |
| A2 | Câu đơn giản liên kết cơ bản, truyền đạt thông tin thường ngày |
| B1 | Bài viết liền mạch về chủ đề quen thuộc, mô tả và giải thích cơ bản |
| B2 | Ý rõ và phát triển hơn, phạm vi cấu trúc/từ rộng hơn, kiểm soát tương đối tốt |
| C1 | Bài viết tổ chức tốt, diễn đạt linh hoạt, kiểm soát văn phong và ý phức tạp |
| C2 | Diễn đạt tinh tế, chính xác và linh hoạt ở mức rất cao; không suy ra chỉ vì ít lỗi |

Không tính trung bình nhãn CEFR giữa Part, không đếm lỗi rồi tra một bảng ngưỡng, không dùng phép nhân `/19 → /50 → CEFR`. Part 1 tốt không đủ chứng minh mức cao; cần bằng chứng ở đoạn dài, tương tác và email. Dữ liệu không đủ phân biệt mức cao phải nêu giới hạn thay vì tự gán C2.

Backend kiểm tra scope, keys/bằng chứng, cấu trúc và tính nhất quán có thể kiểm tra bằng quy tắc, rồi chấp nhận/từ chối kết luận model. Backend không có người chấm hoặc dataset để xác nhận đúng về chuyên môn; label luôn là “CEFR Writing ước lượng — bản thử nghiệm”. Mức tin cậy chỉ dùng mô tả, không trình bày phần trăm như đã hiệu chỉnh.

Quy trình quyết định trong prompt:

1. Đánh giá từng câu theo nhiệm vụ và sáu tiêu chí; không nhìn độ dài như thước đo năng lực duy nhất.
2. Tổng hợp từng Part, phân biệt lỗi lặp lại và lỗi đơn lẻ; một lỗi không tự bị đếm nhiều lần để hạ mức.
3. Chỉ với FULL_SKILL: đối chiếu toàn bộ bằng chứng với descriptors, chọn mức được thể hiện ổn định nhất, giải thích điểm chưa đáp ứng mức cao hơn. Không gán trọng số 25%/Part hoặc suy từ Part 1 lên toàn bài.
4. Policy thận trọng cho MVP: muốn ESTIMATED phải có bài viết không trắng ở Part 2, 3 và 4; nếu thiếu một trong ba nhóm, vẫn chấm chi tiết nhưng trả INSUFFICIENT_EVIDENCE. Đây là quy tắc sản phẩm để hạn chế suy đoán, **không phải quy tắc chấm Aptis chính thức**. Có đủ ba nhóm không tự động đảm bảo đủ bằng chứng; model vẫn được trả insufficient.
5. CEFR có ít nhất hai trích dẫn thuộc hai Part khác nhau trong các Part 2–4; mức C1/C2 phải nêu giới hạn của đề nếu nhiệm vụ không đủ để phân biệt mức cao. Không bắt model bằng mọi giá xuất nhãn.
6. Backend kiểm tra điều kiện trên; output vi phạm bị từ chối hoặc hạ về insufficient bằng lý do rõ ràng, không tự gán nhãn khác thay model.

Trước khi implement rubric v1, người triển khai phải chọn descriptors Writing/Correspondence liên quan từ [CEFR Companion Volume của Council of Europe](https://www.coe.int/en/web/common-european-framework-reference-languages), ghi phiên bản và tham chiếu trong file rubric. Không gọi bảng định hướng ở trên là bảng quy đổi chính thức. Bản thử nghiệm chưa có dataset hiệu chỉnh nên không cam kết CEFR tương đương chứng chỉ.

## 8. Hợp đồng kết quả chung

### 8.1. Kết quả nội bộ được lưu

```ts
type WritingAssessment = {
  schemaVersion: 1;
  scope: 'FULL_SKILL' | 'PART';
  feedbackLocale: 'vi' | 'en';
  cefr: {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
    status: 'ESTIMATED' | 'NOT_APPLICABLE' | 'INSUFFICIENT_EVIDENCE';
    reason: string | null;
    rationale: string | null;
    evidence: Array<{ questionKey: string; quote: string; explanation: string }>;
    limitations: string[];
  };
  summary: {
    overallComment: string;
    partSummaries: Array<{ partNumber: number; comment: string }>;
    priorities: string[];
  };
  details: {
    parts: Array<{
      partNumber: number;
      overview: string;
      strengths: FeedbackFinding[];
      weaknesses: FeedbackFinding[];
      suggestions: string[];
      questions: Array<{
        questionKey: string;
        responseStatus: 'ANSWERED' | 'BLANK' | 'TOO_SHORT';
        comment: string;
        criteria: Array<{
          criterion: 'TASK' | 'GRAMMAR' | 'VOCABULARY' | 'COHERENCE' | 'REGISTER' | 'MECHANICS';
          judgment: 'STRONG' | 'ADEQUATE' | 'NEEDS_IMPROVEMENT' | 'NOT_APPLICABLE' | 'NOT_ASSESSABLE';
          comment: string;
          evidenceQuotes: string[];
        }>;
        strengths: FeedbackFinding[];
        weaknesses: FeedbackFinding[];
        corrections: Array<{
          kind: 'ERROR' | 'SUGGESTION';
          criterion: string;
          original: string;
          replacement: string;
          explanation: string;
        }>;
        taskIssues: string[];
        suggestions: string[];
        suggestedRevision: string | null;
      }>;
    }>;
  };
};

type FeedbackFinding = {
  criterion: string;
  comment: string;
  evidence: Array<{ questionKey: string; quote: string }>;
};
```

Kiểu TypeScript này là thiết kế minh họa; lúc code schema sẽ đóng enum `criterion` chung và giới hạn mảng/string. Backend bổ sung `assessedAt`, provider/model, assessment/prompt/rubric version từ cấu hình thật, không cho model tự khai nguồn.

Kết quả đóng gói vào `AssessmentResult` hiện tại:

```text
method = AI
score = null; maxScore = null                 # cho MVP đề xuất
items = đủ keys từ paper, ASSESSED hoặc SKIPPED
parts = các Part thuộc bài làm
writing = WritingAssessment + metadata backend
```

Các trường score của item hiện bắt buộc number. Để không lan thay đổi nullable sang Speaking, MVP giữ `items[].score/maxScore` dạng số legacy của adapter (TEXT hiện là 0/0) nhưng không diễn giải/hiển thị chúng thành điểm Writing. Điểm cấp result/Part vẫn null; toàn bộ nhận xét nằm trong `writing`. Không thay kiểu `ItemOutcome` dùng bởi Speaking hoặc thay `items[].assessment`. Đây là sentinel tương thích, không phải chấm Writing được 0 điểm. `counts.correct/incorrect` không áp dụng cho Writing và không hiển thị thống kê đúng/sai của câu TEXT.

Không phân biệt kỹ năng chỉ bằng method AI vì Speaking cũng là AI. Backend dựa component của attempt, frontend Writing kiểm tra component WRITING và result.writing; giữ nguyên speaking và items[].assessment. Với legacy counts bắt buộc, giữ correct/incorrect bằng 0 chỉ để tương thích, skipped tính thật; presenter Writing không diễn giải hai số 0 này thành kết quả đúng/sai. Tạo riêng answered/blank từ answers chuẩn. `estimated_cefr` luôn NULL ở PART **Writing**; FULL Writing lấy từ writing.cefr.level. Không áp chính sách CEFR Part Writing lên Speaking: Speaking hiện có hành vi riêng phải giữ.

`summary` và `details` do cùng một call sinh ra để nhất quán. Prompt yêu cầu summary dựa trên các phát hiện trong details. Không cần lưu một chuỗi feedback HTML hoặc một bản cho mỗi trang.

### 8.2. Kiểm tra bắt buộc trước khi lưu

- Đúng schema/version, scope; chỉ locale đã gửi.
- Full có đúng 4 Part và 11 câu; Part 1/2/3/4 có tương ứng 5/1/3/2 câu. Kiểm tra theo keys snapshot thực tế, không chỉ kiểm tra tổng số.
- Không có câu bị lặp, thiếu hoặc bịa thêm; mọi câu trắng vẫn có kết quả riêng.
- Mọi evidence quote/correction.original phải có trong câu tương ứng; hỗ trợ đối chiếu khoảng trắng có quy tắc, không ghép trích dẫn giữa các câu.
- Part luôn CEFR null và NOT_APPLICABLE: dùng schema riêng cho Part và backend ép chính sách ở presenter/persistence.
- Full ESTIMATED cần label hợp lệ, lý do và bằng chứng; insufficient có lý do; không chấp nhận label kèm nội dung trắng.
- Số từ, số câu đã trả lời/bỏ trống do backend tính; AI không sửa số liệu chuẩn.
- Có giới hạn nội dung: tối đa khoảng 3–5 phát hiện sửa lỗi tiêu biểu/câu, 2–3 góp ý ưu tiên/Part, chuỗi nhận xét ngắn. Không yêu cầu liệt kê mọi lỗi với output quá dài.
- Không lưu nội dung bị cắt vì max tokens hoặc JSON chỉ hoàn thành một nửa; đó là lỗi kỹ thuật.

Validation giúp dữ liệu an toàn và nhất quán, không thay cho kiểm định độ chính xác chấm điểm đã tạm hoãn.

## 9. API trả cho hai trang

Giữ các endpoint hiện có, mở rộng response:

| Endpoint | Phần dữ liệu AI |
|---|---|
| `GET /test-attempts/:id/result` | Trạng thái, estimatedCefr, metadata, `writing.summary` |
| `GET /test-attempts/:id/result/parts/:n` | Đề/bài mẫu/đáp án đã có + `writing` của Part và feedback ghép theo questionKey |
| Các endpoint result tương ứng của Practice | Cùng contract, CEFR theo scope |
| `POST .../:id/assessment/retry` dự kiến | Retry job thất bại, trả trạng thái mới; không chứa điểm từ client |

Các route thực tế có prefix `/api/v1`. Chốt projection để frontend không đoán vị trí dữ liệu:

- Summary: giữ envelope hiện tại; thêm `result.writing = { schemaVersion, scope, feedbackLocale, cefr, summary, metadata }`, không trả `details`.
- Detail: giữ các trường đề/bài làm hiện tại; thêm `writing = { feedbackLocale, assessmentRevision, part }`, trong đó `part` là phần tử tương ứng của `details.parts`. Ghép câu bằng questionKey, không theo vị trí mảng.
- Pending/failed: `result.writing` chưa có; trả `gradingStatus` và `assessment = { enabled, errorCode, retryable, nextRetryAt }` do server tính. Không trả raw error/provider payload.
- Retry routes: `POST /api/v1/test-attempts/:id/assessment/retry` và `/api/v1/practice-attempts/:id/assessment/retry`, body rỗng, HTTP 202 khi enqueue được. Giữ authentication/ownership như result hiện tại.

JSONB trong DB lưu đầy đủ, nhưng API summary chỉ project summary để tránh gửi cả 11 bài sửa khi polling. Detail chỉ project Part đang xem. API dựa trên owner/purpose/component như hiện tại, không tin `practice=true` là quyền truy cập.

Feedback locale nhận tại submit/complete từ ngôn ngữ UI, lưu trong job. Mở lại kết quả dùng đúng bản đã lưu, không tự gọi AI dịch/chấm lại khi chuyển ngôn ngữ. Giao diện nút/trạng thái vẫn theo i18n hiện tại; giai đoạn đầu có thể ghi “Nhận xét này được tạo bằng tiếng Việt”.

DTO start/submit/complete thêm optional `feedbackLocale` enum vi/en. Start mặc định vi và lưu vào `test_attempts.feedback_locale`; submit/complete chỉ cập nhật nếu được gửi, nếu không giữ giá trị đã lưu. Với Exam hết giờ, finalize lấy giá trị ở attempt; không chờ request submit vốn có thể không đến. Không đưa locale vào câu trả lời tự do. Nhận xét bằng locale đã chọn; original/replacement/bản sửa Writing vẫn bằng tiếng Anh.

### 9.1. Ví dụ nội dung hai trang (minh họa, không phải kết quả đã được kiểm chứng)

Ví dụ `result.writing.summary` của Full:

```json
{
  "overallComment": "Bạn truyền đạt được các ý chính. Cần cải thiện thì động từ và cách trình bày yêu cầu trong email trang trọng.",
  "partSummaries": [
    {"partNumber": 1, "comment": "Thông tin cá nhân rõ ràng và bám sát câu hỏi."},
    {"partNumber": 2, "comment": "Nội dung phù hợp nhưng còn lỗi diễn đạt hoạt động trong quá khứ."},
    {"partNumber": 3, "comment": "Trả lời đúng trọng tâm; một số ý cần lý do hoặc ví dụ cụ thể."},
    {"partNumber": 4, "comment": "Đã phân biệt hai người nhận, nhưng email trang trọng cần lời đề nghị lịch sự hơn."}
  ],
  "priorities": ["Ôn thì quá khứ đơn.", "Luyện viết lời đề nghị lịch sự trong email."]
}
```

Ví dụ một phần feedback của câu `p2:q1` trên trang chi tiết (rút gọn các trường còn lại theo schema mục 8):

```json
{
  "questionKey": "p2:q1",
  "responseStatus": "ANSWERED",
  "comment": "Bạn kể được hoạt động, nhưng động từ chưa phù hợp với thời điểm quá khứ.",
  "criteria": [
    {
      "criterion": "GRAMMAR",
      "judgment": "NEEDS_IMPROVEMENT",
      "comment": "Sau mốc thời gian Yesterday cần dùng thì quá khứ đơn.",
      "evidenceQuotes": ["Yesterday I go to the club."]
    }
  ],
  "corrections": [
    {
      "kind": "ERROR",
      "criterion": "GRAMMAR",
      "original": "Yesterday I go to the club.",
      "replacement": "Yesterday I went to the club.",
      "explanation": "Go chuyển thành went để diễn tả hành động đã xảy ra hôm qua."
    }
  ]
}
```

Với Part practice, vẫn có overallComment, partSummaries gồm một Part, details gồm Part đó và từng câu của nó. `cefr` bắt buộc là `{ level: null, status: 'NOT_APPLICABLE', reason: 'PART_SCOPE', rationale: null, evidence: [], limitations: [] }`. Không hiển thị mức CEFR của câu hoặc Part ở nơi khác để lách chính sách này.

Ví dụ chỉ hợp lệ nếu câu trích dẫn thực sự có trong answers. Fixture triển khai phải tạo đầy đủ fields và sáu tiêu chí/câu, không lấy JSON rút gọn này làm response hợp lệ của provider.

## 10. Frontend

### Trang kết quả

- Card kết quả Full: CEFR Writing ước lượng, giải thích ngắn và giới hạn nếu có.
- Card Part: “Đánh giá Writing Part N”; không có nhãn/ô CEFR.
- Mục “Đánh giá chung của AI”: overallComment, 4 card tóm tắt Part đối với Full; 1 card đối với Part.
- Giữ thời gian làm bài và số câu đã trả lời; dữ liệu này lấy backend.
- Bỏ điều kiện coi `score != null` là điều kiện duy nhất để chấm đã xong. `gradingStatus=COMPLETED` và có result AI hợp lệ đủ để render feedback.

### Trang kết quả chi tiết

- Đề Full có tabs 4 Part; đề Part chỉ hiển thị Part tương ứng.
- Header Part: nhận xét, điểm mạnh/yếu và góp ý ưu tiên của Part.
- Mỗi ResponseCard: prompt, bài đã nộp, đánh giá từng tiêu chí, dẫn chứng/lỗi/cách sửa/giải thích và góp ý câu đó.
- Part 4 hiển thị email thân mật/trang trọng riêng, nhận xét văn phong tổng hợp bên dưới.
- Tab “AI Answer” đổi tên tự nhiên thành “Gợi ý chỉnh sửa”; hiển thị `suggestedRevision` giữ ý người viết. Tab “Bài mẫu” vẫn là sample của người tạo đề, không nhầm với bài AI sửa.
- Không thay bài học viên bằng bản AI sửa. Render text an toàn, không render HTML model trả ra bằng dangerouslySetInnerHTML.
- Đánh dấu ERROR khác với SUGGESTION; không cần highlight theo offset ngay MVP, bảng trích dẫn/cách sửa đã đủ.

### Trạng thái chờ/lỗi

- QUEUED: “Bài đã nộp, đang chờ AI đánh giá”.
- PROCESSING: “AI đang đánh giá bài viết”.
- FAILED: thông báo đúng nguyên nhân khái quát, nút thử lại nếu phù hợp; vẫn xem được bài đã nộp.
- COMPLETED: hiển thị feedback và CEFR nếu đủ bằng chứng; bài trắng cũng là xử lý hoàn thành, không pending vô hạn.

Hook polling riêng Writing, nhịp ban đầu khoảng 3 giây và giãn tới 10 giây. Hook mới tự gọi result API cho Writing, không chạy song song với useAttemptResult để tránh hai vòng fetch. Giữ nguyên useAttemptResult của Speaking (5 giây/60 lần/giữ data khi lỗi). Dừng khi terminal, khi rời trang; pause lúc tab ẩn và refresh lúc quay lại. Sau khoảng 2 phút vẫn chờ thì dừng polling nhanh, cho nút kiểm tra lại; job backend tiếp tục chạy. Dùng tham số refreshKey sẵn có của useAttemptPartResult, tạo từ revision + gradingStatus để tải lại detail khi Writing hoàn thành; không đổi signature hoặc cách Speaking truyền refreshKey.

## 11. Trình tự triển khai thành các task nhỏ

| Bước | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1 | Chốt output contract, rubric v1, CEFR policy và cách xử lý score NULL | Có fixture Full và bốn Part đúng dữ liệu, không nhầm CEFR Part |
| 2 | Dùng GEMINI_API_KEY đã có và model 3.1 như Speaking; thêm config Writing riêng, adapter text và smoke script | Call JSON nhỏ thành công trên tier phù hợp; key và cấu hình Speaking không đổi |
| 3 | Thêm migration writing_grading_jobs và repository claim/retry/lease | Unique chống duplicate; phục hồi worker chết trên DB test; bảng Speaking không đổi |
| 4 | Input builder/prompt/schema/validator; fake provider cho kiểm thử | Đủ 11 keys, từng email riêng, trích dẫn được kiểm tra |
| 5 | Nối Exam submit, expiry và Practice complete vào enqueue | Cả ba đường tạo một job trong transaction, không gọi AI lúc submit |
| 6 | Worker gọi thật, validation và persistence kết quả | Kết quả thành công lưu một lần; lỗi không tạo điểm giả |
| 7 | Mở rộng result/detail API, hook polling và UI hai trang | Full có CEFR, Part không; mỗi câu có feedback; mở lại không gọi AI |
| 8 | Test end-to-end trên DB riêng và vài bài tự viết qua Free API | Nộp → chờ → kết quả; retry/refresh/restart đúng |

Không cần triển khai fallback, chatbot, personalization hoặc bảng thống kê để hoàn thành các bước này. Speaking đã có: giữ nguyên, không triển khai lại. Adapter Writing đã có điểm mở rộng để đổi provider riêng sau này.

## 12. Kiểm thử và tiêu chí nghiệm thu

### Kiểm thử không tốn quota

- Fixture provider thành công: Full đủ 11 câu; mỗi Part đúng keys.
- Response thiếu Part/câu, câu trùng, CEFR xuất ở Part, trích dẫn bịa, JSON bị cắt: bị từ chối.
- API timeout/429/401/5xx/safety: đúng mã lỗi và retry giới hạn.
- Submit nhiều lần/complete nhiều lần/worker claim cạnh tranh: không duplicate job/kết quả.
- Hết giờ: chấm đúng đáp án server đã khóa, không dùng thay đổi client nộp muộn.
- Worker restart/lease hết hạn/revision cũ: không ghi đè kết quả sai phiên bản.
- Practice giữ chính sách đáp án cuối, lưu trợ giúp đã xem, không thêm autosave Exam.
- Người dùng khác không đọc hoặc retry attempt của người khác.
- Frontend pending → completed tự cập nhật; Part không lộ CEFR; từng câu có nội dung đúng key; bản nộp giữ nguyên.
- Kiểm tra consumer lịch sử/dashboard khi `score=NULL`, method AI và estimatedCefr có giá trị: không hiển thị 0, không tự cộng vào CEFR tổng hợp chưa có quy tắc.

### Kiểm thử hồi quy Speaking bắt buộc trước khi merge Writing

Chạy baseline trước khi code Writing và chạy lại sau thay đổi; phân biệt lỗi đã có từ baseline với lỗi mới. Chỉ dùng mocked HTTP cho bước này, không sử dụng key thật:

```powershell
# Từ thư mục backend
npm test -- --runTestsByPath src/features/test-attempts/services/speaking-ai-config.service.spec.ts src/features/test-attempts/services/speaking-ai-provider.service.spec.ts src/features/test-attempts/repositories/speaking-grading.repository.spec.ts src/features/test-attempts/assessments/speaking-ai-policy.spec.ts src/features/test-attempts/assessments/speaking-assessment.spec.ts src/features/test-attempts/assessments/assessment-flow.spec.ts
npm run typecheck
```

Sau đó chạy test frontend hiện có theo scripts của repository, bao gồm `frontend/src/features/module-speaking/utils/speakingResultParts.test.js`, và bổ sung test integration/UI nơi chưa có:

| Trường hợp | Kết quả bắt buộc |
|---|---|
| Writing tắt, Speaking bật | Speaking Exam/Practice vẫn PENDING_AI, consent đúng policy mới được claim |
| Writing bật, Speaking tắt | Không dùng audio/Groq/consent service của Speaking cho Writing; Writing config không yêu cầu key Groq |
| Hai worker có job | Writing chỉ đọc/ghi writing_grading_jobs; Speaking chỉ dùng speaking_grading_jobs; không chấm chéo component |
| Speaking đang PROCESSING khi Writing submit/retry | Không thay lease, responses cache, assessment_revision, result hay consent của attempt Speaking |
| Speaking hoàn thành | Giữ điểm /50, bốn tiêu chí, transcript, qualityFlags, result.speaking và items[].assessment |
| Writing hoàn thành | Result/Part score null; item sentinel không lộ thành điểm 0; Full có CEFR khi đủ bằng chứng, Part không có |
| Kết quả Speaking polling gặp lỗi mạng | Vẫn giữ data cũ; ngắt timer khi rời trang; refresh detail như trước |
| Speaking budget blocked/lease expired | Chính sách BLOCKED, retry, reservation/charge và notice vẫn như baseline |
| Đổi model/provider Writing | Không đổi model/provider/env Speaking, không xóa cache hoặc chấm lại Speaking |
| Khác tier/thiếu xác nhận Free | Writing không âm thầm gọi API trả phí hoặc sửa cờ chung; Speaking giữ cấu hình đang dùng |
| Migration up/down Writing trên DB test | Không tạo lại/drop/alter ba bảng Speaking; rollback chỉ tài nguyên Writing |

Kiểm thử còn phải xác nhận payload Writing không chứa inlineData/audio/image, không gọi Groq, và không ghi speaking_ai_costs. Test không ảnh hưởng dữ liệu/logic không thể chứng minh cách ly quota nhà cung cấp; thử API thật ít bài và tránh lúc Speaking đang xử lý.

### Thử API thật, số lượng nhỏ

1. Một smoke request đơn giản xác minh key/model/structured output.
2. Một bài Full tự viết đủ 11 câu.
3. Một bài Part 1 và một bài Part 4 để kiểm tra hai cấu trúc khác nhau.
4. Một bài có câu trắng/lỗi rõ ràng; xem AI có trích đúng câu và giữ ý khi sửa.
5. Mở lại các trang và kiểm tra không gọi thêm API.

Các thử nghiệm này chỉ nghiệm thu chức năng và phát hiện lỗi hiển nhiên. **Chưa dùng để tuyên bố CEFR chính xác**, vì đối chiếu dataset/người chấm được tạm hoãn.

Chạy typecheck/build và các test liên quan backend/frontend. Integration/E2E chỉ dùng `TEST_DATABASE_URL` có tên kết thúc `_test`; không chạy kiểm thử tạo/xóa dữ liệu trên database phát triển.

## 13. Checklist bàn giao cho model triển khai

- Đọc hướng dẫn repository và kiểm tra trạng thái Git; giữ nguyên các thay đổi không thuộc task.
- Chỉ triển khai Writing trước, không sửa luồng chấm kỹ năng khác ngoài mở rộng contract có kiểm thử tương thích.
- Không cần tạo dataset, vector DB, bảng thống kê hoặc hệ thống agent để bắt đầu.
- Xác nhận các đường dẫn/tên class từ mục 2 trên revision hiện tại; schema thực tế là nguồn xác thực cuối cùng.
- Giữ nguyên các file Speaking mục 2.1. Các điểm được sửa chung chỉ gồm import module mới, nhánh WRITING trong submit/complete/expiry, DTO/locale, optional result.writing và presenter có guard component. Nếu bắt buộc sửa provider/worker/budget Speaking, dừng và tách đề xuất refactor riêng để được duyệt.
- Không sửa broad rule cho mọi method AI; không refactor ItemOutcome nullable hoặc reset assessment_revision của Speaking. Không dùng bảng hoặc API consent Speaking cho Writing.
- Hoàn thành adapter và smoke test trước khi nối toàn bộ worker/UI. Không commit key; không log đề/bài học viên nguyên văn trên production.
- Tách các task mục 11 thành thay đổi nhỏ; mỗi task có test phù hợp và ghi rõ những gì chưa chạy do thiếu key.
- Bổ sung fixture đầy đủ cho Full và từng Part, test cả Exam/Practice/hết giờ. Một fixture phản hồi trông hợp lý không phải bằng chứng CEFR đúng.
- Trước khi bàn giao: hai trang lấy chung kết quả đã lưu; refresh không chấm lại; từng question có feedback; Part không có CEFR; lỗi provider không biến thành kết quả thấp.
- Bổ sung hướng dẫn chạy backend/worker, migrate DB test, smoke command và cách xem trạng thái job trong tài liệu của task; không yêu cầu người dùng gửi API key vào chat.

## 14. Phạm vi của tài liệu

Đây là bản kế hoạch dựa trên code đã đọc và tài liệu API chính thức kiểm tra ngày 11/10/2026. Chưa tạo key hộ người dùng, chưa sửa `.env`, chưa cài SDK, chưa migration hay chấm bài thật. Model/quota phải xác nhận bằng project thực tế khi bắt đầu bước 2. Điểm số `/50`, chấm lại bài thành công và hiệu chỉnh CEFR là các quyết định bổ sung, không được ngầm coi là đã chốt trong MVP.

Lần rà soát sau pull chỉ kiểm tra tĩnh luồng Speaking và sửa bản kế hoạch; chưa chạy baseline test hoặc gọi Gemini/Groq để xác minh key. Những bảo đảm không hồi quy ở mục 12 là điều kiện nghiệm thu của lần triển khai Writing, không phải tuyên bố đã kiểm thử runtime thành công. Không thay file SESSION_HANDOFF.md đang có chỉnh sửa của người dùng.
