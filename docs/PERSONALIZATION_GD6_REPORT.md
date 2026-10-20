# GĐ6 — AI và nhận xét cá nhân

Ngày: 20/10/2026. Nhánh chung: `feat/learning-personalization`.

## Phạm vi đã triển khai

- `GET /me/insights/comment`, chỉ STUDENT đang đăng nhập. Không nhận userId từ client. Trả `PENDING`, `READY` hoặc `HIDDEN`; không trả snapshot nội bộ.
- Mở Dashboard xếp một insight COMMENT khi có kết quả chấm thật mới trong 20 bài nộp gần nhất. Phát hiện bằng fingerprint tại thời điểm đọc, nên không phụ thuộc việc callback sau chấm có chạy thành công hay không. PENDING_AI, SIMULATED và UNASSESSED không kích hoạt nhận xét.
- Mỗi ngày theo múi giờ tài khoản tối đa một insight COMMENT. Nếu đã tạo nhận xét hôm nay rồi làm thêm bài, nhận xét mới chờ ngày sau. Không gọi lại chỉ vì ngày, streak hoặc số lượt ôn thẻ thay đổi.
- Snapshot số liệu được băm SHA-256; dùng lại nội dung READY có cùng hash của chính người học. SnapshotVersion theo bộ tính thống kê. Goal progress lấy riêng từ mục tiêu hiện tại, thống kê nhận xét vẫn là 20 bài gần nhất xuyên mục tiêu.
- `PersonalizationAiService` dùng `JsonGenerationService` của ai-shared với adapter theo provider: kiểm tra JSON schema, temperature 0.2, không tool, timeout mặc định 20 giây/lần (cấu hình 1–90 giây), ghi ai_requests và token. Prompt cố định đứng trước số liệu; riêng Gemini có model mặc định theo CHATBOT_MODEL.
- Projection vào prompt không chứa userId, email, tên, attemptId, câu hỏi, đáp án hoặc bài làm. Fingerprint kết quả chấm được tính trong DB và chỉ lưu nội bộ, không gửi cho Gemini.
- Đầu ra: summary tối đa 3 câu/600 ký tự; strengths/focus tối đa 2 mục, 200 ký tự/mục. Kiểm tra trường, kiểu, số liệu (dung sai ±1), band, HTML/link và một số lời hứa điểm thi. Kiểm tra ngữ nghĩa toàn diện/độ hữu ích vẫn thuộc rubric GĐ11, không coi bộ lọc văn bản là bằng chứng tuyệt đối về chất lượng lời AI.
- JSON/nội dung không hợp lệ: thử sửa ngay một lần với mã lỗi kiểm tra. Nếu vẫn lỗi, lùi lịch 15 phút, 1 giờ, 4 giờ; sau lần đầu và ba lượt retry chuyển FALLBACK. Mỗi lần gọi sửa đều tính quota.
- Tối đa 6 request cá nhân hóa/người/ngày, tính cả các loại PERSONAL_* đã định cho giai đoạn sau; tối đa PERSONALIZATION_MAX_RPM/phút cho tính năng. Đếm bằng ai_requests, khóa advisory dùng chung giữa các worker; hàng đợi khóa `FOR UPDATE SKIP LOCKED`. Shared Gemini limiter vẫn chia quota model với chatbot trong cùng process.
- 429 hoặc quota: dừng lượt, lùi lịch, không tăng retry_count. Worker vẫn tiếp tục các tính năng hiện có ở các lượt sau. AI tắt/lỗi: thẻ nhận xét ẩn, tiến độ và lộ trình RULE vẫn hiện.
- Dashboard poll 15 giây khi PENDING, hủy poll khi rời trang. Nội dung được render dưới dạng text, không HTML. Có nhãn vi/en; lời AI viết tiếng Việt theo kế hoạch.

Không bổ sung test đầu vào, không thay thuật toán lộ trình RULE. PLAN_START/WEEKLY/MIDTERM là GĐ7; FINAL/trang báo cáo là GĐ8; hỏi chatbot về nhận xét/báo cáo là GĐ9.

## Đổi provider/model theo yêu cầu bổ sung

`PersonalizationAiService` chỉ phụ thuộc `JsonGenerationService` và hợp đồng JSON chung. Adapter Gemini dùng schema của Gemini; adapter tương thích OpenAI dùng Chat Completions JSON mode cho DeepSeek/xAI. Mọi đầu ra đều qua cùng validator, cache, quota và retry. Đổi cấu hình rồi restart backend; không cần sửa worker hay frontend. Không tự fallback sang hãng khác khi lỗi.

Gemini (mặc định):

```env
PERSONALIZATION_PROVIDER=gemini
PERSONALIZATION_MODEL=gemini-3.5-flash-lite
# Dùng GEMINI_API_KEY và xác nhận FREE hiện có.
```

DeepSeek:

```env
PERSONALIZATION_PROVIDER=deepseek
PERSONALIZATION_MODEL=<model-id-trong-tai-khoan-DeepSeek>
DEEPSEEK_API_KEY=<key>
```

Grok của xAI:

```env
PERSONALIZATION_PROVIDER=xai
PERSONALIZATION_MODEL=<model-id-trong-tai-khoan-xAI>
XAI_API_KEY=<key>
```

Endpoint khác hỗ trợ Chat Completions với `response_format=json_object`:

```env
PERSONALIZATION_PROVIDER=openai-compatible
PERSONALIZATION_BASE_URL=https://your-host/v1
PERSONALIZATION_MODEL=<model-id>
PERSONALIZATION_API_KEY=<key>
PERSONALIZATION_AI_TIMEOUT_MS=20000
```

Các giá trị trong dấu `<...>` cần thay bằng cấu hình thực. DeepSeek mặc định `https://api.deepseek.com/v1`; xAI mặc định `https://api.x.ai/v1`. `PERSONALIZATION_BASE_URL` và `PERSONALIZATION_API_KEY` có thể override cho các provider tương thích; bỏ hai override này khi chuyển hãng để dùng endpoint/key mặc định. Key không được log hoặc ghi vào config_snapshot. Model ngoài Gemini phải khai báo rõ; không tự dùng CHATBOT_MODEL của Gemini.

Hợp đồng tương thích yêu cầu model nhận system/user, temperature, max_tokens và JSON mode; không phải mọi model/API đều hỗ trợ cùng tham số. Provider có giao thức khác cần thêm adapter triển khai `JsonGenerationProvider`, không đổi nghiệp vụ. Tài liệu đối chiếu: [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), [xAI Chat Completions](https://docs.x.ai/developers/rest-api-reference/inference/chat-completions).

ai_requests ghi đúng provider/model/token. Với DeepSeek/xAI/endpoint khác, `actual_cost=NULL`, pricing tier UNPRICED cho đến khi có bảng giá; không giả định miễn phí. Giới hạn sáu request/người/ngày và RPM vẫn áp dụng xuyên provider. Nhận xét đã lưu vẫn được dùng lại theo hash và giới hạn một nhận xét/ngày; đổi model không tự tạo lại toàn bộ lịch sử. Cấu hình mới chỉ áp dụng cho các lần gọi tiếp theo. Chatbot và chấm Writing/Speaking chưa được chuyển provider trong GĐ6.

DeepSeek/xAI được kiểm thử bằng HTTP mock, không gọi API thật vì chưa có khóa riêng cho các hãng này. Gemini thật đã smoke bằng snapshot giả như bên dưới.

## Kiểm thử

- Backend: 75 suite, 492 test đạt qua lượt toàn bộ và chạy lại các suite bị ảnh hưởng sau sửa. Typecheck và lint các file thay đổi được kiểm tra.
- PostgreSQL `_test`, schema riêng: full migration chain, GĐ2–GĐ6; concurrent requests/workers chỉ tạo/gọi một lần, ownership, bài đang chấm, cache, token, disabled, 429, sáu lần/ngày, RPM giữa người dùng, các mốc retry và dừng sau FALLBACK.
- Browser desktop/mobile: PENDING → READY bằng polling; HIDDEN và HTTP 503 không làm mất tiến độ/lộ trình; giữ các bài kiểm thử cài đặt, ôn câu sai, điều hướng và chatbot.
- Frontend production build đạt; còn cảnh báo bundle lớn có sẵn.
- Gemini FREE thật trên một snapshot giả, tài khoản/schema `_test`: PASS, model `gemini-3.5-flash-lite`, 495 token vào/163 token ra. Đầu ra qua validator; không dùng dữ liệu người học thật. Schema test được dọn sau test; số liệu token được ghi nhận tại đây.

## Bật và nghiệm thu

### Kết quả rà soát trước commit ngày 20/10/2026

- Chạy lại backend cá nhân hóa: 7 suite/65 test đạt; backend typecheck và frontend production build đạt. Còn cảnh báo bundle lớn. Kết quả DB, browser và Gemini thật ở mục trên thuộc lượt triển khai trước; lượt rà soát này chưa chạy lại DB do thiếu TEST_DATABASE_URL và chưa gọi AI thật.
- Người dùng đã tự bật PERSONALIZATION_AI_ENABLED=true ở local. Không đưa .env vào commit; chưa xác nhận nghiệm thu luồng AI thực tế sau khi bật.
- Validator hiện kiểm tra cấu trúc và sự xuất hiện của số/band trong snapshot, chưa ràng buộc đầy đủ ý nghĩa câu: thử trực tiếp vẫn chấp nhận “Bạn đang vượt tiến độ” khi goal.status=BEHIND và “Bạn đã đạt B2” khi B2 chỉ là band mục tiêu. Đánh giá ngữ nghĩa toàn diện vẫn thuộc GĐ11.
- Khi insight FAILED đang chờ retry, API trả HIDDEN; thẻ Dashboard chỉ polling khi PENDING. Nếu retry thành công sau đó, người dùng cần tải lại hoặc mở lại Dashboard để thấy nhận xét. Chưa sửa hành vi này trong lượt commit.

### Cấu hình và các bước thử

Giữ database/migrations đã có, không có migration mới. Không sửa `.env` tự động.

```env
PERSONALIZATION_WORKER_ENABLED=true
PERSONALIZATION_AI_ENABLED=true
PERSONALIZATION_MAX_RPM=5
# PERSONALIZATION_MODEL không đặt sẽ dùng CHATBOT_MODEL.
GEMINI_BILLING_TIER=FREE
GEMINI_FREE_PROJECT_CONFIRMED=true
GEMINI_PAID_PROJECT_CONFIRMED=false
```

Cần GEMINI_API_KEY của project thử phù hợp. Khởi động lại backend và frontend như trước.

1. Dùng tài khoản thử, làm/nộp một bài Reading hoặc Grammar có chấm thật.
2. Mở Dashboard: nhận xét hiện “Đang tạo…”; đợi worker (chu kỳ 60 giây) và poll 15 giây.
3. Nhận xét gồm tóm tắt, điểm mạnh và nên tập trung. Tải lại không gọi AI lần nữa.
4. Làm thêm bài cùng ngày: vẫn giữ một nhận xét/ngày. Ngày sau mở lại sau khi có dữ liệu mới mới xếp nhận xét mới.
5. Đặt PERSONALIZATION_AI_ENABLED=false rồi khởi động lại: thẻ nhận xét ẩn, các thẻ khác vẫn hoạt động.

Lệnh kiểm thử:

```powershell
npm run test:personalization
npm run test:personalization:db
npm run ai:personalization:smoke -- --live
```

Hai lệnh DB/smoke cần TEST_DATABASE_URL riêng, kết thúc `_test`, khác DATABASE_URL. Smoke `--live` chỉ gửi một snapshot giả và ghi token trong schema test tạm; không có cờ thì chỉ in hướng dẫn. Không log bài làm, không commit .env.

Giới hạn triển khai: các worker cá nhân hóa chia RPM bằng khóa PostgreSQL; quota của nhà cung cấp dùng chung với chatbot/process khác có thể vẫn trả 429 và được xử lý bằng backoff. Không triển khai ngân sách tiền trả phí ở GĐ6.
