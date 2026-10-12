# Tiến độ triển khai Writing AI

## Cập nhật gần nhất — đã sửa review R1–R6 (11/10/2026)

Ngày 12/10/2026: đã đồng bộ develop đến `98bba29`, giải quyết conflict Reading/Writing và commit code thành các nhóm backend/provider/frontend. Tài liệu được commit riêng; chưa push trong lượt này. Các dòng “chưa commit/push” bên dưới là trạng thái lịch sử của các phiên triển khai/review. Sau merge đã xác minh hai lần Nest build và 81 test frontend cùng một test nhãn lịch sử; chưa xác minh lại bộ test backend.

Đã triển khai `AI_WRITING_REVIEW_FIX_PLAN.md`: kiểm tra nhận xét không rỗng, evidence và policy câu trắng; wordLimits trong nội dung đề/snapshot; input/rubric/prompt v2 cho job mới và giữ input/prompt v1 cho job đang chờ; retry thủ công đúng 3/24h và cooldown DB; trạng thái lịch sử đúng; nhãn đã xem mẫu và locale ở detail.

Không cần migration mới cho bản sửa: wordLimits nằm trong JSONB có sẵn. Không sửa lại snapshot cũ hàng loạt, không chấm lại kết quả đã COMPLETED. Không thay `.env` hoặc Speaking. Khởi động lại backend/frontend để dùng code mới.

Kiểm tra bản sửa: Writing/provider 40 tests; content + Speaking regression 66 tests; WritingTestsService 4 tests; frontend 81 tests và Writing/history unit 7 tests; browser desktop/mobile và PostgreSQL integration pass, gồm retry quota/concurrency và legacy job v1. Typecheck/build backend/frontend pass. Xem mục 6 của kế hoạch sửa và runbook. Không còn task R1–R6 chờ triển khai; chưa commit/push.

Các phần bên dưới ghi nhận lần triển khai MVP trước review, giữ lại để truy vết.

## Trạng thái cuối: đã triển khai và kiểm tra

Yêu cầu gốc: triển khai `AI_WRITING_IMPLEMENTATION_PLAN.md`, giữ Speaking hoạt động; nếu cửa sổ 5 giờ còn dưới 5% thì lưu checkpoint và dừng. Giới hạn đã reset trong lúc làm; lần kiểm tra sau reset còn 95%, không cần tạm dừng.

Code dựa trên HEAD `2e3a721`. Các thay đổi có sẵn của người dùng ở `SESSION_HANDOFF.md` và bản kế hoạch được giữ nguyên. Chưa commit/push.

## Phần đã xong

- Backend: `common/ai` có interface/provider Gemini text; `features/writing-assessment` có config, rubric/prompt, schema, validator, input builder, coordinator, repository và worker.
- Nối Writing vào Exam submit, expiry và Practice complete trong transaction; sửa đúng nhánh WRITING, giữ SPEAKING. Retry kiểm tra owner/purpose, cooldown và revision.
- Một lần chấm tạo summary/details, lưu trong result JSONB. Full có CEFR ước lượng khi đủ bằng chứng; Part không có CEFR. Bài trắng không gọi API; lỗi không biến thành 0/A1.
- Provider schema dùng object với sáu tiêu chí bắt buộc; validator chuyển sang array cho API/UI. Kiểm tra quote/correction theo bài gốc. Số từ và trạng thái blank do backend quyết định.
- Thêm migration `1760000012000-AddWritingAiGrading.ts`: writing_grading_jobs và cột feedback_locale; không sửa migration/bảng Speaking.
- `.env` local thêm WRITING_AI_ENABLED=true, WRITING_AI_MODEL=gemini-3.1-flash-lite; không đổi key hoặc flags tier Speaking. `.env.example` giữ mặc định tắt.
- Frontend: hai trang Writing có trạng thái/retry, polling riêng, summary, CEFR Full, feedback Part/câu, lỗi/cách sửa và suggested revision riêng với bài gốc; có nhãn vi/en.
- Thêm smoke/demo/backfill scripts, test PostgreSQL riêng, browser UI test và tài liệu `AI_WRITING_RUNBOOK.md`.
- tsconfig.build.json giới hạn build ở src để thêm scripts không làm đổi đường dẫn dist/main.js.

## Kiểm tra đã đạt

- 14 suite/97 test backend: Writing/provider/config, Speaking regression, shared attempt/Practice/dashboard/environment.
- `npm run test:writing`: 4 suite/23 test đạt.
- Frontend `npm test`: 80 test đạt; UI browser test desktop 1280 và mobile 390 đạt. Không overflow; điểm null vẫn hiển thị feedback; bài gốc giữ nguyên.
- Typecheck và build backend/frontend đạt. ESLint cho code Writing/AI/scripts/integration đạt; frontend lint không có lỗi, còn cảnh báo có sẵn trong repository.
- PostgreSQL integration trên `aptimate_ai_writing_test`: Exam, Practice Part/Full, expiry, blank, quota retry, owner/purpose, concurrent submit/claim, lease recovery, worker cũ không ghi đè, disabled mode, không claim Speaking, rollback migration giữ ba bảng Speaking.
- Gemini thực: smoke OK; Full OK đủ 4 Part/11 câu, CEFR B2 trên bài giả lập; Part 2 OK một câu, CEFR null. Chưa kiểm định độ chính xác với dataset.
- Runtime: backend production build khởi động được trên port thử 3050, `/api/v1/health/ready` trả status ok/database connected. Đã dừng tiến trình thử. Port 3000 đang có tiến trình khác; không dừng tiến trình đó.
- `git diff --check` đạt.

## Trạng thái môi trường

- Backend dependency đã được khôi phục bằng npm ci theo lockfile, gồm FFmpeg của Speaking. Không đổi dependency version/lockfile.
- Docker aptimate-postgres đã khởi động, port localhost:5433.
- Database ứng dụng đã chạy migration mới. Hai migration pending từ pull (Reading deadline và Speaking AI) cũng đã áp dụng qua cơ chế migration thông thường. Reading migration chỉ bổ sung deadline cho Exam chưa có deadline; không sửa file migration đó.
- Database test local đã tạo `aptimate_ai_writing_test`, mỗi lượt kiểm thử tạo schema riêng rồi xóa schema riêng. Không giữ dữ liệu fixture trong database ứng dụng.
- Backend watch lần thử bị lỗi quyền taskkill trên Windows; production build đã được xác minh riêng. Không có tiến trình thử 3050 còn chạy.

## Nếu tiếp tục ở phiên mới

Không cần audit lại toàn repo. Đọc runbook và file này trước. Các bước triển khai đã xong; việc sử dụng tiếp theo là khởi động lại backend/frontend hiện đang mở và nộp một bài Writing mới. Bài cũ không tự chấm lại; CLI backfill nhận một attempt-id và mặc định preview.

Nếu có yêu cầu sửa tiếp: kiểm tra diff đang có, giữ các file Speaking riêng nguyên trạng, thêm kiểm thử tương ứng và cập nhật checkpoint này. Không gửi key ra chat/log; không dùng database ứng dụng để kiểm thử xóa dữ liệu.
