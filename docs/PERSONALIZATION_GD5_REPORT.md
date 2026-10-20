# GĐ5 — Nhắc nhở học tập hằng ngày

Ngày triển khai: 20/10/2026. Tiếp tục nhánh `feat/learning-personalization`.

## Phạm vi

- Worker cá nhân hóa xử lý tối đa 50 người/lượt, chu kỳ 60 giây. Sau khi cập nhật tiến độ và tạo lộ trình RULE còn thiếu, kiểm tra giờ nhắc theo `users.timezone` (mặc định 19:00).
- Chỉ nhắc người học đang hoạt động, có mục tiêu ACTIVE và việc hôm nay chưa xong. Ngày của lộ trình và thời hạn vẫn theo múi giờ đã chốt của mục tiêu.
- IN_APP luôn được xếp khi bật nhắc; EMAIL chỉ khi bật email nhắc. Không gọi AI. Nội dung nêu số bài còn lại, số ngày còn lại, phần việc chưa hoàn thành; ngày cuối có câu riêng. Đủ số bài vẫn nhắc luyện tập cho đến khi mục tiêu kết thúc.
- Giữ khóa người dùng trong transaction; thông báo, người nhận và `last_reminded_on` được ghi nguyên tử. Khóa duy nhất `reminder:<user>:<ngày>:<channel>` chống tạo trùng khi nhiều worker chạy.
- Sau giờ nhắc, đánh dấu ngày đã xử lý cả khi tắt nhắc hoặc đã xong việc. Không nhắc bù ngày cũ. Khi đổi múi giờ lùi ngày, không xử lý lại ngày đã qua.
- Scheduler thông báo hiện có giao hàng sau commit. Trước khi giao, kiểm tra lại ngày hiện tại, mục tiêu, tài khoản, việc chưa xong và cài đặt kênh. Nhắc không còn hợp lệ được đánh dấu `REMINDER_NO_LONGER_DUE`.
- Email có liên kết mở lộ trình và liên kết tới cài đặt tắt email nhắc. Người dùng đăng nhập rồi bấm nút tắt; việc mở URL không tự thay đổi cài đặt. Giữ nguyên email báo cáo và nhắc trên web.
- Giao diện giải thích quy tắc nhắc bằng tiếng Việt/Anh, dùng API cài đặt đã có. Không cần migration mới.

## Kiểm chứng

Kết quả: backend 72 suite/459 test đạt; typecheck và lint backend đạt; browser personalization đạt; frontend production build đạt (còn cảnh báo kích thước bundle có sẵn).

- Unit test mẫu câu: số lượng còn lại, ngày cuối theo múi giờ, tiếp tục học khi đủ số bài.
- PostgreSQL integration trên database `_test`, schema riêng: 5 ngày, hai worker, trước giờ/đúng giờ, học xong, tắt nhắc, một thông báo/ngày/kênh, hết hạn, hàng đợi quá ngày, tắt email trước giao, đổi múi giờ, downtime và rollback nguyên tử. SMTP/socket được thay bằng bộ ghi nhận trong test.
- Browser test desktop/mobile: đổi giờ và lưu, liên kết tắt email, giữ nguyên cài đặt khác; hồi quy nhập mục tiêu, lộ trình, ôn câu sai và chatbot.
- Test email kiểm tra cả HTML/text, liên kết và escaping. Không gửi email hoặc gọi AI thật trong quá trình kiểm thử.

## Chạy và nghiệm thu

1. Bật `PERSONALIZATION_WORKER_ENABLED=true`; giữ notification scheduler hoạt động (`NOTIFICATION_SCHEDULER_ENABLED` không phải `false`). Khởi động lại backend.
2. Cấu hình SMTP hiện có và `FRONTEND_ORIGIN` đúng địa chỉ web để gửi email có liên kết. Không sửa hoặc commit `.env` trong giai đoạn này.
3. Tạo mục tiêu, để ít nhất một việc hôm nay chưa xong, đặt giờ nhắc gần hiện tại. Sau giờ đó, kiểm tra hộp thông báo; nếu bật email thì kiểm tra hộp thư.
4. Chạy lại worker hoặc tải lại web không tạo thêm nhắc ngày đó. Thử ngày kế tiếp với việc đã xong hoặc nhắc đã tắt: không nhận nhắc.
5. Mở liên kết tắt email trong email, đăng nhập nếu cần, bấm tắt. Cài đặt email báo cáo và IN_APP giữ nguyên.

Độ trễ phụ thuộc chu kỳ worker và số người trong hàng đợi. Dedupe bảo đảm một bản ghi/ngày/kênh; SMTP không có khóa idempotency nên không thể cam kết exactly-once khi tiến trình chết sau khi máy chủ SMTP nhận thư nhưng trước khi ghi trạng thái giao. Lỗi SMTP được lưu theo cơ chế thông báo hiện có.

Dừng ở GĐ5 để người dùng nghiệm thu. GĐ6 AI/nhận xét và các giai đoạn báo cáo chưa triển khai.
