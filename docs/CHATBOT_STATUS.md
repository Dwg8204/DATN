# Trạng thái chatbot AptiMate

Cập nhật 16/10/2026. Đây là tài liệu trạng thái triển khai; bản `CHATBOT_OVERVIEW_PLAN.md` là kế hoạch lịch sử, không phải trạng thái hiện tại.

## Đã triển khai

- Chat văn bản cho người đăng nhập, nhiều phiên độc lập; lịch sử lưu PostgreSQL, có phân trang, đổi tên và xóa mềm.
- Backend xác minh chủ sở hữu phiên và bài đã nộp. Chống gửi trùng bằng client message ID; chỉ một phản hồi PENDING mỗi phiên; retry tạo lượt trả lời mới, phản hồi muộn không ghi đè.
- Gemini chat riêng qua `CHATBOT_MODEL`, dùng API key hiện có. Local đã bật `CHATBOT_ENABLED=true`, model `gemini-3.5-flash-lite`; không thay cấu hình chấm Writing/Speaking.
- FAQ AptiMate trong prompt cố định; kiến thức tiếng Anh qua model; Aptis qua RAG với nguồn tham khảo. Hội thoại dùng khoảng 10 lượt gần nhất, chưa tóm tắt hoặc streaming.
- RAG local: 14 tài liệu/14 chunk (6 mục Aptis có nguồn British Council, 8 mục tiếng Anh tự biên soạn). Embedding `gemini-embedding-001`, chuẩn hóa 768 chiều; tìm cosine chính xác + full-text, hợp nhất RRF. Nguồn gốc: `backend/resources/chatbot-knowledge/corpus.json`; lưu trong `knowledge_documents` và `knowledge_chunks`.
- Có các tool tìm kiến thức, tra từ, đọc bài đã nộp của chính người dùng, thống kê tối đa 20 bài gần nhất. Thống kê tính bằng code; loại điểm mô phỏng khỏi bằng chứng năng lực. Dữ liệu cá nhân không nạp vào RAG chung.
- Output JSON có schema, backend kiểm tra citation và action; giữ nguyên thoughtSignature/call ID của Gemini. Tối đa hai vòng tool, tối đa ba lần gọi model/lượt.
- Feedback hữu ích/không hữu ích, sao chép, retry và nút điều hướng theo danh sách cho phép. Notebook phải mở `/dictation?mode=notebook` (cùng đường dẫn menu hiện tại), không dùng `/vocab`.
- Chatbot ẩn ở màn làm bài. Chờ phản hồi hiển thị bong bóng avatar + ba chấm typing; có nhãn cho screen reader, tắt chuyển động khi người dùng chọn reduced motion. Trạng thái typing gắn với phiên đang gửi/retry, không dùng chung với feedback/đổi tên/xóa.
- Nút mở chat là robot SVG đỏ–kem (`AssistantPet`): chớp mắt, nhún nhẹ, vẫy tay định kỳ và khi hover/focus. Tooltip hiển thị tên trợ lý; click hoặc Enter mở chat, nút X đóng. Mobile thu nhỏ linh vật, giữ vùng bấm đủ lớn; reduced motion tắt animation. Không dùng dịch vụ tạo pet bên ngoài hoặc thư viện animation mới.
- Giới hạn ứng dụng: 5 lượt trong 60 giây gần nhất, 50 lượt trong 24 giờ gần nhất/tài khoản, cộng mọi phiên kể cả đã xóa; lượt bắt đầu rồi thất bại và retry cũng tính. Đây không phải quota của Google. Quota provider riêng; một lượt chat có thể gọi model nhiều lần.

## Bằng chứng và nghiệm thu

- Mốc trước: 20 test backend, 4 test frontend, DB integration và 5 lượt Gemini thật đạt; backend build và dependency graph đạt. Xem `CHATBOT_STAGE_2_REPORT.md` để biết phạm vi và lệnh chạy.
- Người dùng đã thử trên ứng dụng và phản hồi các chức năng đã triển khai “tạm ổn”; phát hiện riêng nút Notebook sai đường dẫn và chữ chờ phản hồi thô. Hai lỗi này được sửa trong đợt hiện tại, chờ người dùng test lại.
- Kiểm tra đợt sửa UI: `npm run test:chatbot` frontend đạt 4 test, browser test bổ sung click Notebook và xác nhận route thực trong router, ba chấm khi API đang chờ, hết chờ thì biến mất, reduced motion tắt animation. `npm run build` frontend đạt; còn cảnh báo bundle lớn hơn 500 kB của Vite.
- Không diễn giải phản hồi “tạm ổn” thành nghiệm thu toàn bộ quyền truy cập, chất lượng RAG hay cá nhân hóa trên mọi kỹ năng. Hình người dùng gửi cho thấy hội thoại tra nghĩa từ hoạt động, nhưng chưa thay thế một bộ kiểm thử dictionary đầy đủ.

## Còn lại và phụ thuộc

1. Người dùng test lại hai sửa đổi giao diện; sửa lỗi phát sinh trước khi mở giai đoạn mới.
2. Cá nhân hóa: nghiệm thu bài thật từng kỹ năng, Exam/Practice, bài đang chấm và chấm lại. Writing có thể dùng kết quả chấm đã có; Speaking cần kết quả thực, không dùng điểm mô phỏng. Phân tích xu hướng cần đủ bài; phân tích chủ đề lỗi chi tiết cần dữ liệu gắn nhãn chủ đề.
3. Dictionary: kiểm tra nhiều nghĩa/ngữ cảnh và lỗi dịch vụ thật.
4. Nội dung RAG: duyệt 8 mục tự biên soạn, mở rộng tài liệu, đánh giá nguồn/phiên bản và Recall@k. Chưa có bộ khoảng 50 ca nghiệm thu tổng thể, tải nhiều người dùng hoặc đánh giá dài hạn.
5. Streaming/tóm tắt hội thoại dài/hiển thị lượt còn lại là tùy chọn sau, chưa triển khai. Chưa upload ảnh/PDF/audio hoặc tự ghi dữ liệu bằng chat.

## Quy tắc tiếp tục

Làm từng giai đoạn. Hoàn thành phải dừng báo cáo, chờ người dùng test và xác nhận mới làm tiếp. Không tự đổi model chấm điểm, mở rộng corpus hoặc triển khai giai đoạn mới trong một lượt sửa UI. Theo yêu cầu mới nhất, đã đồng bộ develop và chia commit local theo task; chưa push.
