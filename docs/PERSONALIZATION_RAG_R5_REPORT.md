# RAG R5 — Kho lỗi và báo cáo có nguồn

Ngày kiểm chứng: 13/11/2026. Nhánh dùng chung: `feature/personalization-rag`.

## Hành vi

- Migration 1760000027000 tạo learner_error_chunks, learner_error_jobs và trigger khi status/result/assessment_revision đổi. Trigger xếp lại job và xóa lỗi cũ ngay trong transaction chấm bài. Có backfill các bài đã nộp. Worker khóa job SKIP LOCKED, tối đa 5 job/lượt mỗi 60 giây; ưu tiên thời điểm retry để job lịch sử thiếu vector không chặn mãi bài mới.
- Trắc nghiệm sao chép vector có cùng question_hash từ question_embeddings, không gọi embedding API. Writing lấy correction loại ERROR và weakness từ kết quả AI, bỏ câu BLANK, tối đa 10 finding/bài, loại trùng; không sao chép original/replacement/evidence/suggestedRevision. Embedding có timeout, quota backoff và giới hạn retry lỗi thường.
- Nhóm lỗi của chính người học theo bài học READY/LEARNER phiên bản hiện hành, đúng component/tiêu chí và ngưỡng cosine. Dùng vector đã lưu, không gọi AI khi dựng snapshot. Gom theo document, tối đa 5 nhóm có lỗi trong kỳ; priorCount đếm lỗi cùng nhóm trước kỳ. Writing grammar/vocabulary/mechanics được đối chiếu học liệu Grammar & Vocabulary.
- Snapshot v6 thêm errorPatterns chỉ cho WEEKLY/MIDTERM/FINAL. Prompt chỉ chứa số đếm, tên/ID bài học và excerpt học liệu tối đa 400 ký tự. Không đưa văn bản người học hoặc nội dung learner_error_chunks vào prompt báo cáo.
- WEEKLY/MIDTERM dùng personal-weekly-v7; FINAL dùng personal-final-v4. Mỗi nextStep có citation hợp lệ. Khi có bài học, mỗi bước cần citation bài học; có thể thêm citation đề. Không có nguồn/đề phù hợp thì nextSteps/citations rỗng. Số lỗi phải khớp count/priorCount; không nói tái diễn nếu chưa có priorCount.
- minimumTestItems được tính chung bằng code cho prompt và validator, giữ quy tắc nhịp luyện R3. Sửa false positive CEFR: “Củng cố”, “Cố gắng” không bị nhận nhầm thành band C; mã CEFR bịa vẫn bị chặn.
- Kiểm tra lại nguồn trong transaction trước khi lưu AI report. Khi đọc báo cáo/chatbot, chỉ trả sources còn khả dụng. Báo cáo READY cũ giữ nguyên; job cũ không có sources vẫn dùng hợp đồng cũ. Nguồn bị thu hồi hiển thị không khả dụng, không sửa lịch sử báo cáo.
- GET /api/v1/me/knowledge/chunks/:id dùng guard STUDENT và UUID; chỉ trả đoạn READY/LEARNER phiên bản hiện hành với examVariant hỗ trợ. Không có API công khai đọc kho lỗi cá nhân.
- Giao diện Việt/Anh: nhóm lỗi trong kỳ, số lỗi hiện tại/trước kỳ, chip bài học mở modal tải lười, chip đề dùng luồng làm bài hiện có; giữ hiển thị báo cáo cũ. Chatbot được cấp cùng nguồn có thật để citation allowlist chấp nhận.

## Kiểm chứng

- PostgreSQL R5: migration up/down/up; trigger; vector reuse không API; SKIP LOCKED; phân tách user; prior/current; revision và thay result cùng revision; thiếu vector; quota; Writing tối đa 10; snapshot report-only; nguồn STAFF bị chặn; lưu nguồn với khóa; đọc báo cáo/chatbot theo chủ sở hữu; nguồn thu hồi không viết lại READY; xóa attempt dọn chunks/jobs. FK user của kho lỗi ON DELETE CASCADE; hệ thống hiện có không cho xóa cứng user còn test_attempts, nên fixture dọn attempts trước khi xóa user.
- Hồi quy database GĐ7, GĐ8, GĐ9, chatbot và S4 đã đạt. GĐ7 chạy thêm chế độ RAG_REPORT_TEST=true để đi qua snapshot v6/sources/citations, retry và fallback thực tế của worker.
- Browser 1280px và 390px: nhóm lỗi, nguồn tải lười, modal/đóng, nội dung không thực thi HTML, lỗi nguồn bị thu hồi, chip đề gửi đúng testId/mode và xử lý lỗi, FINAL, báo cáo cũ, đổi locale, không tràn ngang.
- 342 unit tests/29 suites backend đạt; typecheck và build backend đạt; frontend build và lint hoàn tất. Lint toàn frontend có cảnh báo tồn tại từ trước; các tệp R5 không có lỗi.

## Smoke AI thật

Lệnh backend: `npm run ai:personalization:smoke -- --live --rag`, với TEST_DATABASE_URL kết thúc bằng _test, khác DATABASE_URL. Script tạo user/schema/học liệu giả lập rồi dọn schema, không đọc bài làm tài khoản thật, không gửi email. Mỗi case chỉ gọi một lần, không sửa rồi thử lại riêng case thất bại. Có 4 WEEKLY, 3 MIDTERM, 3 FINAL; case không nguồn, có/không priorCount. Bộ mở rộng thêm ứng viên và kế hoạch hai ngày cho 6 báo cáo WEEKLY/MIDTERM. Mọi chunkId được lấy từ học liệu có thật trong schema test; chúng hết hiệu lực sau khi fixture dọn schema.

- rag-r5-smoke-initial.json: 10/10 trên bộ chỉ báo cáo, days=0. Đây chưa kiểm tra tương tác với kế hoạch.
- rag-r5-smoke-plan-initial.json: 5/10 khi thêm kế hoạch; giữ lại để audit, không loại case thất bại.
- rag-r5-smoke-plan-revision1.json: 6/10 sau khi truyền minimumTestItems. Đầu ra thô giả lập giúp xác định lỗi regex CEFR với chữ tiếng Việt, cùng các đầu ra sai status/citation.
- rag-r5-smoke.json: **9/10 (90%) hợp lệ ngay lần đầu** trên bộ đầy đủ sau sửa cuối. Một WEEKLY bị từ chối vì bước chỉ trích đề mà chưa trích bài học; không lưu thành báo cáo AI READY. Không có chunkId lạ trong 9 đầu ra được chấp nhận. Đạt ngưỡng smoke R5, không phải 100%.

Đây là smoke phát triển nhỏ, không phải đánh giá semantic độc lập hoặc đảm bảo 90% trên toàn bộ người học. Validator kiểm tra hợp đồng, allowlist, số liệu và các mẫu diễn đạt; không chứng minh mọi diễn giải tự do đều đúng về ngữ nghĩa.

## Tình trạng local và giới hạn

Migration đã áp dụng: 35. Corpus giữ 79 tài liệu/251 chunks, 2.428 vector câu hiện hành không thiếu/cũ. Lúc kiểm tra kho lỗi có 725 chunks, 31 job hoàn thành, 1 job chờ vì thiếu vector câu tương thích với snapshot lịch sử, 0 job thất bại. Không tạo vector giả để che khoảng trống này.

Nhóm lỗi chỉ gồm finding đã lập chỉ mục và ghép được học liệu, không phải tổng số lỗi của người học. Writing có thể có correction và weakness khác nhau cho cùng vấn đề; count là số finding, không phải số lỗi ngôn ngữ duy nhất được giáo viên xác minh. Worker bất đồng bộ; báo cáo chốt trước khi index xong có thể thiếu nhóm, và READY không tự viết lại. Cờ PERSONALIZATION_RAG_ENABLED mặc định false, local hiện true. rag:status hiển thị số job/chunk tổng hợp, không in nội dung hoặc định danh người học.

## Tự kiểm tra

1. Nộp bài trắc nghiệm có câu sai/bỏ qua hoặc bài Writing được AI chấm có correction/weakness. Chờ worker và xem `npm run rag:status`.
2. Mở **báo cáo mới được tạo sau R5** ở Hồ sơ → Báo cáo. Báo cáo cũ không tự có nguồn mới. Nhóm chỉ xuất hiện nếu lỗi khớp học liệu đủ ngưỡng.
3. Kiểm tra số hiện tại và “đã gặp ... lần trước đó”; mở chip Bài học và đóng modal. Thử chip Đề gợi ý nếu AI có chọn thêm đề.
4. Bấm hỏi chatbot về báo cáo; câu trả lời có thể trích cùng bài học. Dùng tài khoản khác không được đọc báo cáo đó.
5. Chạy `npm run test:rag:errors:db` trong backend và `npm run test:rag:reports:ui` trong frontend để mô phỏng chấm lại, thu hồi nguồn và báo cáo cũ mà không sửa dữ liệu tài khoản thật. Dùng fixture để kiểm tra mốc tuần/tổng kết, không đổi đồng hồ hệ thống.
