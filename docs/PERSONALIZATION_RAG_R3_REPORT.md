# RAG R3 — Chọn đề theo lỗi gần đây

Ngày kiểm chứng: 12/11/2026. Nhánh chung: `feature/personalization-rag`.

## Chức năng đã triển khai

- `RetrievalCandidatesService.rankTests` ánh xạ tối đa 30 lỗi từ bài SUBMITTED/OBJECTIVE của đúng người học qua snapshot/key/hash. Đọc vector đã lưu đúng model/version, không gọi API embedding hoặc generation. Snapshot cũ không khớp hash thì bỏ qua.
- Mỗi câu nguồn lấy tối đa 10 câu cùng kỹ năng ở ngưỡng 0.75, loại chính đề nguồn. Đề đích phải xuất bản, không archive, schema 1, đủ điều kiện practice/full skill và REGULAR_TEST_SQL. Loại placement và các Part cùng placement family; câu placement vẫn dùng làm nguồn truy vấn.
- `matchCount` là số câu sai nguồn khác nhau có ít nhất một câu khớp trong đề đích; làm lại cùng câu không tăng số này. `score` là tổng similarity tốt nhất của mỗi câu nguồn trong đề đó, tránh nhân điểm khi nhiều câu trong đề khớp cùng lỗi. Trace giữ tối đa 5 question IDs, 5 khóa lỗi và 5 tên chủ đề đã duyệt; giới hạn trace không cắt matchCount.
- Đề có ít nhất 2 lỗi khớp vào bậc 1, ưu tiên ngay trong CTE trước giới hạn 21 đề/kỹ năng. Hàm thuần `rankTestCandidates` giữ luân phiên kỹ năng, ưu tiên placement, rồi bậc/số lỗi khớp/score/chưa làm/seed/id. Đề đã làm bị đẩy xuống khi các tiêu chí truy xuất ngang nhau.
- TOPIC_REVIEW bậc 2 chọn đề chưa làm có nhiều câu mang nhãn chủ đề nhất; nếu tất cả đã làm thì chọn đề có nhiều câu chủ đề nhất. matchCount=0 vì số câu cùng chủ đề không phải số lỗi đối chiếu bằng vector. Writing/Speaking giữ cách xếp cũ, metadata bậc 3.
- Thiếu đề bậc 1: tối đa một gap PLAN mỗi kỹ năng có lỗi trong lần build. Tắt flag không truy xuất/ghi gap và giữ lựa chọn cũ, kể cả truy vấn TOPIC_REVIEW cũ.
- Rule plan giữ cách chia ngày, lưu trace và reason SIMILAR_QUESTIONS cho bậc 1. AI plan cũng truyền trace từ ứng viên được chọn qua repository. API chỉ trả tier/matchCount/matchedTopics, không trả khóa bài làm hoặc question IDs nội bộ.
- Weekly prompt `personal-weekly-v6` nhận title/tier/matchCount/matchedTopics; ưu tiên bậc thấp sau placement. Validator từ chối lý do tương tự không có matchCount hoặc ghi sai/thiếu số câu. Snapshot version vẫn 5.
- UI Việt/Anh: “Khớp N câu với lỗi gần đây”, “Chủ đề cần ôn: …”. Item cũ retrieval=null và bậc 3/4 không có dòng phụ.

## Vận hành và cách thử

Đã áp dụng migration `1760000026000-AddPlanRetrievalTrace` trên DB local (34 migrations), thêm study_plan_items.retrieval và study_plans.replanned_after_placement_at để R4 dùng. Backend readiness HTTP 200, PostgreSQL connected; frontend chạy Vite với source mount hiện tại. RAG local đang bật từ R2; không đổi API key/model/billing.

Các biến đã có trong `.env.example`: PERSONALIZATION_RAG_ENABLED, RAG_QUESTION_MIN_SIMILARITY=0.75, RAG_SIMILAR_PER_MISTAKE=10, RAG_MIN_MATCHES_PER_TEST=2. Per-mistake tối đa 50; tối đa 30 câu nguồn.

R3 áp dụng khi tạo kế hoạch mới qua luồng hiện có. Kế hoạch đã lưu không tự đổi và không mất tiến độ. Dùng tài khoản test đã có bài sai rồi tạo mục tiêu mới để xem badge trong dashboard, hoặc xem kế hoạch tuần kế tiếp. Badge bậc 1 chỉ có khi đủ ít nhất hai lỗi khác nhau khớp đề khác; ít dữ liệu sẽ dùng fallback. Tự xếp lại ngay sau placement thuộc R4; cột dự phòng chưa kích hoạt hành vi đó.

## Kiểm thử

- Backend personalization/retrieval/chatbot/ai-shared: 326 test / 27 suite đạt trước test contract bổ sung; lần tập trung cuối 34 test / 3 suite đạt, bao gồm validator thực sự gọi guard và AI item giữ trace.
- PostgreSQL R3 đạt: migration up/down/up, top 21 trong catalog trên 21 đề, 5 lỗi khác nhau, phá hòa đề đã làm, loại placement family, chọn topic mật độ cao, không gọi embedding, flag off, ownership, hash cũ và gap.
- PostgreSQL repository/migration chain đạt; trace JSON ghi/đọc nguyên vẹn, item cũ null. Fixture migration lịch sử cập nhật theo chuỗi migration hiện tại thay vì cố định ba tên cũ.
- Hồi quy GĐ4/S1 kế hoạch/task thực, GĐ7 báo cáo tuần/fallback/concurrency, placement, S4 overview và topic workflow đạt.
- Browser R3: 2 ca tại 1280 px và 390 px đạt badge bậc 1/2, item cũ, locale, không tràn ngang, không lỗi JS. Browser mock API; integration PostgreSQL kiểm tra backend thật.
- Typecheck/build backend, build frontend đạt. Frontend vẫn cảnh báo bundle lớn hiện có.
- Runner tổng `test:personalization:db` không chạy hết: fixture `personalization-goals.ts` cũ yêu cầu mục tiêu 40 bài/3 ngày, trái giới hạn hiện hành 3 bài/ngày, nhận 400 thay vì 201. Các hồi quy cần cho R3 đã chạy trực tiếp và đạt; không tuyên bố toàn bộ runner cũ xanh.

Lệnh: backend `npm run test:rag:plan:db` với TEST_DATABASE_URL hậu tố `_test`, khác DB ứng dụng; frontend `npm run test:rag:plan:ui`. Fixture tạo schema riêng và dọn trong finally.

## Đo chất lượng — chưa phải nghiệm thu độc lập

Artifact: [rag-r3-plan-baseline.json](../backend/test/fixtures/rag-r3-plan-baseline.json). Script `npm run rag:plan:baseline` không gọi AI; bài làm giả lập từ câu công khai được tạo trong transaction rồi rollback. Dùng vector thật đã lưu; giữ nguyên ngưỡng/thuật toán sau khi xem kết quả. Truy vấn gần nhất trùng đầu vào được cache trong lần đo.

60 kịch bản R0, mỗi kịch bản gồm một câu trung tâm và bốn lỗi cùng kỹ năng. So đề đứng đầu với thứ tự Part yếu/đã làm/seed cũ qua 20 seed. Chỉ đếm cặp AI đã ghi NEAR_DUPLICATE hoặc STRATEGY_RELEVANT; loại REJECTED và AUDIO_UNVERIFIED. 37/60 câu trung tâm có ít nhất một cặp thuộc hai nhóm này.

| Phạm vi đếm cặp đã có nhãn trong đề chọn | R3 | Cách cũ, 20 seed |
| --- | ---: | ---: |
| Hợp cặp của cả nhóm 5 lỗi, số câu đích khác nhau | 0.1667 | 0.1117 |
| Chỉ câu trung tâm, cả 60 mẫu | 0.0167 | 0.0267 |
| Chỉ câu trung tâm, 37 mẫu có cặp đã rà soát | 0.0270 | 0.0432 |

Theo nhóm lỗi kết quả cao hơn; theo từng câu trung tâm kết quả thấp hơn cách cũ. Giữ cả hai phép đo, không thay bằng điểm similarity của chính thuật toán. Nhãn thưa, chưa đầy đủ cho mọi đề chọn, có near-duplicate; câu chưa có nhãn không mặc nhiên sai. Các nhóm chồng lặp, không phải 60 mẫu độc lập. R0 vẫn evaluationEligible=false; không sửa thành gold hoặc tuyên bố giáo viên duyệt.

**Kết luận:** chức năng R3 và kiểm thử chức năng đã triển khai; chưa đủ căn cứ tuyên bố đạt hoàn toàn tiêu chí chất lượng “đề gợi ý tốt hơn ngẫu nhiên trên từng câu của bộ gold”. Cần nhãn độc lập đầy đủ và xác minh audio ở vòng đánh giá tiếp theo; không dùng số theo nhóm để che kết quả từng câu thấp hơn.
