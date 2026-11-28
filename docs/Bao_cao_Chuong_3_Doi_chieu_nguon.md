# Đối chiếu nguồn và hướng dẫn hoàn thiện Chương 3

Tài liệu biên tập đi kèm `Bao_cao_Chuong_3_va_Ket_luan_AptiMate.md`, lập ngày 28/11/2026. Không ghép nguyên tài liệu này vào nội dung chương. Bản thảo chính được viết mới; không sửa Chương 2, mã nguồn hay dữ liệu bài làm.

## 1. Tài liệu tham khảo về cấu trúc và hành văn

Ba tài liệu PDF do người dùng cung cấp được tham khảo về cách mở đầu chương, phân chia nội dung, mô tả module và trình bày kết luận. Không lấy kiến trúc, số liệu hay tuyên bố hiệu quả của các hệ thống này làm kết quả của AptiMate.

| Tài liệu | Vị trí tham khảo (số trang PDF, tính từ 1) | Cách vận dụng |
| --- | --- | --- |
| Nghiên cứu các phương pháp tối ưu truy xuất nâng cao hiệu suất của hệ thống truy vấn pháp luật tiếng Việt dựa trên RAG | 54: mở đầu Chương 3; 99: Kết luận | Tổ chức dữ liệu, thiết kế và thực nghiệm trong cùng chương; phân tích kết quả trước khi nêu hạn chế. |
| Phát triển hệ thống E-learning thông minh tích hợp AI hỗ trợ cá nhân hóa học tập | 32: mở đầu Chương 3 và yêu cầu; 115: Kết luận | Trình bày mục tiêu, tác nhân và chức năng bằng lời văn báo cáo; kết luận theo chức năng, kỹ thuật và hạn chế. |
| Xây dựng hệ thống chuyển đổi và tóm tắt nội dung cuộc họp từ dữ liệu âm thanh | 68: Chương 3; 85: Chương 4; 91: Kết luận | Tham khảo cách mô tả pipeline; chuyển nội dung môi trường, dữ liệu và đánh giá vào mục 3.6 của AptiMate, không tạo Chương 4. |

Các PDF nằm tại `E:/Đồ án/Ảnh logo_nền`. Khi đưa vào danh mục tài liệu tham khảo chính thức, lấy tác giả, năm và đơn vị từ trang bìa của từng tài liệu; không tự suy đoán thông tin thư mục. Hình của hệ thống tham khảo không được thay cho hình AptiMate.

## 2. Nguồn đối chiếu triển khai

Các đường dẫn dưới đây tính từ thư mục gốc dự án `E:/Đồ án/Code/DATN`.

| Nội dung trong bản thảo | Nguồn |
| --- | --- |
| React/Vite, NestJS và môi trường Docker | `frontend/package.json`, `backend/package.json`, `README.md`, các tệp Compose. |
| Hai vai trò ADMIN/STUDENT | `backend/src/features/auth/types/auth-user.type.ts`. |
| Các nhóm bảng | `backend/src/database/migrations/`, đặc biệt CreateCoreSchema, CreateFeatureSchema, AddWritingAiGrading, AddSpeakingAiGrading, AddReferenceAssessments và nhóm migration RAG. |
| Writing mặc định Gemini 3.5 Flash-Lite | `backend/src/config/configuration.ts`, `backend/src/config/env.validation.ts`. Biến môi trường có thể ghi đè cấu hình mặc định. |
| Dữ liệu đầu vào Writing được hoàn tất trước khi enqueue | `backend/src/features/writing-assessment/services/writing-assessment-coordinator.service.ts`. |
| Dẫn chứng theo định danh | `backend/src/features/writing-assessment/services/writing-evidence-ids.ts`. |
| Speaking Gemini 3.1; Whisper; âm thanh/ảnh/transcript | `backend/src/features/test-attempts/services/speaking-ai-config.service.ts`, `speaking-ai-provider.service.ts`, `shared-speaking-transcript.service.ts`. |
| Kết quả tham khảo GPT-OSS 120B và checkpoint Writing | `backend/src/features/reference-assessment/reference-assessment.service.ts`. |
| Embedding 768 chiều | `backend/src/features/retrieval/embedding.service.ts`, `backend/src/features/chatbot/chatbot.provider.ts`. |
| Cache danh mục 120 giây; API trạng thái tách riêng | `docs/REDIS_CATALOG_AND_ROADMAP.md`, `backend/src/common/cache/`. |
| Cache dashboard 45 giây | `backend/src/features/test-attempts/services/student-dashboard.service.ts`. |

## 3. Nguồn số liệu thực nghiệm

### Bảng 3.5: kiểm thử chức năng

Nguồn: `docs/PERSONALIZATION_RAG_R0_R7_CHECK.md`, đợt ngày 14/11/2026.

- 318 unit test / 27 suites và một snapshot.
- 11 script DB/API và 12 ca browser.
- Browser sử dụng API fixture; không coi đây là kiểm thử toàn tuyến với AI thật.
- Đây là kết quả đã được ghi nhận trong báo cáo kiểm thử, không phải các bài test được chạy lại trong lần viết chương này.

### Bảng 3.6: benchmark Writing

Nguồn: `backend/benchmark-writing-2026-11-26.json`.

- 30 trường hợp = 5 bài × 6 mô hình; tổng 75 bản ghi yêu cầu.
- Mỗi trường hợp chạy một lần, không tự retry lỗi HTTP/nội dung.
- Chỉ Gemini 3.5 Flash-Lite có 2 trường hợp `VALID`; các trường hợp còn lại `FAILED` trong đợt này.
- Tỷ lệ lấy mẫu số là 5 bài của mỗi mô hình, không phải số yêu cầu HTTP.
- `resultHashesUnchanged=true`: báo cáo xác nhận kết quả gốc không bị thay đổi.
- Lỗi enum CEFR là số liệu trước sửa schema PART; không coi là kết quả đo lại phiên bản hiện tại.
- Không gộp những benchmark khác ngày hoặc khác tập bài vào cùng bảng. Những thử nghiệm OpenRouter và các mô hình khác có thể đưa vào phụ lục riêng nếu cần.

### Bảng 3.7: truy xuất

Nguồn: `docs/PERSONALIZATION_RAG_EVAL.md` và `docs/PERSONALIZATION_RAG_R7_REPORT.md`.

- Học liệu: 60 mẫu; câu hỏi: 37 mẫu có cặp nhãn theo evaluator.
- Số mẫu đủ điều kiện gold độc lập: 0/60; trạng thái `REVIEW_REQUIRED`.
- Recall không đồng nhất với hit-rate khi có nhiều phần tử liên quan.
- MRR của vector/từ khóa được tính theo thứ hạng khả dụng; RRF hợp nhất top 50 mỗi nhánh theo evaluator.
- Không kết luận RRF tốt hơn vector: các giá trị Recall bằng nhau; MRR kho câu hỏi của RRF thấp hơn nhẹ.

## 4. Những phần cần hoàn thiện khi dàn trang

1. Chèn 18 hình theo các vị trí Hình 3.1–3.18. Hình 3.1–3.9 là sơ đồ; Hình 3.10–3.16 là ảnh giao diện; Hình 3.17–3.18 là biểu đồ từ bảng số liệu.
2. Dòng mô tả dưới mỗi hình đã có sẵn. Khi chuyển sang Word, có thể đặt cỡ chữ nhỏ hơn phần thân; bản Markdown sử dụng chữ nghiêng để phân biệt.
3. Bảng 3.6 khá rộng: cân nhắc trang ngang hoặc tách nguyên nhân lỗi sang bảng tiếp theo và cập nhật đánh số tự động. Không thu nhỏ chữ quá mức.
4. Ảnh giao diện phải lấy từ AptiMate, ẩn email, định danh cá nhân và khóa dịch vụ. Không dùng ảnh lỗi cũ để minh họa trạng thái thành công.
5. Nếu cần bảng CPU/RAM và phiên bản phần mềm chính xác của máy thực nghiệm, bổ sung từ bản ghi của đúng đợt đo. Không lấy cấu hình máy trong các luận văn tham khảo hoặc lấy máy hiện tại thay cho môi trường lịch sử.
6. Không bổ sung tỷ lệ chấm đúng CEFR, mức cải thiện học tập, điểm hài lòng hoặc tỷ lệ giảm độ trễ Redis nếu chưa có phép đo tương ứng.
7. Các tính năng RAG có cờ cấu hình; mô tả việc đã có triển khai không có nghĩa mọi cờ đều đang bật trên môi trường đang chạy.

## 5. Kiểm tra bản thảo

- Chương 3 gồm 7 mục lớn; thực nghiệm nằm ở 3.6, kết luận chương ở 3.7.
- Sau Chương 3 là Kết luận với kết quả đạt được, hạn chế và hướng phát triển; không có Chương 4.
- Có 18 vị trí hình và 7 bảng đánh số liên tục.
- Công thức 3.1 có giải thích ký hiệu và ví dụ 2/5 = 40%.
- Đã giữ riêng kết quả kiểm thử phần mềm, khả năng hoàn thành chấm AI và chất lượng chấm chưa được thẩm định.
