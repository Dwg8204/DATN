# Sửa tốc độ và phục hồi Dashboard — 26/10/2026

## Bằng chứng

Đo chỉ đọc trên database local với một mục tiêu ACTIVE: readAbilityProfile khoảng 35 ms; readWeakTopics vượt statement_timeout 15 giây. Sau materialize catalog dùng chung trong một truy vấn, readWeakTopics trả cùng phạm vi với 9 chủ đề trong khoảng 281 ms. Đây là phép đo local đơn lẻ, không phải benchmark tải đồng thời hay khẳng định mã HTTP của ảnh chụp.

## Sửa

- Overview tái sử dụng một hồ sơ năng lực thay vì đọc hai lần. Snapshot dành cho overview bỏ đọc kết quả chấm chi tiết, duyệt từng Part để tìm câu sai và phân tích chủ đề yếu; response progress chỉ chứa goal/band/habit mà Dashboard cần. Snapshot đầy đủ cho báo cáo và lập kế hoạch giữ nguyên.
- Plan hiện tại không tính coverage nếu không có TOPIC_REVIEW. Khi cần, catalog được tính một lần trong CTE MATERIALIZED, dùng lại cho coverage và nhãn. readWeakTopics áp dụng tương tự, giữ kiểm tra nhãn APPROVED, fingerprint, phiên bản chấm, 80% phủ và ngưỡng yếu.
- Dashboard hiển thị overview ngay trước POST sync. Đồng bộ lỗi không xóa dữ liệu đã tải. Có thông báo dữ liệu có thể cũ và nút thử lại; lỗi tải tự thử lại tối đa ba lần sau 5/10/20 giây, hủy lịch khi rời trang. Giữ polling nhận xét 15/30/60 giây và cơ chế chống request trùng của StrictMode.
- Không tăng timeout để che truy vấn chậm; không migration, không sửa dữ liệu người dùng. Bản sửa Grammar chưa commit trước đó vẫn giữ nguyên.

## Kiểm chứng

TypeScript; lint phần sửa; browser: một overview, hiển thị trước sync bị giữ chờ, lỗi đọc tự hồi phục, lỗi sync giữ nội dung, thử lại thủ công, polling và mobile. PostgreSQL S4 kiểm tra GET chỉ đọc, concurrent sync, tuần đã chốt và yêu cầu overview không truy cập chi tiết câu sai. Hồi quy GĐ10 kiểm tra độ phủ và chủ đề yếu; fixture cập nhật trường vocab/band theo hợp đồng S1/S3. Build frontend.

Cần backend nhận code mới (restart nếu không chạy watch) và tải lại frontend. Các mốc thời gian thực tế còn phụ thuộc máy, database và tải worker. Chưa commit/push.
