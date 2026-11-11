# R1 — Nền tảng truy xuất cá nhân hóa

Ngày kiểm tra: 11/11/2026. Nhánh chung: `feature/personalization-rag`.

## Kết quả thực tế

- Hoàn tất sửa 63 học liệu cần biên tập sau vòng duyệt đầu. Corpus gồm 45 LESSON, 18 PART_STRATEGY, 10 CRITERION_GUIDE được AI duyệt với hash nội dung, cùng 6 GENERAL có nguồn. Không ghi thành con người duyệt.
- Database local đã import **79 tài liệu READY, 251 chunk và 251 vector thật**.
- Đã áp dụng migration `1760000024000-AddRagRetrievalStores`.
- `rag:status` xác nhận **2.428/2.428 câu** của snapshot đang xuất bản có embedding hiện hành; missing=0, stale=0; **173 job hoàn thành, pending=0, failed=0**. Smoke trả 5 đoạn kiến thức và 3 câu tương tự. Đây là kiểm tra chức năng, không phải benchmark độ chính xác.
- Không đổi frontend. Cờ PERSONALIZATION_RAG_ENABLED của backend local vẫn mặc định false; backfill dùng worker CLI bật riêng cho process. Cần bật cờ khi muốn worker nền tự cập nhật sau lần xuất bản mới. Không triển khai R2.

## Phần triển khai

`RetrievalModule` export EmbeddingService, KnowledgeSearchService, QuestionSearchService. Chatbot và Personalization import module chung. Chatbot giữ giới hạn 6 nguồn, examVariant, LEARNER và phiên bản READY mới nhất; không áp ngưỡng cá nhân hóa lên chatbot.

Knowledge retrieval gộp vector và full-text bằng RRF với hằng số 60; filter component/part/topicCodes/usage/criterion được tham số hóa. Question retrieval đối chiếu hash hiện hành và snapshot đã xuất bản, loại đề lưu trữ và đề placement theo mặc định, hỗ trợ loại test/question đã làm. Không tạo HNSW cho kho hiện tại.

Question text hỗ trợ 18 loại câu hiện có, chọn context đúng Part/group, loại URL/media/HTML, giới hạn 2.000 ký tự với dấu cắt. Worker mỗi lượt tối đa 5 job, transaction khóa SKIP LOCKED, tối đa 20 câu/lô; chỉ cập nhật khi hash/key/text/model/version thay đổi. Câu có đầu vào văn bản giống hệt được dùng lại vector thật cùng model/version; ID/hash/snapshot vẫn kiểm tra riêng từng câu. Không dùng vector giả trong database ứng dụng.

Quota Gemini từng chặn backfill với `EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier=1000`. Đã bổ sung đọc RetryInfo bên cạnh Retry-After, cooldown toàn worker trong process và giữ tiến độ transaction đã hoàn thành. Sau khi quota được cấp lại và tái sử dụng đầu vào trùng, backfill đã hoàn tất. Không đổi billing/API key hay tăng hạn mức dịch vụ.

## Baseline truy xuất

Nhãn: `backend/test/fixtures/rag-r1-baseline-labels.json`; kết quả có hash corpus/labels, thời gian và từng mẫu: `backend/test/fixtures/rag-r1-baseline-results.json`.

| Cách tìm | Mẫu đã đo | Recall@5 chunk có bài học đích | Macro theo họ câu |
| --- | ---: | ---: | ---: |
| Từ khóa | 60 | 0% | 0% |
| Vector | 60 | 100% | 100% |
| Kết hợp RRF | 60 | 100% | 100% |

Phạm vi là tìm LESSON từ văn bản 60 câu R0, một bài đích/mẫu. Query loại explanation và nhãn đáp án, dùng Gemini RETRIEVAL_QUERY thật; không lọc trước theo nhãn đích. Cách từ khóa giữ nguyên `plainto_tsquery('simple', fullQuery)`: phép AND trên query dài và khác ngôn ngữ với học liệu khiến không có kết quả phù hợp. Không sửa truy vấn sau khi xem điểm để làm đẹp baseline.

Đây là **baseline phát triển do AI rà soát**, không phải gold độc lập hay kiểm chứng tổng quát hóa. Các họ câu gần trùng được nhóm để báo thêm macro. Listening chỉ đánh giá chiến lược được hỏi trong văn bản, không xác nhận đáp án audio. `rag-gold.json` và các cặp câu tương tự R0 vẫn bị loại khỏi metric nghiệm thu độc lập; không dùng kết quả 100% này để công bố độ chính xác giải thích lỗi/câu tương tự. R7 cần bộ đánh giá độc lập, audio đã kiểm chứng và chia họ đề. Hai explanation nguồn đã phát hiện sai ở vòng R0 không được đưa vào query baseline; R1 không tự sửa nội dung đề của tác giả.

## Kiểm chứng và vận hành

- 282 unit tests thuộc 23 suites retrieval/chatbot/ai-shared/personalization đạt.
- PostgreSQL R1 đạt migration up/down/up, trigger xuất bản, concurrency, idempotency, đổi hash, dùng lại vector cho câu trùng, loại placement và filter quyền truy cập.
- Hồi quy PostgreSQL chatbot đạt; typecheck và build backend đạt.
- `rag:status` đạt trên DB ứng dụng với missing/stale/pending/failed đều bằng 0.

Lệnh và biến cấu hình xem `backend/README.md`, mục R1. `questions:embed` mặc định chỉ đếm; `--apply` mới xếp job; `--refresh-completed` dùng khi đổi model/text version. `rag:baseline -- --embed` tạo query cache; chạy lại không flag dùng cache không gọi AI. Cache local được gitignore. Trong container có thể dùng `RAG_BASELINE_OUTPUT_DIR=/tmp/aptimate-rag` rồi copy report/cache về workspace.

Rate limiter theo process, không phải bộ giới hạn phân tán. Các ngưỡng similarity vẫn là giá trị tạm để giai đoạn tiếp theo hiệu chỉnh. Kiểm thử chatbot dùng provider giả; smoke dữ liệu thật kiểm tra truy xuất, không phải chấm chất lượng hội thoại trực tiếp.
