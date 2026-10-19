# Cá nhân hóa — GĐ2: mục tiêu và cài đặt trên server

Đã triển khai các API STUDENT dưới `/me`: đọc/tạo/thay/hủy/kết thúc sớm mục tiêu, lịch sử phân trang, đọc/lưu cài đặt nhắc và email báo cáo. Khóa hàng người dùng trong giao dịch bảo đảm một mục tiêu ACTIVE; yêu cầu thay/hủy/kết thúc mang goalId để phát hiện phiên cũ. Mục tiêu giữ múi giờ tại thời điểm tạo, ngày cuối được tính trọn ngày. Đủ bài vẫn ACTIVE và chỉ được kết thúc sớm sau khi đủ bài. Hết hạn chuyển COMPLETED/EXPIRED; tạo nội dung FINAL thuộc GĐ8.

Profile lưu mục tiêu qua API; thay mục tiêu có xác nhận tiến độ tính lại từ hôm nay. Chỉ đề nghị nhập mục tiêu localStorage hợp lệ khi tài khoản chưa có mục tiêu. Chỉ xóa localStorage sau khi người dùng xác nhận và server tạo thành công. Đã bỏ phần tiến độ lấy từ lịch sử localStorage ở Profile/Sidebar và hai helper tính mục tiêu cũ. Các nhãn mới có tiếng Việt và tiếng Anh.

Kiểm chứng: backend typecheck; module unit test; `test/integration/personalization-goals.ts` chạy trên PostgreSQL `_test` với schema cô lập (HTTP validation 2/181 ngày, giới hạn số bài, CEFR, ownership, role, phiên đọc độc lập, replace đồng thời, preferences, hết hạn chính xác); legacy import unit test; frontend build. Frontend lint còn cảnh báo sẵn có ở các module khác. Không gọi AI hoặc gửi email; phần nhắc tự động thuộc GĐ5.

Chạy integration: cung cấp `TEST_DATABASE_URL` tới DB tên kết thúc `_test`, khác DB ứng dụng, rồi `npx ts-node test/integration/personalization-goals.ts` trong backend. Script chạy toàn bộ migration trong schema riêng và dọn schema sau khi kết thúc.
