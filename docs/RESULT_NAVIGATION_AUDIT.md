# Rà soát điều hướng kết quả — 14/10/2026

## Phạm vi và cách xử lý

| Phần | Kết quả tổng quát | Kết quả chi tiết |
| --- | --- | --- |
| Grammar | /grammar-vocab/result | /grammar-vocab/result-detail, Part 1 |
| Vocabulary | /grammar-vocab/result | /grammar-vocab/result-detail, Part 2 |
| Reading | /reading/result | /reading/detail-result |
| Listening | /listening/result | /listening/detail-result |
| Writing | /writing/result | /writing/result-detail |
| Speaking | /speaking/result | /speaking/detail-result |

- Grammar và Vocabulary dùng chung trang kết quả; bộ chọn Part xác định nội dung đang xem.
- Cũng rà soát Reading legacy `/reading/result/:sessionId`, `/reading/review/:sessionId` và component SpeakingResultPage cũ. Các trang này dùng nút Back chung.
- Kho từ vựng `/vocab` và `/dictation` dùng MainLayout; quiz/matching/feedback được hiển thị trong trang học, không có route kết quả/chi tiết riêng hoặc xác nhận thoát bài thi ở đó.
- Tổng quát dùng MainLayout nên không có xác nhận thoát bài. Chi tiết dùng TestLayout với showTimer/showExit/confirmExit=false.

## Thay đổi

- Nguyên nhân modal sai: logo trong TestHeader luôn mở modal dù showExit=false. Thêm confirmExit, mặc định theo showExit; các route xem chi tiết đặt false tường minh. Khi bấm logo trên trang xem kết quả, đi thẳng về trang chủ; giữ xác nhận cho trang đang làm bài.
- Tách ResultBackButton thành component và CSS dùng chung trong components/common, lấy mẫu nút đỏ bo tròn và mũi tên trái của Writing. Dùng nhãn common.back dịch Anh/Việt.
- Chi tiết quay về summary cùng attemptId và cờ practice. Summary quay về danh sách Tests/Practice của cùng kỹ năng. Legacy Reading quay về summary theo sessionId.
- Trạng thái lỗi cũng dùng ResultBackButton và đường dẫn danh sách đúng kỹ năng/Exam/Practice.
- Nút xem chi tiết, làm bài khác và điều hướng câu/Part trong footer là hành động riêng, không phải nút Back.

## Kiểm tra

- TestHeader: logo trên các route chi tiết không mở modal; logo và Exit khi đang làm bài vẫn yêu cầu xác nhận.
- Kiểm thử Reading xác minh đường dẫn Back của Exam/Practice bằng component chung.
- Browser Writing/Speaking đã qua trên desktop/mobile với các thay đổi Back.
- Build frontend thành công; cảnh báo kích thước chunk hiện có vẫn còn.
- Đã commit theo từng task; chưa push.
