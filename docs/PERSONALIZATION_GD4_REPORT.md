# Cá nhân hóa — GĐ4: lộ trình RULE và ôn câu sai

Hoàn thành ngày 20/10/2026 trên nhánh `feat/learning-personalization` theo bản kế hoạch sửa đổi. GĐ2 đã commit `5724dac`; GĐ3 đã commit `af5975d`.

## Hành vi đã triển khai

- Ứng viên lấy từ đề PUBLISHED có snapshot, ưu tiên Part yếu/bài chưa làm, giữ đủ năm kỹ năng nếu có nội dung. Tối đa 20 đề, ba mức ôn thẻ và các nhóm câu sai, tổng không quá 30. Không tạo đề giả khi thư viện thiếu nội dung. TOPIC_REVIEW dành cho GĐ10.
- RULE xoay vòng kỹ năng, gộp số bài trong target_count để giữ tối đa ba việc/ngày, thêm 20 lượt ôn thẻ và nhóm từ ba câu sai chưa ôn (tối đa mười câu/việc). Nhóm câu sai không lặp trong tuần. Tuần cuối dừng đúng ngày kết thúc; tuần mới sau khi đủ số bài giữ việc luyện tập hướng tới band đích.
- GET `/me/study-plan/current`; GET `/me/mistakes?itemId=`; POST `/me/study-plan/items/:id/done`. Tất cả kiểm tra STUDENT/chủ sở hữu. Chỉ việc ôn câu sai được đánh dấu thủ công, trong lịch còn hiệu lực. Nguồn đề/đáp án tái sử dụng details() của bài đã nộp; frontend chỉ hiển thị câu được giao.
- Thẻ việc hôm nay và lịch tuần trên Dashboard; trang Ôn câu sai và sidebar desktop/mobile; mở đúng đề EXAM/PRACTICE hoặc flashcard thực tại `/dictation?mode=flashcard`. Hiển thị đáp án, giải thích, nút đã ôn và hỏi AptiMate mang attemptId/questionKey. Hỗ trợ mã câu Listening dạng `p2:s1`, không chỉ `p1:q1`. Nhãn mới có en/vi.
- Cập nhật sau commit của nộp EXAM, tự kết thúc bài quá giờ, hoàn thành PRACTICE, chấm Writing/Speaking và ôn flashcard. Lỗi phụ được ghi log an toàn và không làm hỏng thao tác học đã lưu. Worker khôi phục bằng dữ liệu đã commit.
- Một attempt chỉ hoàn thành một việc TEST trong tuần, từ ngày giao tới cuối tuần; ôn thẻ tính đúng ngày theo múi giờ mục tiêu. Đối chiếu có thể chạy lại; cập nhật item theo lô. Đủ số bài ghi target_reached_at, giữ ACTIVE, chỉ xếp một thông báo chúc mừng; worker thông báo hiện có giao IN_APP và phát socket sau commit. Đồng bộ việc học trước khi mục tiêu hết hạn.
- Worker mỗi 60 giây, tối đa 50 người/lượt, khóa người dùng bằng SKIP LOCKED và xử lý tuần tự; unique goal/week bảo vệ lộ trình. Không gọi AI và không gửi email.

## Kiểm chứng

- Backend typecheck; toàn bộ 71 suite / 455 test đạt, trong đó 24 ca snapshot, 12 ca RULE/phân bổ và kiểm tra lỗi cập nhật sau commit.
- Integration PostgreSQL tên `_test`, schema cô lập: chuỗi migration up/down/up, goal API/concurrency/ownership, snapshot trên 200 bài và kỳ cũ, nộp PRACTICE thật/replay, ôn 20 lượt/replay, details câu sai thật, đánh dấu thủ công, hai worker, tuần cuối lẻ, hết hạn và kết thúc sớm. Kiểm tra cả thông báo một lần qua notification scheduler.
- Frontend: 95 test hiện có, 4 test cá nhân hóa và 3 test chính sách chatbot; browser desktop 1280px/mobile 390px kiểm tra nhập localStorage có lỗi rồi thử lại, phiên khác đọc cùng mục tiêu, lộ trình không tràn ngang, chỉ hiển thị câu được giao, hoàn thành và ngữ cảnh chatbot. Frontend build đạt. Cảnh báo chunk lớn và một số cảnh báo lint cũ vẫn còn ở code có sẵn.

## Chạy và phạm vi kế tiếp

Backend: `npm run test:personalization`; đặt TEST_DATABASE_URL tới DB riêng có hậu tố `_test`, khác DB ứng dụng, rồi `npm run test:personalization:db` để chạy cả bốn integration script. Frontend: `npm run test:personalization` và `npm run test:personalization:ui` (Playwright, Edge headless trên Windows).

Đặt `PERSONALIZATION_WORKER_ENABLED=true` và khởi động lại backend để xử lý tuần mới/hết hạn ngay cả khi người học không mở Dashboard. Không cần migration mới sau nền GĐ1. Cần có đề đã xuất bản để sinh việc TEST; nếu thiếu chỉ sinh các hoạt động có dữ liệu thật.

GĐ2–GĐ4 không còn hạng mục triển khai dang dở. Nhắc hằng ngày (GĐ5), nhận xét/lộ trình AI và báo cáo (GĐ6–GĐ8), ngữ cảnh báo cáo chatbot (GĐ9), chủ đề (GĐ10) và đánh giá AI (GĐ11) nằm ngoài phạm vi đợt này.
