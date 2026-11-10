# R0 — Chuẩn bị học liệu và dữ liệu đánh giá

Ngày: 10/11/2026. Nhánh chung: `feature/personalization-rag`, bắt đầu từ `origin/develop` tại `52edbd2`.

## Trạng thái

Hoàn thành phần chuẩn bị bản nháp R0. Người dùng đã đồng ý commit bản nháp chờ duyệt. Chưa nghiệm thu chất lượng nội dung; không tuyên bố 45 bài đã được con người duyệt hoặc bộ nhãn là ground truth. Không chạy import, embedding, migration, gọi AI bên ngoài hoặc sửa dữ liệu người học.

## Nội dung

- Corpus có 79 tài liệu: giữ 6 tổng quan Aptis; 45 LESSON (mỗi mã chủ đề đúng một bài), 18 PART_STRATEGY (Grammar 2 Part, các kỹ năng còn lại 4 Part), 10 CRITERION_GUIDE.
- Giữ key và các section cũ của 8 bài AptiMate biên soạn, bổ sung section và metadata. 45 bài có 300–600 đơn vị từ phân cách khoảng trắng; mỗi bài có quy tắc, ví dụ đúng/sai, lưu ý người học Việt Nam và cách luyện.
- Nội dung mới có `reviewStatus=DRAFT`, `reviewedBy=null`, `reviewedAt=null`. `verifiedAt` của bản mới là ngày biên soạn, không phải bằng chứng đã duyệt. Hướng dẫn Part và tiêu chí là gợi ý luyện tập, không phải rubric chính thức.
- Các bài mới dùng `variant=ENGLISH`. Giữ nguyên nguồn và nội dung tài liệu Aptis hiện hữu; không xác minh lại quy định kỳ thi trong R0.
- Script import hiện hữu **chưa chặn DRAFT**. Không chạy `knowledge:import` cho corpus này trước khi duyệt. R1 cần thêm kiểm tra trạng thái và metadata trước khi import.

## Khảo sát DB local (chỉ đọc)

Đã chạy `SELECT DISTINCT question_type FROM questions` và đọc `topic_question_catalog` với điều kiện PUBLISHED, chưa archive. Có 45 chủ đề và 1.987 câu trong ba kỹ năng khách quan. Không đọc bảng bài làm người học.

18 loại câu: GRAMMAR_MULTIPLE_CHOICE, VOCABULARY_MATCHING, READING_GAP_CHOICE, READING_ORDER, READING_OPINION_MATCH, READING_HEADING_MATCH, MCQ_LISTENING_P1, MATCHING_LISTENING_P2, OPINION_LISTENING_P3, MCQ_LISTENING_P4, WRITING_SHORT_RESPONSE, WRITING_SHORT_TEXT, WRITING_CHAT_RESPONSE, WRITING_EMAIL, OPEN_SPEAKING_P1, OPEN_SPEAKING_P2, OPEN_SPEAKING_P3, OPEN_SPEAKING_P4.

450 câu Listening: không tìm thấy trường transcript/transcription/script trong content hoặc part_contents. Một số explanation có lời thoại ngắn, một số chỉ giải thích hoặc trống: không được coi toàn bộ explanation là transcript. Có câu ghi rõ đáp án dùng kiểm tra luồng, chưa đối chiếu âm thanh; loại các câu đó khỏi fixture.

R1 phải ghép cả ngữ cảnh Part: Reading gap có thể chỉ lưu options trong câu, ordering cần chuỗi câu, heading cần tiêu đề, opinion cần lời người nói; Vocabulary matching cần đúng nhóm phương án. Listening matching chỉ có speakerLabel không đủ cho semantic search. Không embed riêng nhãn người nói như nội dung có nghĩa.

## Bộ nhãn đề xuất

`backend/test/fixtures/rag-gold.json`: 60 câu, mỗi kỹ năng 20, giữ questionId/testId/hash/key và đáp án sai giả lập. Mỗi câu có documentKey và 3–5 ID ứng viên thuộc đề khác. `rag-r0-review-questions.json` chứa 96 câu nguồn/ứng viên cùng ngữ cảnh để duyệt offline, đã bỏ URL media. ID phụ thuộc database khảo sát, không tự coi là tồn tại ở môi trường khác.

Cách đề xuất: ghép dạng câu với chiến lược và nhận diện kiến thức từ explanation cho Grammar; chọn ứng viên cùng kỹ năng/dạng/nhóm kiến thức, tuyệt đối không dùng dữ liệu người học. Đây là **tiền gán nhãn**, chưa chứng minh tương tự ngữ nghĩa. Mọi nhãn DRAFT; file có trạng thái DRAFT_NOT_FOR_FINAL_METRICS. Người duyệt phải loại cặp chỉ cùng dạng nhưng khác kiến thức. Không dùng fixture này để công bố Recall/MRR hoặc chọn ngưỡng trước khi duyệt.

Kho đề có các bản gần trùng; `question_hash` và `duplicateGroup` hỗ trợ kiểm tra nhưng không thay thế phân nhóm theo nội dung. Trước R7 phải tách tập hiệu chỉnh và đánh giá theo họ đề/nội dung gần trùng, không chia ngẫu nhiên theo ID. Listening cần người duyệt nghe nguồn gốc; bản xuất offline không chứng minh đáp án âm thanh đúng.

## Kiểm tra

- `node backend/scripts/rag-r0-validate.cjs`: kiểm tra độ phủ, số từ, metadata, 60 câu độc lập, ID nguồn/đích, đáp án khác nhau và đề đích khác nguồn.
- `npm run knowledge:validate` trong backend: validator cũ kiểm tra cấu trúc; chưa kiểm tra đầy đủ metadata mới hoặc duyệt nội dung.
- Không sửa code chạy; không cần build frontend hoặc chạy toàn bộ test nghiệp vụ cho thay đổi dữ liệu nháp.

Kết quả: validator R0 PASS; `npm --prefix backend run knowledge:validate` PASS (79 tài liệu, 250 section); `git diff --check` PASS. Lần đầu validator cũ phát hiện dấu gạch dưới trong key tài liệu mới, đã đổi sang dấu gạch ngang và thêm kiểm tra hồi quy vào validator R0. Thử validator trong container hiện hữu không chạy được vì image không chứa scripts/chatbot-knowledge.ts; kiểm tra thành công bằng dependencies local, không sửa container.

## Bàn giao và nghiệm thu còn lại

1. Duyệt từng bài và ghi người/ngày duyệt; sửa hướng dẫn Part cho đủ đặc thù đề nếu cần.
2. Duyệt 60 documentKey và từng cặp câu tương tự, đặc biệt Listening và câu gần trùng; đối chiếu đáp án thực tế.
3. R1 bổ sung validator/import cho metadata, trạng thái duyệt và schema Part; chưa có cột part trong đề xuất migration nên cần thống nhất lưu metadata hoặc cột riêng.
4. Dùng một nhánh cho mọi giai đoạn theo yêu cầu mới, thay quy trình mỗi đợt một nhánh trong kế hoạch gốc. R0 không triển khai R1.

`rag-r0-prepare.cjs` là công cụ biên soạn offline, cần bản xuất catalog local gồm topics và questions; không commit bản xuất đầy đủ. `r0-lesson-notes.json` chứa phần nội dung chuyên biệt. Không chạy lại công cụ biên soạn sau khi duyệt vì sẽ đặt lại trạng thái DRAFT; chỉnh trực tiếp corpus khi biên tập.
