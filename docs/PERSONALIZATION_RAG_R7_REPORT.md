# R7 — Công cụ đánh giá và đối chiếu

Đã triển khai `backend/scripts/rag-eval.ts` và `npm run rag:eval`. Kết quả thực tế nằm trong [PERSONALIZATION_RAG_EVAL.md](PERSONALIZATION_RAG_EVAL.md); kiểm thử R0–R6 và các phần chưa đạt nằm trong [PERSONALIZATION_RAG_R0_R7_CHECK.md](PERSONALIZATION_RAG_R0_R7_CHECK.md).

- Đo Recall@1/3/5, MRR keyword/vector/RRF, tách hai kho và kỹ năng; không đánh đồng hit-rate với recall khi có nhiều relevant.
- Quét 0,50–0,90 bước 0,05. Không coi candidate chưa có nhãn là negative; không chốt precision trên một phần judged.
- So sánh chọn đề bằng luồng R3 hiện tại với 20 seed cách cũ, dữ liệu tổng hợp và transaction rollback.
- Ghi validator vào `ai_requests.config_snapshot.validation`: attempt, valid, mã issues; không lưu lời AI hoặc bài viết. Các request cũ giữ UNKNOWN. Thống kê theo chu kỳ sinh, retry worker ở chu kỳ khác được tính riêng.
- Chuẩn bị 40 mẫu chấm tay, giữ nguyên điểm người duyệt khi chạy lại; không tự quy đổi điểm AI cũ.
- Đọc completion tier 1/3 và gaps theo tuần; không dựng dữ liệu quan sát khi DB chưa có.

Không migration mới, không đổi thuật toán chọn đề/CEFR, không gọi provider trong evaluator. Đã sửa cấu hình fixture test tổng quan, bổ sung test telemetry thực tế trong schema PostgreSQL riêng.

## Chạy lại

Từ `backend`, chạy `npm run rag:eval` với DATABASE_URL của môi trường cần đánh giá. Cần fixture R0/R1/R2, cache `test/fixtures/rag-r1-query-vectors.local.json` tương ứng model/query (cache local không commit), và `docs/rag-r5-smoke.json`. Cache thiếu thì báo rõ mẫu không có vector, không tự gọi AI.

`RAG_EVAL_OUTPUT_DIR` đổi thư mục đầu ra; `RAG_REPORT_REVIEW_SOURCE` đổi đường dẫn bộ báo cáo mẫu. Khi chạy Docker cần copy scripts, test fixtures, `.env.example` và artifact báo cáo vào container, vì các thư mục này không được bind mount như src/resources.

Sau khi có nhãn đủ chuẩn, `npm run rag:eval -- --apply-thresholds` chọn mức thấp nhất có precision ≥0,8 và cập nhật **.env.example**, không sửa .env đang chạy. Lệnh từ chối cập nhật khi thiếu vector hoặc chưa có ngưỡng hợp lệ. Muốn triển khai cấu hình mới phải áp dụng giá trị đó vào môi trường chạy rồi restart.

Nhãn knowledge có thể bổ sung `samples[].judgements: [{documentKey, relevant: true/false}]` trong `rag-r1-baseline-labels.json`; `documentKey` chính vẫn là positive. Nhãn questions dùng `review.pairs` với NEAR_DUPLICATE/STRATEGY_RELEVANT hoặc REJECTED. Không gán negative cho tài liệu chưa đọc. Chỉ đặt cờ humanReviewed/evaluationEligible sau khi người duyệt thực sự hoàn tất; nhãn mâu thuẫn sẽ bị từ chối.

`npm run test:rag:eval:db` dùng TEST_DATABASE_URL riêng hậu tố `_test`; không dùng DB ứng dụng cho fixture.

## Nghiệm thu

**Phần code và kiểm thử chức năng đã hoàn tất; nghiệm thu chất lượng R7 chưa hoàn tất.** Hiện 0/60 mẫu gold độc lập, 0/40 mẫu chấm tay 1–5; chưa có ngưỡng đủ điều kiện. Đây cũng là phần nghiệm thu nội dung còn thiếu từ R0/R2, không được che bằng kết quả unit test. Giữ ngưỡng tạm và trạng thái REVIEW_REQUIRED trong báo cáo.
