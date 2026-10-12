# Chạy và kiểm tra Writing AI

## Bản sửa sau review (11/10/2026)

Đã sửa R1–R6 trong `AI_WRITING_REVIEW_FIX_PLAN.md`. Sau cập nhật chỉ cần khởi động lại backend/frontend, không có migration mới cho bản sửa. `wordLimits` nằm trong JSONB đề/snapshot hiện có; lần lưu đề mới có hướng dẫn mặc định theo Part, có thể gửi giới hạn riêng qua API bằng mảng `{minimum, maximum, policy}` cho từng câu (policy: guidance/required). Phần tử null nghĩa là không khai báo giới hạn. Không sửa hồi tố snapshot cũ: instruction `Write N–M words` rõ ràng được đọc, thông tin mơ hồ giữ null. Mỗi email có giới hạn riêng.

Job mới dùng input/prompt/rubric v2; job cũ thiếu inputVersion vẫn được dựng theo v1 và dùng prompt v1 để giữ hash. Ngưỡng từ không được quy đổi thành CEFR. Thay đổi version lần sau phải giữ dispatcher/build tương thích như cách làm này.

Kiểm thử bổ sung: backend `npm run test:writing`, `npm run test:writing:localdb`; frontend `npm run test:writing:unit`, `npm run test:writing:ui`. Test PostgreSQL dùng database test và mock provider; không tiêu thụ quota AI. Xem mục 6 của kế hoạch sửa để biết phạm vi và kết quả kiểm thử.

Triển khai theo `AI_WRITING_IMPLEMENTATION_PLAN.md`. Model mặc định `gemini-3.1-flash-lite`, cùng API/key hiện có của Speaking. Writing có cấu hình, rubric, worker và bảng job riêng.

## Cấu hình

Trong `backend/.env`, giữ key và các cấu hình Speaking hiện có. Writing cần:

```dotenv
WRITING_AI_ENABLED=true
WRITING_AI_MODEL=gemini-3.1-flash-lite
```

Các giá trị mặc định và cấu hình nâng cao có trong `.env.example`. Chỉ bật trên project Gemini FREE đã được xác nhận bằng các cờ tier hiện có; backend từ chối Writing trên PAID vì MVP chưa có ngân sách riêng. Không đổi cờ chung nếu project thực tế không phải Free Tier.

## Khởi động

Từ thư mục `backend`:

```powershell
docker compose up -d postgres
npm ci
npm run db:migrate
npm run ai:writing:smoke
npm run start:dev
```

Khởi động frontend như hiện tại (`npm run dev` trong `frontend`). Worker Writing chạy trong backend, mỗi 5 giây kiểm tra job, concurrency 1 cho toàn bộ worker Writing và có khoảng cách tối thiểu giữa các lượt xử lý. Speaking vẫn có worker riêng; hai kỹ năng dùng chung quota của project Gemini.

Trong lần triển khai này, migration ứng dụng đã chạy thành công và `.env` local đã bật Writing. Các migration Reading deadline và Speaking đang pending từ lần pull cũng đã được áp dụng bằng cơ chế migration của project. Chỉ cần khởi động lại backend/frontend đang chạy để nhận code và cấu hình mới.

## Hành vi

- Nộp Writing Exam, Practice hoặc hết giờ: khóa bài làm và tạo một job cùng transaction. Request submit không đợi Gemini.
- Một lần chấm tạo `summary` và `details`, lưu trong `test_attempts.result.writing`. Mở lại trang không tốn thêm lượt chấm.
- Full: CEFR Writing ước lượng khi đủ bằng chứng. Part: CEFR luôn null; không hiển thị ô CEFR.
- Điểm số `/50` chưa được áp dụng cho Writing. Trang kết quả dựa vào trạng thái chấm, không dựa vào `score != null`.
- Bài trắng được xử lý tại backend; không gửi API. Lỗi/quota không bị đổi thành điểm 0 hay A1.
- Nhận xét theo ngôn ngữ đã chọn lúc nộp; bản sửa và trích dẫn giữ tiếng Anh. Bản gốc bất biến.
- Khi thất bại, chủ bài có thể retry theo giới hạn/cooldown. Retry tự động tối đa 3 lần; lỗi cấu trúc/bằng chứng có một lần thử thêm.
- Khi tắt Writing, bài mới lưu UNASSESSED; job đã có tạm chờ. Bài cũ không tự bị enqueue hàng loạt.

## Kiểm thử

```powershell
# Backend: không gọi AI thật
npm run typecheck
npm run test:writing
npm run test:writing:localdb
npm run build

# Chỉ khi muốn thử Gemini thật (dùng bài giả lập)
npm run ai:writing:smoke
npm run ai:writing:demo
npm run ai:writing:demo -- --full
```

`test:writing:localdb` tạo/sử dụng `aptimate_ai_writing_test` trên PostgreSQL localhost khi chưa có TEST_DATABASE_URL. Mỗi lượt tạo schema ngẫu nhiên rồi dọn schema đó; không kiểm thử xóa dữ liệu trên database ứng dụng. Nếu dùng máy khác, cấu hình TEST_DATABASE_URL trỏ đến database tên kết thúc `_test` rồi chạy `test:writing:db`.

Trong `frontend`: `npm test`, `npm run test:writing:ui`, `npm run build`. Browser test dùng Edge headless trên Windows và dữ liệu fixture, không truy cập tài khoản thật.

Đã xác minh smoke Gemini, một bài Full đủ 11 câu có CEFR và một bài Part 2 có CEFR null. Đây là kiểm tra kết nối/chức năng, không phải hiệu chỉnh độ chính xác với dataset.

## Theo dõi và bài cũ

SQL dành cho người quản trị, không đọc bài làm hay key:

```sql
SELECT attempt_id, assessment_revision, status, attempt_count, error_code,
       available_at, lease_expires_at
FROM writing_grading_jobs
ORDER BY created_at DESC
LIMIT 20;
```

Chấm thử một bài cũ chưa có job (CLI chỉ nhận một attempt, mặc định preview):

```powershell
npm run ai:writing:backfill -- --attempt-id <UUID>
npm run ai:writing:backfill -- --attempt-id <UUID> --apply
```

Nếu bài đã có job thất bại, dùng nút “Thử chấm lại” trên trang kết quả; script backfill không vượt giới hạn retry.

## Đổi API sau này

Thêm adapter triển khai `AiProvider`, đăng ký trong `AiModule`, bổ sung cấu hình/validation Writing. Giữ hợp đồng `result.writing` và các component UI. Provider schema có sáu tiêu chí dạng object bắt buộc theo tên để model không bỏ tiêu chí; validator chuyển về array ổn định trước khi lưu. Không refactor Speaking trong task đổi provider Writing.

Tiến độ và checkpoint khi cần dừng vì giới hạn tài khoản được lưu trong `AI_WRITING_PROGRESS.md`.
