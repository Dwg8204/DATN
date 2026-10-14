# Rà soát ngôn ngữ giao diện — 14/10/2026

## Tài nguyên

- `frontend/src/i18n/locales/en.json` và `vi.json`: 1.732 khóa mỗi ngôn ngữ, cùng cấu trúc và cùng biến nội suy (gồm 24 khóa `comments` bổ sung khi triển khai bình luận).
- Giữ 504 khóa cũ, bổ sung 1.204 cặp trong nhóm `ui` cho giao diện, hướng dẫn, trạng thái, xác thực, lỗi và kiểm tra dữ liệu của trình soạn đề.
- `i18n/index.js` nạp JSON; module Writing cũ chỉ xuất lại nhóm writingAi để tương thích các caller/test trước đây.

## Những chỗ đã xử lý

- Chữ viết trực tiếp ở layout, component chung, Admin, xác thực, trang danh sách/giới thiệu đề, trang làm bài, kết quả/chi tiết, hồ sơ, kho từ vựng và widget trò chuyện.
- Nhãn có tham số như số câu, Part, kích thước tệp, tên người dùng; thông báo dự phòng và nhãn hỗ trợ truy cập.
- Loading/progress, SaveIndicator, toast và thông báo lỗi API được dịch theo ngôn ngữ hiện tại.
- Các formatter ngày giờ/số trong Admin và một số danh sách/hội thoại dùng locale hiện tại, thay vì cố định Anh/Việt.
- Đồng bộ cách gọi ở tiếng Việt: Phần, Nghe, Đọc, Viết, Nói, Thẻ ghi nhớ, Trắc nghiệm.

## Cách tích hợp

- Ưu tiên `useTranslation()` và `t('namespace.key')` cho code mới; thêm cùng khóa ở cả JSON Anh/Việt.
- `useUiTranslation()` dùng cho các chuỗi đã tồn tại và nhãn lấy từ cấu hình cũ. Hook đăng ký cập nhật ngôn ngữ, còn callback giữ identity ổn định và đọc ngôn ngữ hiện tại khi chạy; không remount ứng dụng hoặc reset câu trả lời.
- `uiLookup` ánh xạ nhãn nguồn Anh/Việt sang khóa, hỗ trợ nội suy và nhãn đã ghép tham số. Pattern cụ thể được ưu tiên trước pattern chung để tránh dịch sót từ trong nhãn.
- Với lời gọi `ui('English source text')`, giữ giá trị nguồn Anh tương ứng trong JSON; nếu sửa cách diễn đạt tiếng Anh thì cập nhật cả caller. Với khóa `t(...)`, có thể sửa cách diễn đạt trong JSON độc lập với caller.
- `AnswerSelect` mặc định **không dịch lựa chọn đáp án**. Bật `translateLabels` cho bộ lọc/metadata giao diện; không bật cho lựa chọn từ/câu trong bài tiếng Anh.

## Nội dung giữ nguyên

- Câu hỏi, đoạn đọc, đáp án, transcript, bản sửa tiếng Anh và bài làm là dữ liệu học tập, không dịch bằng từ điển UI.
- Nội dung do người dùng/giáo viên nhập, dữ liệu từ CMS/API và phản hồi trò chuyện không trở thành khóa dịch tự động. Backend cần cung cấp nội dung theo locale nếu muốn bản địa hóa loại dữ liệu này.
- Feedback chấm Writing/Speaking mới vẫn bằng tiếng Việt theo chính sách prompt đã triển khai ở task trước; việc đổi ngôn ngữ giao diện không tự chấm lại hoặc dịch kết quả AI đã lưu.
- Tên thương hiệu, mã CEFR, email, ký hiệu kỹ thuật và tên ngôn ngữ trên bộ chọn ngôn ngữ có thể giữ nguyên. Tiêu đề “AI feedback” giữ theo yêu cầu trước đó của người dùng.

## Kiểm tra

- 90 test frontend chính, gồm kiểm tra JSON có cùng khóa, nội suy, nhãn động và mọi literal truyền vào bộ dịch đều có khóa tương ứng.
- 94 test Reading/Practice hồi quy.
- 3 browser test: đổi Anh ↔ Việt, giữ bài đang nhập/lựa chọn tiếng Anh; giao diện Writing/Speaking tổng quát/chi tiết, feedback accordion và tiến độ trên desktop/mobile.
- Build frontend thành công; cảnh báo chunk lớn hiện có của Vite vẫn còn.
- Đã commit theo từng task; chưa push. Không chạy dịch vụ dịch bên ngoài trong lượt triển khai này.
