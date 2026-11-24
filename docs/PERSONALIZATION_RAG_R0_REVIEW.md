# Kết quả duyệt R0 — 10/11/2026

> Đây là báo cáo lịch sử của vòng duyệt đầu. 63 học liệu đã được sửa và import trong R1; xem [báo cáo R1](PERSONALIZATION_RAG_R1_REPORT.md) để biết trạng thái hiện tại. Các hạn chế của bộ nhãn cặp câu R0 vẫn được giữ lại.

Người dùng ủy quyền AI duyệt toàn bộ. Người duyệt: Codex (AI), không ghi nhận là duyệt bởi giáo viên/con người. Phạm vi: toàn bộ 73 tài liệu mới, 60 mẫu và 299 cặp đề xuất; 6 tài liệu GENERAL cũ giữ nguyên, không cấp phê duyệt mới.

## Quyết định

| Hạng mục | Kết quả |
|---|---|
| 10 hướng dẫn tiêu chí | AI_APPROVED ở phạm vi hướng dẫn ngắn, không phải rubric chính thức |
| 45 bài học | NEEDS_REVISION: độ dài chủ yếu tăng bằng đoạn chung lặp, thiếu thực hành riêng |
| 18 hướng dẫn Part | NEEDS_REVISION: chưa đủ thao tác/bẫy đặc thù từng Part |
| 60 mẫu đánh giá | NEEDS_REVISION; evaluationEligible=false |
| 299 cặp đề xuất | Đã ghi quyết định từng cặp; 109 cặp bị loại vì khác trọng tâm |

Đây là kết quả duyệt, không phải thông báo toàn bộ học liệu đã đạt. Các lỗi về chất lượng của bản nháp ban đầu thuộc phần chuẩn bị do AI thực hiện; kiểm tra cấu trúc trước đó không phát hiện được chúng.

## Sửa trực tiếp

- Sửa 16 documentKey/nhãn trọng tâm: needn't have → modals; câu hỏi đuôi → question-tags; had left/had been working → past-perfect; since 2020 → present-perfect; Reading gap → giới từ/đại từ/điều kiện; Listening mục đích chính và thông tin trực tiếp không còn mặc định inference.
- Giữ nguyên explanation nguồn trong fixture để không giả mạo database. Hai câu 042f01c9-328f-4934-b737-c051626122d0 và 0ecd5add-3593-4fdb-bf93-b280fb5dc13f có explanation không khớp đề; ghi correction riêng. Không sửa ngân hàng đề đang chạy.
- Bỏ nhãn writing-task gắn sai kỹ năng ở hướng dẫn speaking taskFulfillment; truy xuất bằng component + criterion. Bổ sung phần từ vựng và topic speaking-vocabulary cho grammarVocabulary.
- Thêm người duyệt, ngày, phạm vi, lý do và trạng thái cho từng tài liệu/mẫu. Chặn script tạo nháp ghi đè corpus đã duyệt.

## Cách đọc kết quả từng cặp

`backend/test/fixtures/rag-r0-review-results.json` là sổ duyệt đầy đủ. REJECTED: khác trọng tâm; NEAR_DUPLICATE: nội dung câu giống hệt; AUDIO_UNVERIFIED: chỉ kiểm tra được liên hệ chiến lược bằng văn bản, chưa nghe âm thanh; STRATEGY_RELEVANT: phù hợp ở cấp quy tắc/chiến lược, không bảo đảm cùng lỗi nhận thức.

Quyết định được lưu bằng script để tái lập; không coi bộ phân loại theo dấu hiệu văn bản là bộ đo chất lượng ngữ nghĩa. 109 cặp bị loại là các sai lệch rõ; các cặp còn lại không tự trở thành positive gold. Các bản gần trùng nhưng đổi danh từ hoặc thứ tự đáp án vẫn cần chia theo họ nội dung. Không xóa danh sách đề xuất gốc để giữ dấu vết; evaluator phải kiểm tra evaluationEligible và trạng thái trước khi chạy.

## Giới hạn và việc còn lại

Chưa đối chiếu âm thanh Listening. Một số Reading gap chỉ có options trong content, cần ghép ngữ cảnh Part trước khi đánh giá. Bộ mẫu Grammar hiện đều là multiple-choice, chưa có Vocabulary matching; Listening chưa có Part 2. Vì vậy 20 mẫu mỗi kỹ năng chưa đủ chứng minh độ phủ dạng bài.

Cần biên tập lại 63 tài liệu theo nội dung riêng, xây lại cặp tương tự bằng bằng chứng ngữ nghĩa, bổ sung dạng bài thiếu và tách tập hiệu chỉnh/đánh giá theo họ đề. Không cần người dùng duyệt lại toàn bộ chỉ để thay trạng thái, nhưng AI cũng không thể cấp chứng nhận âm thanh khi chưa nghe nguồn.

Không import corpus: importer hiện chưa thực thi trạng thái review. AI_APPROVED cũng chưa đồng nghĩa đã được nhập vào kho READY. R1 cần áp dụng danh sách trạng thái cho phép rõ ràng.

Nguồn tham khảo cấu trúc được tìm từ British Council: https://www.britishcouncil.org/exam/english/aptis/prepare-general . Mở trang bị timeout trong lần duyệt này; không dùng kết quả tìm kiếm để tuyên bố đã xác minh toàn bộ quy định hay nâng trạng thái 6 tài liệu GENERAL cũ.
