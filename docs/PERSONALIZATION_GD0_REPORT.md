# Cá nhân hóa AptiMate — GĐ0: tách ai-shared

Ngày: 19/10/2026. Phạm vi: GĐ0 của kế hoạch bản 2 ngày 17/10, chưa triển khai P0 hoặc GĐ1–GĐ11.

## Thay đổi

- Thêm `backend/src/features/ai-shared`, không phụ thuộc module chatbot, test-attempts hay personalization.
- `learningStats(rows, limitation?)` là hàm thuần, có kiểu dữ liệu đầu vào/đầu ra, không truy vấn DB và không giới hạn số bài. Caller chịu trách nhiệm quyền sở hữu, cửa sổ thời gian và giới hạn truy vấn.
- `ChatbotContext.stats()` giữ truy vấn 20 bài SUBMITTED gần nhất của người đăng nhập, thứ tự `submitted_at DESC, id DESC`, cấu trúc kết quả và câu giới hạn cũ.
- Các nhóm vẫn tách theo kỹ năng × chế độ × phạm vi × Part. SIMULATED/UNASSESSED/PENDING_AI vẫn tính vào số mẫu nhưng không góp điểm, Part hay tiêu chí đánh giá. Không suy CEFR mới.
- `GeminiClient`: cấu hình free đã xác nhận, HTTP, timeout, lỗi an toàn và quota. Không giữ/log response lỗi hoặc API key.
- `GeminiRateLimiter`: cửa sổ trượt 60 giây theo model, dùng chung giữa các consumer của `AiSharedModule` trong một process. Đặt chỗ đồng bộ trước HTTP để tránh vượt giới hạn khi nhiều request tới cùng lúc.
- `AiRequestRecorder`: ghi RUNNING → COMPLETED/FAILED, token vào/ra/cache/reasoning và chi phí 0 cho cấu hình FREE. Chỉ lưu fingerprint/config, không lưu prompt/bài làm. Giữ RUNNING như code chatbot hiện tại; không bổ sung ngân sách trả phí trong GĐ0.
- `GeminiGenerationService`: nhận schema/purpose/promptVersion riêng từng feature; trả `{ requestId, content, usage }`. Giữ nguyên toàn bộ content, thought signature và function-call ID.
- `ChatbotProvider`: adapter giữ schema chat, prompt version và mã lỗi `CHAT_*`; không còn chứa SQL hay HTTP riêng.
- Các script smoke/knowledge và test DB dùng `createGeminiServices` làm điểm khởi tạo ngoài Nest. Trong ứng dụng Nest, import `AiSharedModule` để dùng chung instance, không tự tạo client cho từng request.

## Quota và xử lý lỗi

`GEMINI_MAX_RPM` là cấu hình mới: mặc định 5, số nguyên 1–1000. Đây là giới hạn ứng dụng, không phải lời khẳng định quota của model/project Google. Đặt giá trị phù hợp với quota project thực tế. Không đổi `.env` hoặc model đang cấu hình.

- Giới hạn áp dụng cho HTTP đi qua shared client, tách theo model; cả request đếm token/embedding cũng đi qua giới hạn này. Pipeline chấm Writing/Speaking chưa chuyển sang shared client.
- HTTP 429: đọc `Retry-After` dạng số giây hoặc HTTP date; thiếu/sai thì chờ tối thiểu 60 giây. Trong cooldown, không gửi thêm HTTP cho cùng model.
- Hết cửa sổ RPM cũng trả lỗi quota ngay, kèm `retryAfterMs`; shared service không tự retry hoặc giữ request chờ dài.
- Caller mới nhận `AiProviderError.reason` và `retryAfterMs`; chatbot tiếp tục nhận `CHAT_QUOTA`, `CHAT_TIMEOUT`, v.v. Worker cá nhân hóa và chính sách retry sẽ triển khai ở giai đoạn sau.
- Mỗi lần gọi generation được ghi một bản ghi; lỗi quota trước HTTP có thể tạo bản ghi FAILED nhưng không phát sinh token. Không diễn giải số dòng FAILED thành số request Google thực nhận.
- CLI nhập knowledge có thể dừng khi hết quota. Chạy lại sau cooldown; script hiện có bỏ qua tài liệu đã nhập thành công.
- Giới hạn này ở bộ nhớ từng process. Chưa phải bộ giới hạn phân tán giữa nhiều instance/CLI hoặc các pipeline chấm bài. Google vẫn áp dụng quota chung phía provider.

## Kiểm chứng

Chạy từ `backend`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --testPathPattern 'chatbot|ai-shared|env.validation'
npm run typecheck
npm run build
npm run test:chatbot:db
```

Với DB integration, đặt `TEST_DATABASE_URL` trỏ tới database có tên kết thúc `_test` trước khi chạy. Lần kiểm chứng này dùng `aptimate_chatbot_test`, schema riêng tự dọn sau test, không chạy migration lên DB ứng dụng. Không dùng `--live`.

- Baseline trước sửa: 20/20 test chatbot đạt.
- Kết quả cuối: **7 suite / 57 test đạt**; `npm run typecheck`, `npm run build` và ESLint các file TypeScript đã sửa đều đạt. PostgreSQL integration đạt trên DB `_test` với HTTP mock.
- Bộ hồi quy gồm test chatbot cũ, cửa sổ thống kê lớn hơn 20 bài, lọc kết quả không thật, phân nhóm/tiêu chí, quyền truy vấn, schema, thought signature, ghi token, timeout, RPM và HTTP 429.
- Test Nest xác minh chatbot và feature thứ hai dùng chung client và quota window, không có phụ thuộc vòng.
- Test PostgreSQL bổ sung generation với HTTP mock: ghi request không gắn chat, FK tin nhắn chat, token, fingerprint, metadata an toàn, lỗi quota và không gọi thêm HTTP trong cooldown. Các ca quyền sở hữu/idempotency/phân trang chatbot cũ vẫn chạy.
- Không gọi Gemini thật, gửi email hoặc thay đổi giao diện trong giai đoạn này.

## Kiểm thử thủ công

1. Khởi động lại backend, mở chatbot và gửi câu hỏi thông thường. Kiểm tra hội thoại nối tiếp, lịch sử và trạng thái chờ như trước.
2. Hỏi “Dựa trên kết quả của tôi, tôi nên ôn gì?”. Tool vẫn dùng tối đa 20 bài đã nộp của tài khoản hiện tại; bài chưa có kết quả thật không được dùng làm điểm đánh giá.
3. Thử câu hỏi sử dụng kiến thức/tra từ. Khi hết quota, ứng dụng hiển thị lỗi hiện có; thử lại sau thời gian chờ, không đổi sang model trả phí.

## Trạng thái và bước tiếp theo

- Đã fetch `origin/develop` tới `0a33041`; tree trùng HEAD `2039b94` tại thời điểm kiểm tra.
- Trong lượt triển khai, người dùng từ chối thao tác tạo nhánh mới; giữ nhánh `feature/backend-writing-crud`. Sau đó người dùng yêu cầu commit toàn bộ: đã fast-forward develop và chia commit riêng cho từng task, gồm thống kê dùng chung và hạ tầng Gemini. Không push; thay đổi phân quyền/UI/Speaking được tách khỏi commit GĐ0.
- Kiểm chứng toàn workspace trước đợt commit: backend 66 suite/411 test, frontend chính 95 test và 5 test phân quyền/API đều đạt. Đây là hồi quy tự động, chưa thay thế nghiệm thu thủ công của người dùng.
- P0 chưa được xác nhận hoàn tất; GĐ0 chỉ tách hạ tầng độc lập, không chứng nhận Speaking Part đã bỏ CEFR.
- Trước GĐ1 phải rà lại thứ tự migration: `1760000015000` đã được thay đổi phân quyền trong workspace sử dụng. Không dùng nguyên số migration từ kế hoạch cũ.
- Dừng sau GĐ0 để người dùng kiểm thử; chưa triển khai API mục tiêu, worker cá nhân hóa, nhận xét, báo cáo hoặc dữ liệu chủ đề.
