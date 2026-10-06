# Seed đề mẫu AptiMate

Chạy trong thư mục `backend`:

```powershell
# Kiểm tra toàn bộ nội dung, không kết nối database
npm run db:seed:samples -- --dry-run

# Tạo dữ liệu vào DATABASE_URL trong môi trường hiện tại
npm run db:seed:samples
```

Database cần đã chạy migration và có một ADMIN đang hoạt động (có thể tạo bằng `npm run db:seed`). Nếu có nhiều ADMIN, chọn tài khoản bằng biến môi trường `SAMPLE_SEED_ADMIN_ID` (UUID). Seed không tạo hoặc sửa tài khoản.

| Kỹ năng | Tests | Practice | Tổng |
|---|---|---|---|
| Grammar & Vocabulary | Full | Full, Part 1–2 | 4 |
| Reading | Full | Full, Part 1–4 | 6 |
| Listening | Full | Full, Part 1–4 | 6 |
| Writing | Full | Full, Part 1–4 | 6 |
| Speaking | Full | Full, Part 1–4 | 6 |
| Tổng | 5 | 23 | 28 |

Các đề có tiền tố `[Mẫu]`, trạng thái PUBLISHED và cùng ảnh bìa được cung cấp. Đề Full và đề Part của cùng kỹ năng dùng chung bộ nội dung mẫu. Grammar có 25 câu ngữ pháp và 5 nhóm từ vựng; các kỹ năng còn lại có đủ 4 Part theo cấu trúc hiện tại. Có đáp án/giải thích hoặc bài mẫu phù hợp với loại câu hỏi.

Listening dùng luân phiên hai URL âm thanh được cung cấp. Câu hỏi và đáp án Listening là dữ liệu giả lập để kiểm tra giao diện, lưu bài và chấm điểm; chưa đối chiếu nội dung thực của hai file âm thanh. Speaking dùng cả bốn ảnh đã cung cấp, với câu hỏi mô tả/so sánh tổng quát. Đây là dữ liệu demo, chưa được kiểm định để đánh giá năng lực.

Seed dùng validation và repository hiện tại để tạo câu hỏi, xuất bản snapshot và ghi audit. Toàn bộ lần chạy nằm trong một transaction: có lỗi thì rollback. Khóa advisory tránh hai lần seed chạy đồng thời. Khóa tạo đề cố định theo ADMIN/kỹ năng/loại/Part; chạy lại với cùng ADMIN sẽ bỏ qua đề đã tồn tại, kể cả đã sửa hoặc lưu trữ, không ghi đè nội dung. Chọn ADMIN khác sẽ tạo bộ mẫu riêng của tài khoản đó.

Seed không tự chạy migration, xóa đề cũ, tạo attempt hay chấm AI. Chế độ `--dry-run` xác thực dữ liệu mà không cần DATABASE_URL.
