# Groq Writing: phục hồi lỗi tổng hợp 413

Ngày 17/11/2026. Không đổi model, quota/ngày, khoảng cách gửi bình thường 30 giây hoặc các trường kết quả. Giới hạn độ dài nhận xét tổng hợp được giảm; rubric và kiểm định dẫn chứng vẫn giữ nguyên.

- Tổng hợp biểu diễn judgments dưới dạng map criterion → judgment, bỏ tên trường lặp mà giữ đủ giá trị.
- Giữ nguyên toàn bộ câu trả lời, overview từng part, prompt rubric và maxOutputTokens=1200.
- Khi 413 có rule TOKEN_LIMIT_EXCEEDED, lưu synthesisMode=compact vào writingParts checkpoint rồi nhường cho scheduler 30 giây. Không gửi lại ngay và không chấm lại part đã lưu.
- Ngay từ đầu, catalog tổng hợp chỉ giữ tối đa 4 đoạn theo từng câu hỏi, lấy đều từ đầu đến cuối danh mục; nhánh compact giữ tối đa 2 đoạn. Bài làm đầy đủ vẫn có trong payload. Danh mục ít hơn có thể ảnh hưởng lựa chọn dẫn chứng của LLM; không cam kết feedback/CEFR giống tuyệt đối giữa hai lần sinh.
- Toàn bộ đánh giá part và suggestedRevision đã lưu vẫn giữ nguyên. JSON tổng hợp vẫn phải có cefr và summary, qua kiểm định schema/coverage/dẫn chứng như trước.
- Nếu nhánh compact vẫn quá lớn, giữ trạng thái lỗi có kiểm soát; không cắt bài làm, không hạ chuẩn kiểm định, không lặp fallback vô hạn.
- Prompt sửa suggestedRevision: câu được gửi phải nhận chuỗi tiếng Anh không rỗng. Câu bỏ trống đã được loại khỏi request và được backend khôi phục; không yêu cầu LLM trả null trái schema nữa.
- Log request size chỉ ghi số ký tự theo thành phần, không ghi bài làm/key. Đây không phải token count chính xác của Groq.

Không cần migration. Để áp dụng với backend Docker, rebuild backend. Job đã FAILED trước khi cập nhật cần Retry một lần sau khi code mới chạy; checkpoint hợp lệ được tái sử dụng. Không tự thay đổi trạng thái job hoặc kết quả cũ trong đợt sửa code này.

Kiểm thử mô phỏng: 413 sau 4 part → checkpoint compact → chỉ gọi synthesis; giữ nguyên bài làm và kết quả part; lỗi compact lần nữa không lặp; sai dẫn chứng vẫn bị từ chối. Chưa dùng kiểm thử mô phỏng để kết luận độ chính xác CEFR thực tế.

## Bổ sung xử lý 429

429 được chuyển thành GROQ_RATE_WAIT: chờ ít nhất 65 giây, tôn trọng Retry-After dạng giây hoặc HTTP date nếu dài hơn (tối đa 24 giờ). Lưu diagnostic.retryAt trong reference_ai_calls. Khi giữ advisory lock, provider kiểm tra thời điểm cooldown chung trước khi tạo call mới: các job Writing/Speaking dùng provider này không tiếp tục gửi trong thời gian chờ. Worker đã có cơ chế trả lại số lần chạy cho GROQ_RATE_WAIT; vì vậy quota không bị tính thành một lỗi JSON. Không cần migration.

Tổng hợp: overallComment tối đa 400 ký tự, mỗi part comment 220, rationale 400, tối đa 2 priorities và 3 dẫn chứng CEFR. Giảm độ dài feedback, không xóa trường, không đổi kết quả từng câu hoặc đáp án gợi ý đã lưu. Yêu cầu quá dài vẫn có thể vượt quota; không bảo đảm tuyệt đối hết 413/429.

Đối chiếu database 17/11: job ebe53466-9a5b-4237-aa26-a1384ff10ec0 đã COMPLETED với synthesisMode=compact và 4 part; fb483eea-8541-4ac9-9f96-ae6678293bc0 cũng COMPLETED. Không chấm đè kết quả hai job này.
