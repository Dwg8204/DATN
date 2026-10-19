# Cá nhân hóa GĐ1 — Nền dữ liệu

Hoàn thành triển khai ngày 19/10/2026 trên nhánh `feat/learning-personalization`. Đã pull fast-forward `origin/develop` tới `b39c7db` trước khi sửa code. Tiếp tục dùng nhánh chung cho chức năng cá nhân hóa theo yêu cầu của người dùng.

## Phạm vi đã hoàn thành

- Hai migration mới `1760000017000-AddPersonalizationEnums` và `1760000018000-AddLearningPersonalization`. Số 15000/16000 trong bản kế hoạch đã được phân quyền/P0 sử dụng.
- Bốn bảng mới: cài đặt người học, insight/báo cáo, lộ trình tuần và các việc trong lộ trình.
- Mở rộng `learning_goals`, `notifications`, `chat_sessions`, `learning_topics`, `question_topics`; thêm index đếm bài, lượt ôn thẻ, việc AI, lịch gửi báo cáo và nhãn chờ duyệt.
- Thêm mô hình dữ liệu TypeScript, bốn repository và `PersonalizationModule`. Giữ cách truy cập SQL có tham số qua TypeORM của repository hiện tại, không bật synchronize hoặc đưa thêm lớp ORM khác.
- Repository lọc dữ liệu theo chủ sở hữu; tạo lộ trình cùng các việc con trong transaction; upsert cài đặt giữ ngày đã nhắc; xếp insight trùng kỳ không ghi đè snapshot cũ.

GĐ1 chưa có API mục tiêu, cài đặt trên Profile, worker hoặc nội dung AI. Giao diện hiện tại chưa chuyển mục tiêu từ localStorage lên server; đó là GĐ2. Seed chủ đề và luồng AI gợi ý/admin duyệt thuộc GĐ10.

## Các điểm đã làm rõ so với SQL kế hoạch

1. TypeORM trước đây dùng transaction chung mặc định. Đã cấu hình `migrationsTransactionMode: each` để migration enum được commit riêng trước migration schema; CLI dùng cùng cấu hình.
2. CHECK của `MISTAKE_REVIEW` yêu cầu `question_keys IS NOT NULL`, 1–10 phần tử, một chiều và không có phần tử null. SQL `cardinality(NULL)` đơn lẻ có thể vượt qua CHECK do PostgreSQL chấp nhận kết quả UNKNOWN.
3. Thêm khóa ngoại kết hợp để mục tiêu thay thế, insight và lộ trình không liên kết sang chủ sở hữu khác; insight của lộ trình phải thuộc cùng mục tiêu. Chặn mục tiêu tự thay thế chính nó.
4. Ràng buộc số đếm, snapshot version/hash và khoảng ngày; `done_count` không vượt `target_count`. Giữ quy tắc unique một mục tiêu ACTIVE/người, một insight/kỳ mục tiêu, một COMMENT/người/ngày và một lộ trình/mục tiêu/tuần.
5. Migration kiểm tra mục tiêu cũ trước khi thêm CHECK. Nếu phát hiện dữ liệu không hợp lệ thì dừng với mã lỗi, giữ nguyên dữ liệu để xử lý có chủ đích; không tự ép số ngày/band/số bài.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `npm test` | **68 suite / 418 test đạt** |
| Typecheck và build backend | Đạt |
| ESLint các file GĐ1 | Đạt |
| PostgreSQL `test:personalization:db` | Đạt trên `aptimate_chatbot_test`, schema riêng |
| Hồi quy `test:chatbot:db` | Đạt, HTTP mock |

Test PostgreSQL chạy toàn bộ migration lịch sử rồi kiểm tra dữ liệu cũ, lần chạy bị từ chối và tiếp tục, up → down → up, nhãn topic cũ, mặc định nhắc/email, giới hạn mục tiêu, khóa ngoại, index, chống trùng khi chạy đồng thời, truy cập chéo người dùng, xóa theo user, SET NULL khi xóa insight/mục tiêu thay thế và rollback toàn bộ lộ trình nếu một việc không hợp lệ. Rollback enum được kiểm tra cả trường hợp đang có dữ liệu dùng enum mới.

Các test chỉ dùng fixture trên database `_test`. Không gọi Gemini/Groq thật, gửi email hoặc thông báo thật. Frontend không thay đổi trong giai đoạn này.

## Database local

Đã kiểm tra local trước migration: `learning_goals` có 0 dòng, không có mục tiêu cũ vi phạm CHECK. Sau khi test đạt, đã áp dụng đúng hai migration mới theo thứ tự 17000 → 18000.

Xác minh có đủ bốn bảng mới, không còn migration chờ và số dòng người dùng, bài làm, hội thoại, mục tiêu, thông báo, nhãn chủ đề cũ giữ nguyên. Không nạp dữ liệu giả vào database ứng dụng.

Trên máy khác chạy `npm run db:migrate` trong `backend`. Nếu gặp `PERSONALIZATION_LEGACY_GOALS_INVALID`, cần xem lại mục tiêu cũ trước khi chạy tiếp. Rollback schema sẽ mất dữ liệu mới; rollback enum từ chối khi còn `REPLACED`/`LEARNING_REPORT`, không tự đổi trạng thái dữ liệu.

## Nghiệm thu và bước tiếp theo

1. Khởi động backend với code mới: các luồng đăng nhập, làm bài, dashboard và chatbot vẫn hoạt động; module GĐ1 không tự chạy AI/worker.
2. Kiểm tra `npm run db:migrate:status`: cả hai migration mới đã được áp dụng (local hiện tại đã xong).
3. Có thể chạy lại `npm run test:personalization:db` với `TEST_DATABASE_URL` riêng theo hướng dẫn trong `backend/src/features/personalization/README.md`.

Dừng ở GĐ1 chờ người dùng nghiệm thu. Bước tiếp theo là **GĐ2 — API mục tiêu/cài đặt, vòng đời thay/hủy/kết thúc sớm và Profile chuyển từ localStorage sang server**. Số migration kế tiếp khả dụng là `1760000019000`, cần kiểm tra lại khi bắt đầu task mới.
