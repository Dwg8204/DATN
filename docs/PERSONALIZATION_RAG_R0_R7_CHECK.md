# Kiểm tra RAG R0–R7

Kiểm chứng local ngày 14/11/2026, nhánh `feature/personalization-rag`.

**Các luồng chức năng đã qua kiểm thử tự động. Chưa thể nghiệm thu toàn bộ chất lượng RAG theo kế hoạch.** Đợt này dùng PostgreSQL/schema test cách ly và browser có API fixture; không gọi AI provider thật, không gửi email, không tạo kết quả học giả cho tài khoản thật.

| Giai đoạn | Kiểm tra đã chạy | Kết quả và giới hạn |
| --- | --- | --- |
| R0 | Validator corpus và nhãn | PASS cấu trúc: 45 bài học, 18 chiến lược, 10 hướng dẫn tiêu chí, 60 mẫu. Cả 60 mẫu chưa đủ điều kiện đánh giá độc lập. |
| R1 | DB retrieval; trạng thái vector; unit hybrid/filter | PASS. 2.428 câu không thiếu/cũ vector; 79 tài liệu, 251/251 chunk có vector; 173 job hoàn tất, 0 pending/failed. |
| R2 | DB explanation; browser desktop/mobile | PASS quyền sở hữu, cache, citation, fallback/retry, locale và cờ tắt. Bộ 30 lời giải để chấm lại thang 1–5 đã chuẩn bị; không coi điểm AI cũ là chấm tay độc lập. |
| R3 | DB retrieval-plan; browser; baseline 20 seed | PASS chọn đề/bậc dự phòng và hiển thị bằng chứng. Semantic chưa chứng minh cải thiện đồng đều: nguồn trung tâm RAG 0,0167 so với cách cũ 0,0267; toàn nhóm 0,1667 so với 0,1117. Đây là số câu có nhãn tương tự trung bình, không phải phần trăm chính xác. |
| R4 | DB placement-replan; browser | PASS đủ 3 bài mới xếp lại, bảo toàn tiến độ, concurrency/idempotency, thông báo và lưu trạng thái đóng. |
| R5 | DB learner-errors, reports, final, chatbot, overview; browser báo cáo | PASS cách ly người dùng, worker, grounded sources, retry/quota, báo cáo và sync. DB local còn 1 job lỗi học tập pending do thiếu vector phù hợp snapshot lịch sử; không ép gán vector phiên bản khác. Smoke AI thật trước đây đạt 9/10 lần đầu; lần này không gọi lại provider. |
| R6 | DB admin-rag; browser 2 ngôn ngữ × 2 kích thước | PASS 401/403, lọc/phân trang, retention, audit, khóa job, reindex và polling. Reindex dùng vector fixture trong schema test, không gọi embedding thật. |
| R7 | Evaluator 60 mẫu/360 tổ hợp; unit metrics; DB telemetry | PASS công cụ, ghi đủ bảng và bộ 40 mẫu. Trạng thái nghiệm thu `REVIEW_REQUIRED`: thiếu gold độc lập, điểm chấm tay và dữ liệu quan sát sau khi bật telemetry. |

## Tổng kết kiểm thử

- 318 unit test / 27 suites (`retrieval|personalization|ai-shared`) và 1 snapshot: PASS.
- 11 script DB/API: `rag-retrieval`, `mistake-explanation`, `retrieval-plan`, `placement-replan`, `learner-errors`, `admin-rag`, `personalization-reports`, `personalization-final`, `personalization-chatbot`, `personalization-overview`, `rag-evaluation`: PASS. Script tổng quan được sửa để nạp ConfigModule/configuration giống ứng dụng.
- 12 ca browser R2/R3/R4/R5/R6: PASS, không skip, desktop/mobile. Đây là kiểm thử giao diện với API fixture, không phải toàn bộ trình duyệt → AI thật.
- Backend typecheck/build và frontend build: PASS. Frontend còn cảnh báo bundle lớn.
- R7 telemetry kiểm tra provider COMPLETED nhưng validator fail, JSON sai, lượt sửa thành công, chỉ lưu mã lỗi và giữ request cũ là UNKNOWN.

## Kết luận chất lượng hiện tại

Xem [bảng đo đầy đủ](PERSONALIZATION_RAG_EVAL.md). Trên nhãn phát triển hiện có, knowledge vector/RRF Recall@5 = 1, MRR ≈ 0,9094; kho câu hỏi vector Recall@5 ≈ 0,3054, MRR ≈ 0,4225 (37 mẫu có cặp relevant được duyệt AI). Không gọi các số này là độ chính xác trên gold độc lập. Keyword knowledge không có hit; câu truy vấn dài dùng AND và khác ngôn ngữ học liệu là hạn chế cần khảo sát, không sửa thuật toán chỉ để tăng điểm test.

Chưa có ngưỡng đủ điều kiện precision ≥ 0,8 trên tập được đánh giá đầy đủ. Giữ `RAG_QUESTION_MIN_SIMILARITY=0.75`, `RAG_KNOWLEDGE_MIN_SIMILARITY=0.70` như giá trị tạm; không tuyên bố đã hiệu chỉnh. Cờ RAG mặc định vẫn false.

Chưa có item tier 1/3 và gap trong dữ liệu quan sát local hiện tại. Request AI cũ thiếu metadata validation nên tỷ lệ first-pass từ DB là N/A. Không suy diễn provider thành công = validator pass, không điền số 0% khi không có mẫu. Chưa lưu tổng số lượt retrieval nên events/submission chỉ là proxy, không phải gap/request rate.

## Tự thử nhanh

1. Bật `PERSONALIZATION_RAG_ENABLED=true` và worker trong môi trường local đã cấu hình AI; đăng nhập STUDENT.
2. Làm sai một câu khách quan, mở Ôn câu sai → giải thích. Kiểm tra nguồn mở được, tải lại dùng cache; khi không có nguồn phải có fallback, không bịa citation.
3. Mở Dashboard/lộ trình: đề truy xuất có lý do/bằng chứng phù hợp; không đủ dữ liệu vẫn có đề theo logic cũ.
4. Với mục tiêu mới, hoàn thành đủ 3 bài đầu vào. Xác nhận chỉ ngày chưa học được đổi và reload không xếp lại lần nữa.
5. Mở báo cáo mới: có nhóm lỗi và nguồn khi đủ dữ liệu. Báo cáo cũ không tự viết lại; người dùng khác không đọc được dữ liệu của bạn.
6. Đăng nhập ADMIN → `/admin/rag`: xem độ phủ, lọc thiếu hụt, thử Hủy rồi Xác nhận lập chỉ mục lại. STUDENT phải bị từ chối.

Để nghiệm thu R7: hoàn tất nhãn độc lập và chấm `rag-r7-human-review.json` (30 giải thích + 10 báo cáo, 1–5 cho knowledge/grounding/clarity), sau đó chạy lại evaluator. Không đổi `humanReviewed` thành true nếu chưa thực sự có người duyệt.
