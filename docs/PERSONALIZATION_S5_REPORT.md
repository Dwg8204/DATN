# Báo cáo triển khai S5 — 23/10/2026

## Phạm vi theo kế hoạch

Triển khai hai hạng mục S5 trong “Kế hoạch sửa cá nhân hóa AptiMate.md” trên nhánh fix/personalization-s5, kế thừa S4 (1e4907a). Không triển khai GĐ11. Không cần migration.

## Validator hiểu trạng thái

- COMMENT và FINAL bắt buộc statusEcho, bandClaim ở cấp ngoài; WEEKLY/MIDTERM bắt buộc hai trường trong report. PLAN_START chỉ có plan như trước.
- statusEcho phải khớp goal.status. TARGET_REACHED chỉ hợp lệ khi trạng thái band do code tính là REACHED; CURRENT cần dữ liệu band hiện tại.
- Bảng từ khóa dùng chung chặn lời văn trái tiến độ và “đã đạt B2” khi B2 mới là đích. Kiểm tra cả khi metadata đúng nhưng lời văn sai. Tiếp tục kiểm tra số liệu, độ dài, danh sách ứng viên và các ràng buộc cũ.
- COMMENT không có goal dùng ON_TRACK làm giá trị quy ước bắt buộc, nhưng không được kết luận về tiến độ. Band chung và đích lấy từ snapshot; FINAL ưu tiên outcome đã đóng băng.
- Prompt cung cấp validationContext cho AI. COMMENT v2, WEEKLY v5, FINAL v3; SNAPSHOT_VERSION vẫn 4 vì không đổi cấu trúc snapshot. Hash cache COMMENT chứa prompt version. Không tạo lại báo cáo READY cũ.
- Validator theo bảng từ khóa như kế hoạch, không phải bộ hiểu ngữ nghĩa bao phủ mọi cách diễn đạt.

## Nhận xét sau khi thử lại

- FAILED còn lượt (retry_count <= 3, theo worker hiện có) trả RETRYING và nextRetryAt. FALLBACK được trả rõ; trạng thái hết lượt khác được ẩn.
- Thẻ nhận xét hiển thị thông báo thử lại Việt/Anh. Dashboard tiếp tục poll qua overview chung của S4 theo 15 → 30 → 60 → 60 giây khi PENDING/RETRYING. Không thêm request riêng từ thẻ con.
- READY tự hiện nội dung; READY/FALLBACK/HIDDEN dừng polling. nextRetryAt thể hiện lịch worker, còn polling dùng chu kỳ giới hạn của kế hoạch.
- Giữ nguyên quota, backoff worker, công tắc AI, quyền truy cập và GET chỉ đọc.

## Kiểm thử đã đạt

- 174 unit tests / 13 suites cá nhân hóa; 41 ca mới về trạng thái, band, metadata, không có mục tiêu và các trường hợp hợp lệ.
- Hai câu bắt buộc: “Bạn đang vượt tiến độ” với BEHIND và “Bạn đã đạt B2” khi B2 chỉ là đích đều bị từ chối cho COMMENT/WEEKLY/MIDTERM/FINAL.
- PostgreSQL: personalization-comments, personalization-reports, personalization-final, personalization-overview. Bổ sung FAILED → RETRYING → READY, nextRetryAt, hết lượt → FALLBACK. Fixture FINAL gọi reconcile tường minh phù hợp GET chỉ đọc từ S4.
- Browser Edge headless: một overview, sync có điều kiện, PENDING/RETRYING tự cập nhật READY không reload, nhịp 15/30/60 giây, dừng ở READY/FALLBACK/HIDDEN và viewport mobile không tràn ngang.
- TypeScript, ESLint các file backend thay đổi, oxlint các file frontend thay đổi, build frontend và git diff --check.
- Build còn cảnh báo chunk trên 500 kB đã có. Kiểm thử dùng dữ liệu cô lập và phản hồi AI giả lập, không gọi Gemini/email thật.

## Vận hành

Khởi động lại backend/worker và tải frontend mới để dùng hợp đồng AI và polling mới. Không cần đổi .env hay chạy migration cho S5. Các nội dung READY đã lưu không được kiểm định hoặc viết lại tự động. Chưa push/merge; nhánh này chứa chuỗi thay đổi S3/S4 trước đó.
