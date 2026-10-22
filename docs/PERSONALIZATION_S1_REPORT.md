# S1 — Sửa lộ trình và tính tiến độ

Ngày thực hiện: 22/10/2026. Nhánh: fix/personalization-s1, từ origin/develop (3112208).
Nguồn yêu cầu: [Kế hoạch sửa cá nhân hóa AptiMate](../Kế%20hoạch%20sửa%20cá%20nhân%20hóa%20AptiMate.md), mục S1. Chưa triển khai S2–S5 hoặc GĐ11.

## Thay đổi

- SQL ưu tiên Part yếu trước khi giới hạn 21 đề/kỹ năng; thứ tự ổn định theo người học, tuần và đề. Có hằng REGULAR_TEST_SQL chờ cột is_placement của S3.
- Snapshot thêm vocab.activeCount (thẻ chưa lưu trữ), giữ learningCount. Chỉ sinh ôn thẻ khi có ít nhất 10 thẻ, chọn mức 10 hoặc 20 phù hợp.
- Mỗi việc TEST có targetCount=1, tối đa 3 việc/ngày; xoay kỹ năng, dùng hết đề trước khi lặp, không lặp trong cùng ngày. Slot còn lại ưu tiên câu sai/chủ đề rồi ôn thẻ. Kho đề ít không tạo việc trùng để ép đủ nhịp.
- Tiến độ khớp đúng test_id, không dùng bài Part để hoàn thành việc full. Làm trước/làm bù trong cùng tuần được ghi nhận. Mỗi lượt làm bài hoặc ôn thẻ chỉ phân bổ một lần trong tuần. Ôn câu sai được đánh dấu từ đầu tuần.
- Hợp đồng AI dùng personal-weekly-v2, kiểm tra số việc TEST thay vì cộng targetCount; cho phép lặp sau khi dùng hết kho đề và xử lý nhịp khả thi khi thiếu đề.
- API create/replace từ chối nhịp vượt 3 bài/ngày bằng GOAL_PACE_TOO_HIGH. Form đặt mục tiêu và gợi ý mục tiêu mới có thông báo Việt/Anh. Mục tiêu cũ giữ nguyên.
- Truy vấn chủ đề gộp bằng DISTINCT ON; định dạng lại các policy/service liên quan.

## Script cập nhật lộ trình hiện tại

Trong thư mục backend:

```powershell
npm run personalization:replan-current
npm run personalization:replan-current -- --apply
```

Mặc định chỉ đọc và đếm. Khi apply, khóa theo người học và tái sử dụng replaceUntouched của GĐ7; giữ ngày đã có tiến độ và ngày đã qua, chỉ thay các ngày còn lại. Ghi audit PERSONALIZATION_REPLAN_S1 để lần chạy sau không sửa lại. Nếu đề bị lưu trữ trong lúc chạy thì bỏ qua và cho phép chạy lại. CLI không khởi động HTTP/scheduler và tắt worker AI/chấm bài trong tiến trình của nó, không sửa .env.

## Phiên bản và các đợt sau

S1 đã đổi cấu trúc snapshot nên SNAPSHOT_VERSION tăng từ 1 lên 2 ngay ở đợt này. S2 cần tăng tiếp lên 3 khi thêm hồ sơ năng lực; không tái sử dụng số 2 dù bản kế hoạch ban đầu ghi số 2 tại S2. Không tạo lại báo cáo READY. S1 không có migration.

## Kiểm chứng

- 11 suite cá nhân hóa / 123 test đạt; các ca bổ sung sau đó được kiểm tra lại bằng 2 suite tiến độ và hợp đồng AI / 23 test đạt.
- Backend TypeScript đạt; build frontend đạt (còn cảnh báo kích thước bundle hiện có); Oxlint hai component sửa không có lỗi.
- PostgreSQL S1/GĐ4: kho 30 đề/kỹ năng, Part yếu xuất hiện, thứ tự ổn định, ngưỡng thẻ 0/9/10/19/20/35, ôn câu sai sớm, API chặn nhịp cao, script giữ tiến độ và chạy lại không đổi.
- PostgreSQL GĐ7: báo cáo START/WEEKLY/MIDTERM, bảo toàn ngày đã học, fallback, 429, quyền sở hữu và sửa ứng viên đều đạt.
- Browser desktop/mobile: luồng mục tiêu, nhập mục tiêu cũ, báo cáo, ôn câu sai và chatbot; bổ sung kiểm tra nhịp cao không mở xác nhận và không gửi thay thế mục tiêu.
- Kiểm thử không gọi AI hoặc gửi email thật.

## Nghiệm thu

Theo yêu cầu dừng sau từng đợt trong kế hoạch, bàn giao S1 để kiểm tra trước khi tạo nhánh S2. Khởi động lại backend/frontend để nhận code mới.

Dữ liệu local: dry-run tìm thấy 1 lộ trình; đã apply thành công (eligible=1, updated=1).

Các commit code: dba0ffd (giới hạn nhịp), 6e2f8fe (chọn đề và tiến độ), b0bbbc2 (AI và cập nhật tuần). Chưa push.
Chạy apply lần hai: eligible=0, updated=0; không sửa lại dữ liệu.
