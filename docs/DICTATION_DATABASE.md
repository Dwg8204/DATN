# Dictation, Vocabulary Notebook và Flashcard — lưu dữ liệu vào DB

## Chạy bản cập nhật

Phần này dùng PostgreSQL và `DATABASE_URL` sẵn có của backend, không cần thêm API key hay biến môi trường mới. Frontend dùng `VITE_API_BASE_URL` như hiện tại.

Trong thư mục `backend`:

```powershell
npm install
npm run db:migrate
npm run start:dev
```

Trong thư mục `frontend`:

```powershell
npm install
npm run dev
```

Không chạy reset DB hoặc xóa bảng. Migration `ConnectPersonalDictation1760000010000` bổ sung cột/index và đưa 5 chủ đề, 10 từ, 5 câu mẫu vào DB. Migration không xóa dữ liệu hiện có. Không tự động revert migration này: cần sao lưu và kế hoạch khôi phục riêng vì đã có dữ liệu học tập cá nhân.

## Dữ liệu được lưu

- Chủ đề cá nhân: `vocabulary_folders`.
- Từ mẫu: `vocabulary_entries`; từ/câu người dùng thêm và sửa: `user_notebook_items.custom_content`.
- Câu luyện nghe: `dictation_exercises`, liên kết qua `user_notebook_items.dictation_exercise_id`.
- Mỗi lần bấm Check answer: `dictation_attempts`, gồm bản chụp câu, bài gõ, điểm do backend chấm, tốc độ nghe, số lần phát và trạng thái gợi ý.
- Đánh dấu Known/Still learning: `vocabulary_review_events` và thông tin tổng hợp của Notebook.

API yêu cầu đăng nhập. Mỗi tài khoản đọc/ghi dữ liệu của mình. Sửa câu mẫu tạo bản cá nhân nếu nội dung thay đổi, không sửa bài của người khác. Xóa Notebook là archive, không xóa lịch sử làm bài và không tự thêm lại mục đã xóa khi tải trang.

Điểm % hiển thị là lần làm **gần nhất**, không phải điểm cao nhất. Điểm cao nhất vẫn được giữ riêng. Mã yêu cầu giúp chống ghi trùng khi gửi lại cùng một lần làm/đánh giá/tạo mục.

## Nhập dữ liệu cũ trong trình duyệt

Mở Dictation hoặc Notebook trong trình duyệt đã dùng trước đó, đăng nhập đúng tài khoản rồi bấm **Import browser data / Nhập dữ liệu từ trình duyệt** và xác nhận.

Chỉ nhập khi dữ liệu là của mình: các khóa localStorage cũ không phân biệt tài khoản. Thao tác nhập giữ nguyên bản cũ trong trình duyệt, nhập một lần cho mỗi mục và không phục hồi các mục đã archive trên DB. Nội dung đã sửa trên DB không bị bản cũ ghi đè. Kết quả cũ là số liệu tổng hợp được nhập, không phải bài làm được backend chấm lại; điểm lần làm mới sẽ được ưu tiên.

Trạng thái nhập được đánh dấu riêng theo tài khoản trong trình duyệt, nhưng dữ liệu học tập và kết quả mới nằm trên DB. Mất kết nối sẽ hiển thị lỗi và nút thử lại, không âm thầm chuyển sang lưu local.

## API

- `GET /api/v1/vocabulary/study`: đọc chủ đề, từ, câu và tiến độ.
- `POST /api/v1/vocabulary/study/items`: thêm mục.
- `PATCH /api/v1/vocabulary/study/items/:id`: sửa mục Notebook.
- `DELETE /api/v1/vocabulary/study/items/:id`: archive mục Notebook.
- `POST /api/v1/vocabulary/study/import-browser`: nhập dữ liệu cũ.
- `POST /api/v1/vocabulary/folders`: thêm chủ đề.
- `POST /api/v1/vocabulary/notebook/review-event`: lưu đánh giá Flashcard.
- `POST /api/v1/vocabulary/dictation/attempts`: chấm và lưu lần làm.

## Kiểm thử

```powershell
# backend — DB đã chạy migration, các dữ liệu thử tự rollback
npm run test:vocabulary:db
npm run typecheck
npm test

# frontend
npm run test:dictation
npm test
npm run build
```

Giới hạn: âm thanh hiện vẫn phát bằng SpeechSynthesis của trình duyệt, không lưu thành file audio mới trong DB. Quiz và Matching hiện là hoạt động luyện tập trong phiên, chưa có bảng lịch sử điểm riêng.
