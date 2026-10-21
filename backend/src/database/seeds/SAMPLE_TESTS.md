# Seed đề mẫu AptiMate

## Bộ mở rộng 5 đề mỗi nhóm — 21/10/2026

Lệnh riêng `db:seed:expanded` bổ sung **140 đề PUBLISHED** bên cạnh bộ 28 đề demo cũ:

| Kỹ năng | Tests Full | Practice Full | Practice từng Part | Tổng mới |
|---|---:|---:|---:|---:|
| Grammar & Vocabulary | 5 | 5 | 5 × 2 | 20 |
| Reading | 5 | 5 | 5 × 4 | 30 |
| Listening | 5 | 5 | 5 × 4 | 30 |
| Writing | 5 | 5 | 5 × 4 | 30 |
| Speaking | 5 | 5 | 5 × 4 | 30 |
| Tổng | 25 | 25 | 90 | **140** |

Năm bộ theo chủ đề Photography, Cooking, Walking, Books, Music. Trong mỗi kỹ năng, Tests Full và Practice Full của **cùng số bộ** dùng chung nội dung; Practice Part lấy phần tương ứng của bộ đó. Đây là 25 bộ nội dung theo kỹ năng được triển khai thành 140 đề theo chế độ, không phải 140 bộ câu hỏi độc lập. Cấu trúc/cách hỏi có chủ đích lặp lại để luyện tập; nội dung giữa năm bộ có thay đổi. Không dùng làm đề thi chuẩn hóa hoặc ngân hàng đề bảo mật.

- Grammar: 125 câu ngữ pháp theo ngữ cảnh và 125 mục từ vựng có định nghĩa, chia thành năm bộ; lựa chọn đáp án được đổi vị trí.
- Reading: đủ điền từ, sắp xếp hai văn bản, ghép bốn người và ghép bảy tiêu đề; không xuất danh sách câu sắp xếp ở thứ tự đã giải.
- Listening: **85 MP3 mới**, gồm 65 đoạn Part 1, 5 đoạn Part 2, 5 hội thoại Part 3 và 10 bài nói Part 4. Kịch bản trong `expanded-listening.ts` là nguồn tạo audio và giải thích; giọng Windows David/Zira, có phân biệt giọng nam/nữ ở hội thoại. Không tái sử dụng audio demo không khớp đáp án của bộ cũ.
- Writing: có bài mẫu; kiểm tra số từ đúng các khoảng 1–5, 20–30, 30–40, 40–50 và 120–150.
- Speaking: dùng hai ảnh hoạt động đã xem (người nói trước microphone và trận bóng đá), câu hỏi theo đúng hình; không sử dụng ảnh meme/bài đăng. Câu trả lời mở có hướng dẫn, không áp đáp án duy nhất.

```powershell
# Không cần DB hay kết nối mạng: kiểm tra nội dung, số lượng và 85 kịch bản
npm run db:seed:expanded -- --dry-run

# Kiểm tra thêm manifest audio đã được lưu cùng source
npm run db:seed:expanded -- --dry-run --with-audio

# Thêm vào DATABASE_URL; kiểm tra tất cả URL audio trước transaction
npm run db:seed:expanded -- --apply

# Chỉ cần khi thay kịch bản hoặc tạo lại media (Windows + David/Zira + Cloudinary)
npm run seed:expanded:audio -- --upload

# Kiểm thử unit và DB riêng đã cấu hình TEST_DATABASE_URL kết thúc bằng _test
npm test -- --runTestsByPath src/database/seeds/seed-sample-tests.spec.ts src/database/seeds/seed-expanded-tests.spec.ts
npm run test:seed:expanded:db
```

Manifest `expanded-audio-manifest.json` lưu URL công khai, SHA-256 của kịch bản/giọng/tốc độ và thời lượng; không lưu khóa dịch vụ. `--apply` từ chối media thiếu, hash cũ hoặc URL không truy cập được. Có thể seed trên hệ điều hành khác bằng manifest sẵn có; chỉ bước tái tạo audio cần Windows. WAV/MP3 trung gian nằm trong `uploads/seed-expansion/` đã gitignore. Script upload có checkpoint từng file và public ID theo hash để tiếp tục sau lỗi.

Namespace `aptimate-expanded-tests-v1` độc lập với seed cũ. Chọn ADMIN bằng cùng quy tắc `SAMPLE_SEED_ADMIN_ID`; chạy lại với **cùng ADMIN** bỏ qua cả đề đã sửa/lưu trữ, không ghi đè. Đổi ADMIN tạo bộ riêng. Tạo đề/câu/snapshot/audit trong một transaction qua repository hiện có; không gọi chấm AI. Trigger GĐ10 tự xếp 140 việc gợi ý chủ đề và ghi 1.905 ánh xạ câu/snapshot. Không tự duyệt nhãn; độ phủ nhãn đã duyệt sẽ giảm khi thêm câu mới, admin cần duyệt theo luồng hiện hành. Worker đang chạy có thể xử lý hàng đợi sau khi transaction commit.

Kiểm chứng: 10 unit test đạt; PostgreSQL schema cách ly chạy migration hiện hành, tạo 140 đề/1.905 câu/140 job, kiểm tra đủ snapshot và chạy lại sau khi sửa/lưu trữ một đề; toàn bộ dữ liệu kiểm thử rollback và schema được dọn. Typecheck và ESLint các file seed đạt.

Đã áp dụng vào database local ngày 21/10/2026: `created=140, skipped=0`, tổng đề từ 39 lên 179; chạy lại `created=0, skipped=140`. Đối chiếu database thật có đủ 28 nhóm × 5 đề xuất bản, 1.905 câu và 1.905 ánh xạ snapshot. Cả 85 URL audio đã được kiểm tra truy cập trước lần áp dụng.

## Bộ demo ban đầu (28 đề)

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
