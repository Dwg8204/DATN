# GĐ7 — Lộ trình AI, báo cáo tuần và giữa kỳ

Ngày triển khai: 20/10/2026.

Tài liệu đối chiếu: [Kế hoạch cá nhân hóa bản 2](PERSONALIZATION_IMPLEMENTATION_PLAN_V2.md), đặc biệt mục 4.1, 6.1, 7.1–7.6, 9.3 và hàng GĐ7 trong mục 10.

## Phạm vi

- `PLAN_START`: sau khi tạo/thay mục tiêu, tạo lộ trình RULE trước rồi xếp việc AI cho tuần đầu. Worker tạo bù việc còn thiếu trong tuần đầu.
- `WEEKLY`: sau khi hết ngày `7k` của mục tiêu và `7k < duration_days`, một request sinh cả báo cáo tuần vừa qua và lộ trình tuần kế tiếp.
- `MIDTERM`: chỉ mục tiêu từ 28 ngày; nâng báo cáo tuần gần mốc giữa mục tiêu nhất, hòa chọn tuần sớm hơn. Có thêm `progressSoFar`, không tạo thêm request ngoài báo cáo tuần.
- Không tạo `FINAL`. Mục tiêu 30 ngày có W1, W2 (MIDTERM), W3, W4; lộ trình từ W4 chỉ gồm ngày 29–30.
- Đủ số bài trước hạn vẫn học tiếp. Lộ trình AI tiếp tục có hoạt động luyện band đích khi số bài còn thiếu bằng không.

## Dữ liệu và kiểm tra AI

- Báo cáo lấy snapshot tại cuối đúng tuần cần báo cáo theo múi giờ cố định của mục tiêu. Tạo bù sau downtime vẫn dùng mốc lịch sử này, gồm số liệu tuần và lũy kế tới mốc đó.
- Worker tìm các kỳ chưa có insight, tối đa 50 kỳ/lượt; không bị kẹt ở 50 mục tiêu đã xử lý đầu tiên. Các kỳ đã hết trước khi mục tiêu kết thúc cũng được tạo bù sau khi trạng thái chuyển COMPLETED/EXPIRED/REPLACED.
- Prompt không chứa tên, email, ID người học, ID bài làm, ID đề, tiêu đề đề, question keys hoặc bài làm thô. AI chỉ thấy số liệu và candidateId ngắn; ánh xạ sang dữ liệu thật lưu phía server.
- Dùng provider/model, temperature 0.2, timeout và ghi token từ `ai-shared` của GĐ6. Purpose là `PERSONAL_PLAN` hoặc `PERSONAL_WEEKLY`, kể cả giữa kỳ.
- Kiểm tra schema chính xác, giới hạn narrative/progressSoFar 120 từ, reason 20 từ, candidateId, chỉ số ngày, targetCount, tối đa 3 việc/ngày, tổng số bài theo nhịp cần thiết và phủ kỹ năng khi số ngày cho phép. Nội dung văn bản qua bộ kiểm tra số/band/link/HTML dùng chung; thêm kiểm tra một số câu mâu thuẫn tiến độ.
- Cache theo hash đầu vào trong cùng tài khoản và loại insight. Không gọi lại insight READY; nội dung cache vẫn qua validator trước khi áp dụng.
- Cùng một worker xử lý COMMENT và báo cáo để chia giới hạn 6 request/người/ngày, RPM, khóa advisory PostgreSQL và hàng đợi SKIP LOCKED. Đầu ra không hợp lệ được sửa một lần; lịch retry 15 phút, 1 giờ, 4 giờ. 429 dừng lượt, lùi lịch và không tăng retry_count.
- Báo cáo luôn có số liệu và lời mẫu để đọc khi AI tắt hoặc chờ retry. AI tắt không gọi provider; khi bật lại, worker xử lý lại các bản fallback còn đủ lượt. Sau khi hết lượt, việc tắt/bật tính năng qua worker hoặc đổi provider/model/prompt cho phép một chu kỳ thử lại mới; không thử vô hạn cùng cấu hình.

## Áp dụng lộ trình

- Hàng đợi AI không chặn tạo lộ trình RULE. Đầu tuần mới chưa có lộ trình thì cơ chế đối soát hiện có tạo RULE ngay.
- Trước khi thay, đối soát tiến độ dưới khóa người học. Giữ nguyên ID, done_count, completed_at và hoạt động của ngày đã có việc làm dở/đã xong; giữ cả các ngày đã qua. Chỉ thay những ngày chưa có tiến độ còn lại.
- Giữ cả ngày đã có tiến độ nhằm bảo toàn thứ tự phân bổ bài nộp giữa các việc trong tuần, không chuyển bài đã tính sang việc mới.
- Không áp dụng lộ trình cho mục tiêu đã kết thúc hoặc tuần đã qua. Nếu đề bị ẩn sau lúc gọi AI, giữ lộ trình hiện có thay vì áp dụng đề không còn xuất bản.
- Báo cáo cũ vẫn được tạo và đọc dù không còn áp dụng lộ trình của tuần đó.

## Giao báo cáo

- Sau khi AI hoàn tất, `deliver_at` là 08:00 sớm nhất chưa qua trong múi giờ tài khoản. Hoàn tất lúc 01:00 gửi sáng cùng ngày; lúc 09:00 gửi sáng hôm sau. Có kiểm thử chuyển giờ mùa hè.
- Khi AI tắt, báo cáo lời mẫu được hẹn tương tự. Nếu hết retry, tính lại giờ giao từ lúc chuyển fallback.
- Mỗi insight/kênh có `dedupe_key=report:<insightId>:<channel>`. Hàng đợi web và email được ghi trong một transaction.
- Dùng scheduler thông báo hiện có; email báo cáo được nhận theo nhóm người dùng, tránh chia một nhóm cho hai worker. Các báo cáo đã đến lịch của nhiều mục tiêu được gộp một email.
- Kiểm tra lại email_report_enabled và trạng thái người nhận ngay trước gửi. Tắt email không ảnh hưởng thông báo trên web.
- `notified_at` và `emailed_at` ghi khi kênh thực sự giao thành công, không phải lúc chỉ xếp hàng.
- Email HTML/text chứa headline, ba số liệu do code tính và liên kết xem báo cáo; không chứa điểm chi tiết hay bài làm. Link tắt email dẫn tới phần cài đặt có đăng nhập và nút xác nhận tắt.
- Chu kỳ personalization là 60 giây, notification scheduler là 5 giây: 08:00 là mốc đến hạn, thời điểm giao thực tế phụ thuộc lượt worker và SMTP. Dedupe ngăn xếp hàng trùng; không cam kết SMTP exactly-once nếu tiến trình chết sau khi máy chủ thư nhận email nhưng trước khi ghi kết quả vào DB.

## API và giao diện

- `GET /me/reports?goalId=&page=`: danh sách báo cáo tuần/giữa kỳ của chính người đăng nhập, 20 bản/trang.
- `GET /me/reports/:id`: đọc báo cáo thuộc sở hữu và ghi read_at. Không trả candidate mapping nội bộ.
- Dashboard có danh sách ba báo cáo gần đây; liên kết mở `/profile/reports/:id`.
- Màn chi tiết tuần/giữa kỳ hiển thị số liệu, nội dung AI hoặc lời mẫu, tiến độ từ đầu mục tiêu, liên kết lộ trình; poll khi PENDING/FAILED và có nút tải lại.
- Lộ trình hiển thị lý do gợi ý từ AI. Cài đặt hỗ trợ link tắt email báo cáo.
- Màn đọc tối thiểu được nối trong GĐ7 để liên kết email/web hoạt động. Trang lịch sử báo cáo đầy đủ trong ProfileSidebar, FINAL, nút đặt mục tiêu gợi ý vẫn thuộc GĐ8; hỏi chatbot thuộc GĐ9.

## Kiểm thử và nghiệm thu

Đã chạy trong lượt triển khai:

- PostgreSQL thật trên database `aptimate_chatbot_test`, schema riêng tạo và dọn tự động; provider và SMTP được mock. Kiểm tra START, WEEKLY/MIDTERM, mốc lịch sử, mục tiêu 30 ngày, giữ việc đang làm, hai worker, sửa candidate sai, cache không gọi lại, ownership, 08:00, gộp email, opt-out, fallback và 429 đạt.
- Bộ kiểm thử liên quan hợp đồng AI/lịch, email và hồi quy provider/chatbot: 7 suite/78 test đạt.
- Browser cá nhân hóa mở rộng: các luồng cũ, liên kết báo cáo giữa kỳ, bảng số liệu, fallback → READY, lỗi quyền/không tìm thấy, mobile không tràn ngang và tắt email báo cáo đạt.

- Hồi quy backend toàn bộ: 77 suite/521 test đạt; runner PostgreSQL cá nhân hóa GĐ1–GĐ7 đạt.
- Frontend: 95/95 test chính đạt; browser cá nhân hóa đạt. Typecheck backend và build cả backend/frontend đạt.
- ESLint các file TypeScript thay đổi đạt. Frontend lint thoát thành công, còn cảnh báo; trong file GĐ7 có cảnh báo `set-state-in-effect` khi reset màn báo cáo lúc đổi ID/tải lại. Build frontend còn cảnh báo chunk lớn hơn 500 kB.
- `git diff --check` đạt. Bản Markdown giữ toàn bộ dòng nội dung không rỗng của nguồn sau khi chuyển định dạng; sơ đồ gốc thiếu dữ liệu ảnh được ghi chú, không tự dựng lại.

Lệnh:

```powershell
# backend, TEST_DATABASE_URL phải là DB riêng có tên kết thúc _test
npm run test:personalization
npm run test:personalization:db
npm test -- --runInBand
npm run typecheck
npm run build

# frontend
npm run test:personalization:ui
npm test
npm run lint
npm run build
```

Runner DB tắt AI và worker tự chạy trong môi trường con; ca kiểm thử AI bật cấu hình fixture riêng và thay HTTP bằng mock. Không gửi bài học thật hoặc SMTP thật trong kiểm thử này.

Không có migration mới. Giữ `PERSONALIZATION_WORKER_ENABLED=true`, `PERSONALIZATION_AI_ENABLED=true` để dùng AI, cấu hình provider/model của GĐ6; email cần SMTP và frontend origin đang dùng. Không sửa `.env` trong lượt triển khai.

Nghiệm thu thủ công: tạo mục tiêu với tài khoản thử, xem RULE xuất hiện ngay; đợi worker rồi mở lại Dashboard để xem lộ trình AI. Mở báo cáo từ web/email, đối chiếu số liệu; tắt email báo cáo và kiểm tra web vẫn nhận. Chưa gọi AI thật/SMTP thật cho GĐ7; chưa đánh giá rubric GĐ11. Kiểm tra văn bản bằng code không thay thế việc chấm chất lượng và tính đúng ngữ nghĩa trên bộ mẫu.

Trạng thái bàn giao: đã triển khai và kiểm thử tự động GĐ7, chờ nghiệm thu thực tế. GĐ7 đã commit theo yêu cầu người dùng, chưa push. Người dùng đã cho phép tiếp tục GĐ8; trạng thái GĐ8 theo báo cáo riêng. Khởi động lại backend sau khi lấy mã mới để nạp worker và API.
