# Speaking Full Test: completion, /50 và CEFR

## Nguyên tắc

- Model production vẫn là `gemini-3.1-flash-lite`, chấm toàn bài với audio thật, ảnh và transcript như trước. Không chuyển sang chấm từng Part.
- Prompt mới: `speaking-rubric-v6-completion`. Các snapshot/bài làm và kết quả cũ không bị sửa. Cache dùng phiên bản prompt cũ không được ép dùng lại cho job đang chấm bằng phiên bản mới.
- Mode do backend cung cấp là nguồn xác định phạm vi. Full test vẫn là full test khi bỏ câu hoặc bỏ Part; không trở thành bài luyện một Part.
- Điểm /50 giữ công thức hiện tại: trung bình bốn tiêu chí trên toàn bộ câu theo đề; câu không làm hoặc không thể đánh giá bằng 0. Ví dụ 10 câu đều đạt 80% cho 40/50; chỉ làm 9 câu cùng chất lượng cho 36/50. Không trừ hai lần vào các câu đã trả lời.
- CEFR là ước lượng thực hành dựa trên bốn tiêu chí có bằng chứng audio và mức độ hoàn thành. Bỏ câu làm giảm thành tích tổng thể và bằng chứng để nhận mức cao, phải được giải thích trong nhận xét. Không gán CEFR theo bảng ngưỡng /50, không tự động tụt một bậc chỉ vì bỏ một câu.
- Full test có ít nhất một phản hồi ASSESSED phải nhận ước lượng CEFR thận trọng từ phần có thể đánh giá, kèm hạn chế; không trả null chỉ vì làm thiếu. Bằng chứng rất ít không được dùng để khẳng định năng lực cao/chứng chỉ.
- Không có audio hoặc toàn bộ lời nói không đánh giá được: /50 vẫn có kết quả, CEFR có thể null. Practice theo Part vẫn không có CEFR toàn kỹ năng.

## Tính nhất quán và phục hồi

Provider gửi assessmentScope, responseKeys, recordedQuestions, totalQuestions, skippedKeys và phạm vi từng Part rõ ràng. Schema giới hạn response key theo danh sách đã có audio; không cho thêm câu skipped vào responses.

Nếu full test có lời nói ASSESSED mà CEFR null, lý do rỗng hoặc nhận nhầm là một Part, backend cache nguyên kết quả chấm từng câu trước và gọi Gemini sửa riêng quyết định CEFR. Yêu cầu sửa nhận các nhận xét/điểm đã đánh giá từ audio, cùng độ phủ câu hỏi và điểm /50 đã tính gồm các câu 0. Không đánh giá lại phát âm/độ trôi chảy từ transcript hay thay đổi điểm từng câu. Không bịa CEFR từ /50.

Lượt sửa có countTokens, dự trù/ghi nhận ngân sách như lượt chấm hiện có, giới hạn output 3000 token. Nếu dùng Paid tier thì lượt bổ sung có thể mất phí; giới hạn ngân sách vẫn được kiểm tra trước khi gọi. Free tier giữ nguyên xác nhận/cấu hình hiện có. Không âm thầm bỏ kiểm tra ngân sách.

Nếu sửa CEFR vẫn sai: `SPEAKING_CEFR_INCONSISTENT`; worker retry theo giới hạn Speaking hiện hành (tối đa 3 lần chạy), giữ cache chấm câu để lần sau chỉ sửa CEFR. 503/429 vẫn dùng backoff và Retry-After hiện có. Nếu dịch vụ lỗi kéo dài, job vẫn có thể FAILED do lỗi dịch vụ/đầu ra; không được tự chế một CEFR để hoàn tất.

Review/History không tự gọi AI. Những bài đã COMPLETED bằng prompt cũ không tự chấm lại hay sửa điểm. Không có migration mới, không đổi `.env`; restart backend để áp dụng cho lượt chấm mới.

## Kiểm thử

Test mô phỏng xác nhận: bỏ một trong 10 câu vẫn giữ CEFR hợp lệ và giảm /50; sửa lý do Part-only cho full test; không sửa CEFR cho Part practice hoặc không có lời nói; cache điểm câu qua lỗi 503 ở bước sửa; không chấp nhận kết quả sửa tiếp tục null; giới hạn responseKey không gồm câu bỏ trống. Không gửi bài thật lên Gemini trong lượt triển khai này.
