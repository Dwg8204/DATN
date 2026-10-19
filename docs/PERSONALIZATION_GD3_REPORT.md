# Cá nhân hóa — GĐ3: snapshot và tiến độ

`buildLearnerSnapshot` là hàm thuần, tái sử dụng `learningStats`. `SnapshotService` chịu trách nhiệm quyền truy cập và nạp dữ liệu. Số bài dùng toàn bộ metadata trong khoảng mục tiêu; payload điểm giới hạn 200 bài, COMMENT 20 bài. WEEKLY/MIDTERM truy vấn riêng kỳ báo cáo và lũy kế để không mất dữ liệu kỳ cũ khi có hơn 200 bài mới. Chỉ OBJECTIVE/AI được dùng cho điểm; chưa đủ hai bài FULL_SKILL/kỹ năng thì không suy band. Band chung không gồm Writing. Reading dùng lại chính sách CEFR ước lượng hiện có.

Quy ước ngày: elapsedDays tính cả hôm nay; remainingDays cũng gồm hôm nay vì người học vẫn có thể học tới hết ngày. Ngày cuối có remainingDays=1; sau hạn là 0. expected so sánh trước khi làm tròn một chữ số. Mốc tuần tính từ start_date, dùng timezone bất biến của mục tiêu. Hash SHA-256 sắp khóa, bỏ asOf và có snapshotVersion. Câu sai chỉ gồm tham chiếu, tối đa 30, qua API details nội bộ có kiểm tra chủ sở hữu; snapshot không giữ đề/đáp án.

Dashboard có thẻ mục tiêu, completed/expected, nhịp học, trạng thái, band ước lượng và thói quen. Streak Dashboard tổng quát cũng đã dùng múi giờ tài khoản thay múi giờ cố định. Chatbot thống kê sử dụng snapshot, đồng thời giữ nhóm kỹ năng/chế độ/phạm vi. Tách PersonalizationDataModule để các dịch vụ tiến độ GĐ4 có thể dùng mà không tạo vòng phụ thuộc với module bài làm.

Kiểm chứng: 24 ca unit snapshot, các test chatbot/dashboard hiện có, typecheck, lint phần thay đổi và frontend build. Integration `personalization-snapshot.ts` trên PostgreSQL `_test` kiểm tra >200 bài, kỳ tuần cũ, giới hạn COMMENT, band Reading và ownership. Lịch báo cáo/AI được triển khai ở các giai đoạn sau, chưa tạo báo cáo tại GĐ3.
