# Nghiệm thu cá nhân hóa S3 — Đánh giá đầu vào

Ngày: 22/10/2026. Nhánh: `fix/personalization-s3`, từ `origin/develop` (`9362a8f`, đã có S1/S2).
Phạm vi theo mục S3 của `Kế hoạch sửa cá nhân hóa AptiMate.md`. Chưa triển khai S4/S5/GĐ11.

## Hành vi

- `GET /me/ability-profile` chỉ đọc hồ sơ của người đăng nhập; trả band, gợi ý mục tiêu tăng một mức (tối đa C), ba kỹ năng còn thiếu và đề đánh giá đã xuất bản.
- G&V, Reading, Listening cần có ít nhất một bài full được chấm hợp lệ trong lịch sử; không bắt làm lại khi đã có lịch sử. Writing/Speaking tùy chọn. Chưa đủ hai kỹ năng chính thì chưa gợi ý band chung.
- Tạo/thay mục tiêu vẫn được phép khi chưa đánh giá; response thêm `placementComplete`.
- Tuần 1 xếp từng kỹ năng bắt buộc còn thiếu vào ngày 1, 2, 3 với reason `PLACEMENT`, mỗi ngày một bài. Khi đã có một kỹ năng, chỉ xếp những kỹ năng còn thiếu từ ngày 1. Bài nộp sau khi đặt mục tiêu vẫn tính tiến độ số bài.
- RULE và AI dùng cùng ứng viên. Validator bắt buộc giữ ngày, không bỏ/lặp bài đánh giá; bài đánh giá không ảnh hưởng vòng xoay đề luyện thường. Tuần sau không sinh ứng viên đánh giá.
- Dashboard có thẻ đầu trang hiển thị ba kỹ năng bắt buộc và hai tùy chọn, nút vào đề; thẻ ẩn khi đủ ba kỹ năng. Profile hiển thị band hiện tại, tự điền band gợi ý khi chưa có mục tiêu, giữ lựa chọn người dùng đã sửa và cảnh báo đánh giá chưa đủ.
- Admin có công tắc ở danh sách và trang sửa đề của cả năm kỹ năng, desktop/mobile. API sửa/tạo đề giữ `isPlacement`; cập nhật nhanh dùng version chống ghi đè và audit. Part không bật được ở UI, validation và CHECK DB. Cảnh báo kỹ năng bắt buộc chưa có đề được xuất bản.

## Quyết định Music đã được người dùng chốt

Giữ CHECK chỉ `FULL_SKILL` được bật `is_placement`. Thêm `placement_family_id` trong cùng migration S3 để liên kết nội dung full/Part; các thành viên của nhóm có đề đánh giá bị loại khỏi ứng viên luyện thường và ôn chủ đề. Không ẩn chúng khỏi catalog chung.

Script nhận diện bằng ID xác định của seed Music (form 5), không dựa vào tiêu đề. Liên kết 10 full (5 EXAM + 5 PRACTICE) và 18 Part. API chọn một đề mỗi kỹ năng, ưu tiên EXAM. Các Part vẫn `is_placement=false`. Script bỏ qua đề lưu trữ, đã đổi scope hoặc đã có liên kết nhóm khác; không đổi nội dung, snapshot hay kết quả đã học.

```powershell
cd backend
npm run personalization:placement-music -- --dry-run
npm run personalization:placement-music -- --apply
```

`--apply` là thao tác cấu hình lại Music có chủ đích, có audit; chạy lại khi cấu hình không đổi không tăng version. Nếu admin đã tắt một full Music, chạy lại `--apply` sẽ bật lại. Không tự chạy trong worker.

## Database và triển khai

- Migration duy nhất: `AddPlacementTests1760000022000`, cột flag/group, CHECK và partial indexes. `down` bỏ cấu hình đánh giá, không xóa đề/lịch sử.
- Đã áp dụng riêng migration S3 trên local, cấu hình đúng 10 full + 18 Part. Các migration Writing/Vocabulary không liên quan đang chờ ở local được giữ nguyên. Không sửa `.env`.
- `SNAPSHOT_VERSION=4`, `REPORT_PROMPT_VERSION=personal-weekly-v4` để không dùng cache ứng viên cũ. FINAL giữ v2.
- Mục tiêu/lộ trình cũ không bị tự viết lại; cấu hình mới dùng khi tạo lộ trình. Môi trường mới cần chạy migration rồi script cấu hình sau seed expanded.
- Khởi động lại backend/frontend sau checkout. Chưa push/merge S3.

## Kiểm chứng

- Unit: RULE phân bố bài đánh giá, giới hạn ngày, AI từ chối bỏ/đổi ngày/lặp/sai reason; chuẩn hóa flag của năm kỹ năng và chặn Part.
- PostgreSQL schema cách ly: migration lên/xuống/lên; Music liên kết/idempotency; hồ sơ người mới, Reading full giảm missing còn hai, không lẫn tài khoản; tạo mục tiêu trước đánh giá; ứng viên thường không có Music; tuần 1 ngày 1–3; cập nhật flag/version/audit năm repository; HTTP phân quyền và validation.
- Browser: thẻ đánh giá, gợi ý band và giữ lựa chọn thủ công, mở đề Reading, ẩn khi hoàn tất, mobile; công tắc admin và Part builder.
- Hồi quy lộ trình/báo cáo và giao diện cá nhân hóa; TypeScript, lint và build frontend.

Kết quả chạy cuối được cập nhật trong bàn giao phiên.
