# RAG R2 — Giải thích câu sai có nguồn

Ngày kiểm chứng: 11/11/2026. Nhánh chung: `feature/personalization-rag`.

## Chức năng đã triển khai

- API STUDENT `GET /api/v1/me/mistakes/:attemptId/questions/:questionKey/explanation?locale=vi|en`. Kiểm tra chủ bài, trạng thái SUBMITTED, loại OBJECTIVE, câu INCORRECT/SKIPPED; dùng snapshot qua MistakeSourceService và kiểm tra lại assessment revision trước khi trả kết quả.
- Truy xuất tối đa 3 LESSON ở ngưỡng 0.7, ưu tiên topic đã duyệt. Reading Part 2 bổ sung mô tả nhiệm vụ sắp xếp câu vào truy vấn, giữ nguyên ngưỡng. Không tìm được bài học thì ghi retrieval gap và trả giải thích nguồn/gợi ý dự phòng, không gọi sinh nội dung.
- PERSONAL_EXPLAIN trả JSON có giải thích, quy tắc, mẹo và trích dẫn. Schema ràng buộc locale, đáp án đúng và danh sách chunk; validator kiểm tra độ dài, trường dữ liệu, citation, HTML/URL và một số mâu thuẫn đáp án. Có tối đa một lần thử lại khi nội dung không hợp lệ. Không suy diễn nội dung âm thanh thiếu transcript.
- Cache theo người học/bài làm/revision/câu/ngôn ngữ/prompt version. Nguồn được kiểm tra lại quyền LEARNER, trạng thái READY và phiên bản khi đọc cache. FALLBACK có TTL 15 phút; lỗi provider và hết hạn mức không bị cache.
- Hạn mức mặc định 50 lần sinh/người/ngày UTC, bao gồm lần thử lại. Bảng usage dùng cập nhật nguyên tử để áp dụng qua nhiều process; cache vẫn đọc được sau khi hết lượt. Gộp yêu cầu trùng trong cùng process; nhiều replica vẫn có thể sinh trùng nhưng không vượt hạn mức. Không giữ transaction DB trong lúc gọi mạng.
- Nút **Vì sao sai?** trong hoạt động ôn lỗi của kế hoạch học tập chỉ tải khi mở; có loader, lỗi và thử lại, fallback, giao diện Việt/Anh, tên nguồn và trích đoạn. Liên kết nguồn chỉ HTTPS, mở tab mới với noopener/noreferrer. Tắt flag thì ẩn nút và giữ luồng ôn lỗi cũ.
- Deadline toàn yêu cầu 60 giây; timeout model theo cấu hình PERSONALIZATION_AI_TIMEOUT_MS, frontend chờ tối đa 70 giây.

## Database và vận hành local

Migration `1760000025000-AddMistakeExplanations` tạo `mistake_explanations`, `retrieval_gaps` và `mistake_explanation_usage`. Bảng usage bổ sung nhằm bảo đảm hạn mức nguyên tử, không chỉ đếm cache thành công. Migration đã áp dụng trên DB local (33 migration đã áp dụng).

Đã bật `PERSONALIZATION_RAG_ENABLED=true` trong cấu hình local và khởi động lại riêng backend; container healthy. File môi trường không đưa vào Git. Không thay API key, model hay billing. Dữ liệu R1 giữ nguyên; lần triển khai này không cần import lại corpus.

Để sử dụng: vào kế hoạch học tập, mở hoạt động ôn lỗi (`/profile/mistakes?itemId=...`) rồi mở **Vì sao sai?** ở câu sai/bỏ qua. Flag trong response review quyết định hiển thị nút.

## Kiểm chứng

- Backend: 310 tests / 25 suites của personalization, retrieval, chatbot và ai-shared đạt; trong đó 28 test R2.
- PostgreSQL integration R2 đạt: migration up/down/up trong schema test, ownership, unique cache, quota đồng thời, cache sau hết lượt, revision, retrieval gap và cascade.
- Browser: 2 bài kiểm thử đạt tại 1280 px và 390 px; kiểm tra lazy request, nguồn/noopener, fallback, retry, đổi locale, flag off và không tràn ngang.
- Typecheck/build backend và build frontend đạt. Lint frontend các file sửa đạt. Build frontend còn cảnh báo kích thước chunk hiện có.

Các lệnh chạy lại: backend `npm run typecheck`, `npm run build`, `npm test -- --testPathPattern "personalization|retrieval|chatbot|ai-shared"`; integration `npm run test:explanation:db` với TEST_DATABASE_URL chỉ tới database có hậu tố _test, khác DATABASE_URL; frontend `npm run test:explanation:ui`, `npm run build`.

## Rà soát chất lượng 30 mẫu

Kết quả và toàn bộ nội dung/citation: [rag-r2-explanation-eval.json](../backend/test/fixtures/rag-r2-explanation-eval.json). Bộ mẫu công khai gồm 20 Grammar và 10 Reading, không chứa bài làm riêng của người học. Sinh bằng model cấu hình local; đã đọc từng câu, giải thích và các đoạn nguồn bằng AI.

30/30 mẫu cuối READY, citation thuộc nguồn được cung cấp. Điểm AI theo thang 0–2: kiến thức 2.0, bám nguồn 2.0, rõ ràng 1.8. Sáu mẫu có ghi chú nhỏ về cách diễn đạt/phạm vi mẹo. Một mẫu phát triển gọi nhầm `had been working` là past continuous đã bị loại, bổ sung regression và sinh lại đúng past perfect continuous; bản bị loại được giữ trong `rejectedExamples` để kiểm toán.

Đây là **AI review, chưa phải giáo viên nghiệm thu**. Citation hợp lệ và validator không chứng minh mọi nhận định đều đúng. Bộ mẫu có câu gần trùng, không phải gold độc lập, không kiểm chứng âm thanh Listening. Lỗi provider 503/quota đã được thử lại để thu đủ mẫu nên không dùng kết quả này để khẳng định độ sẵn sàng/lượt đầu hoặc độ trễ. Mẫu được thu qua các lần tinh chỉnh prompt/query rồi kiểm tra lại với contract cuối, không phải 30 lượt mới sau khi đóng băng prompt. Những hạn chế này cũng lưu trong JSON.

CLI `npm run rag:explanations:eval -- --apply` phát sinh gọi AI thật; mặc định chỉ xem số mẫu. `node scripts/rag-explanation-review.cjs` ghi lại quyết định biên tập AI đã thực hiện, không tự động chấm ngữ nghĩa. Giải thích gốc trong fallback vẫn phụ thuộc chất lượng nguồn đề; không tự sửa đáp án/giải thích đề trong database.
