# Chatbot — gửi/nhận Gemini local

Ngày bàn giao: 16/10/2026. Trạng thái: **chờ người dùng test; không tự chuyển giai đoạn**.

## Phạm vi và kết quả

- Xác nhận luồng Gemini đã viết ở lượt trước, đặc biệt phản hồi sau khi gọi RAG và hội thoại nối tiếp. Không mở rộng corpus hoặc thay cấu hình chấm Writing/Speaking.
- Provider yêu cầu JSON theo schema `text`, `citationIds`, `actions`, kể cả khi dùng function calling. Lỗi định dạng sau RAG trước đây không tái hiện trong hai lần kiểm thử live của giai đoạn này.
- Backend vẫn xác minh citation thuộc kết quả truy xuất và action thuộc danh sách cho phép. Kiểm thử xác nhận giữ nguyên `thoughtSignature` và call ID khi trả kết quả tool.
- Bổ sung test quota, safety, phản hồi bị cắt và timeout; không tự gọi lại provider.
- `.env` local hiện có `CHATBOT_ENABLED=true`, `CHATBOT_MODEL=gemini-3.5-flash-lite`. Các biến khác được kiểm tra giữ nguyên. `.env.example` vẫn tắt mặc định.
- Chat dùng API key hiện có; model chấm Writing vẫn cấu hình riêng. Không cam kết mọi giới hạn tài nguyên đều độc lập giữa hai model.
- Truy vấn lại database local xác nhận **14 tài liệu READY / 14 chunk**. Không nạp thêm dữ liệu trong giai đoạn này.

## Bằng chứng kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| Backend `npm run test:chatbot` | 20 test, 2 suites đạt |
| Backend `npm run test:chatbot:db -- --live` | Migration, ownership, gửi trùng đồng thời, stale/retry, phản hồi muộn, feedback, FK cùng phiên, xóa và phân trang đạt |
| 5 lượt Gemini thật | FAQ; Aptis Writing có nguồn; thống kê tài khoản trống; since/for; câu hỏi nối tiếp đều COMPLETED |
| Citation | Kiểm tra đúng URL British Council Writing, không chỉ kiểm tra có citation |
| Usage lần live cuối | 10 generateContent calls, 23.323 input tokens, 704 output tokens theo metadata; chưa tính embedding |
| Frontend `npm run test:chatbot` | 4 test đạt; browser fixture kiểm tra nhiều phiên, đổi tên, feedback, retry, ẩn khi làm bài/đăng xuất và chiều rộng mobile |
| Backend `npm run build` | Đạt |
| Nest TestingModule + AppModule đã build | Compile dependency graph và resolve ChatbotService/FAQ thành công; không khởi chạy workers qua app.init |

Live test dùng tài khoản giả trong database `_test`, chỉ đọc tài liệu công khai từ RAG local; không gửi bài làm thật. Schema test được dọn sau khi chạy. Nest compile chạy trước khi bật `.env`, vì vậy log bước đó ghi `enabled:false`; bước kiểm tra cấu hình sau khi bật xác nhận `true`.

## Cách chạy và test thủ công

1. Bảo đảm PostgreSQL local đang chạy.
2. Trong `backend`, chạy `npm run start:dev`. Nếu backend đang chạy từ trước, khởi động lại để nạp `.env` mới.
3. Trong `frontend`, chạy `npm run dev`, mở địa chỉ Vite hiển thị và đăng nhập.
4. Mở chatbot ở trang chủ hoặc trang luyện tập ngoài màn làm bài.

| Thao tác | Kết quả mong đợi |
|---|---|
| “Trong AptiMate tôi tạo flashcard ở đâu?” | Trả lời về chức năng, không hiển thị JSON thô |
| “Aptis ESOL General Writing part 4 viết bao nhiêu từ? Dẫn nguồn giúp tôi.” | 40–50 từ và 120–150 từ, có nguồn British Council Writing |
| “Giải thích since và for”, sau đó “Cho thêm hai ví dụ với hai từ vừa nói” trong cùng phiên | Hiểu ngữ cảnh, ví dụ vẫn dùng since/for |
| Chuyển phiên; tải lại trang rồi mở lịch sử | Đọc lại đúng các tin đã lưu trên server |
| Đổi tên, feedback và xóa một phiên thử | Thao tác lưu được, phiên xóa không còn trong danh sách |
| Vào màn làm bài rồi quay lại trang kết quả | Ẩn chatbot khi làm bài, hiển thị ở trang kết quả được hỗ trợ |
| Tài khoản chưa có bài: “Dựa trên kết quả của tôi, tôi nên ôn gì?” | Nói chưa có dữ liệu, không bịa điểm hoặc điểm yếu |

Giới hạn: 5 lượt mới/thử lại mỗi phút, 50 lượt mỗi 24 giờ/tài khoản, ngoài quota của provider. Deadline xử lý 75 giây; PENDING quá 90 giây chuyển FAILED khi đọc lại. Khi gặp giới hạn, đợi rồi thử lại. Chưa khởi động server nền thường trực cho người dùng.

## Giới hạn nghiệm thu

- Chưa kiểm thử đầy đủ hội thoại đọc bài làm thật của từng kỹ năng và bài được chấm lại; dành cho giai đoạn cá nhân hóa sau khi người dùng xác nhận.
- Chưa test dictionary provider thật trong hội thoại.
- 8 mục tiếng Anh tự biên soạn chưa được người dùng/giáo viên duyệt; kho 14 tài liệu chỉ là bộ khởi đầu.
- Chưa hoàn thành bộ khoảng 50 ca đánh giá, Recall@k, kiểm thử tải hoặc độ ổn định dài hạn.
- Chưa test toàn luồng trình duyệt thật → đăng nhập → backend thật → Gemini. Browser test dùng API fixture; live test dùng service + database + Gemini thật.

Không commit/push. Dừng bàn giao tại mốc này.
