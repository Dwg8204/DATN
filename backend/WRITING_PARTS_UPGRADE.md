# Cập nhật chấm Writing theo Part

## Luồng mới

- Gemini Writing dùng `gemini-3.5-flash-lite`. Speaking không thay đổi.
- Với job mới, cả Gemini và Groq chấm từng Part có nội dung, kiểm tra đầu ra, lưu checkpoint rồi tổng hợp nhận xét và CEFR toàn bài. Không lấy trung bình CEFR từng Part.
- Part bỏ trống được xử lý trên server, không gọi AI. Practice theo Part chỉ chấm Part đó, không gọi tổng hợp toàn bài.
- Gemini dùng `writing-prompt-v4-evidence-ids`: kế thừa rubric và yêu cầu nhận xét từ v3, bổ sung cách chọn dẫn chứng theo ID. Prompt tổng hợp ở `src/features/writing-assessment/prompts/writing-summary-v1.ts`, cũng áp dụng giao thức ID khi dùng v4.
- Groq dùng ngay `groq-writing-parts-v1` với prompt gọn đã có; không thử full trước. Gemini vẫn là kết quả chính cho Dashboard/History, Groq là tham khảo.
- Checkpoint Gemini: `writing_grading_jobs.stage_results`; Groq: `reference_ai_jobs.config.writingParts`. Chỉ tái sử dụng với hash phù hợp. Retry cùng job không gọi lại Part đã chấm hợp lệ.
- Giữ kiểm tra dẫn chứng và các giới hạn Free tier. Cách này không bảo đảm loại bỏ hoàn toàn 503 hoặc lỗi đầu ra. Bài đủ 4 Part cần 5 lượt API mỗi nhà cung cấp, chưa tính retry.

## Sau khi pull code mới

1. Đặt `WRITING_AI_MODEL=gemini-3.5-flash-lite` trong `backend/.env`. Giữ nguyên key và các xác nhận Free tier; không push `.env` lên Git.
2. Dừng backend cũ trước khi triển khai, không chạy hai phiên bản worker song song.
3. Chạy `npm run db:migrate:status`, kiểm tra danh sách migration đang chờ trước khi chạy `npm run db:migrate`, rồi kiểm tra status lần nữa. Các migration Writing mới là `AddWritingPartCheckpoints1760000020000` và `AddWritingRetryDiagnostics1760000021000`: chỉ thêm cột, không xóa bài làm/kết quả.
4. Chạy `npm run typecheck`, `npm test`, `npm run build`, rồi khởi động backend theo cách hiện dùng.
5. Nộp bài mới: log Gemini có `stage=part_N`, checkpoint, rồi `stage=summary` nếu full. Groq có checkpoint và trạng thái độc lập, có thể phải chờ hạn mức.

Không seed/reset DB, revert migration hay backfill khi nâng cấp. Không tự động chấm lại các bài đã hoàn thành/thất bại. Job Gemini cũ giữ config snapshot để bảo toàn hash; job mới hoặc retry qua API hiện có dùng cấu hình mới.

History/Review tiếp tục đọc kết quả đã lưu, không tự chấm lại. Không tự tăng hạn mức bảo vệ Groq. Cấu hình `.env` local đã cập nhật và migration mới đã được chạy trong lượt triển khai này; môi trường khác vẫn cần thực hiện các bước trên.

## Chẩn đoán và retry Gemini Writing

- Với lỗi đầu ra `AI_INVALID_RESPONSE`, `AI_WRITING_EVIDENCE_INVALID`, `AI_RESPONSE_INCOMPLETE`, cho phép tối đa 8 lần chạy trong cùng job (tính cả lần đầu, không phải thêm 8 lần). Các lỗi khác giữ giới hạn `WRITING_AI_MAX_ATTEMPTS` hiện có.
- Chờ 20–23 giây giữa các lần tự thử lại lỗi đầu ra, thay vì backoff tăng dần 30/60/120 giây. Lịch worker 5 giây và giới hạn khoảng cách gọi hiện có có thể khiến chờ lâu hơn. Nếu API yêu cầu chờ lâu hơn thì vẫn tôn trọng. Lỗi 429/503 giữ backoff cũ.
- Không cần đổi `.env` hay config snapshot của job. Cả worker và repository áp dụng giới hạn 8 cho lỗi đầu ra; checkpoint Part hợp lệ vẫn được giữ khi tự retry. Đây là tổng số lần chạy job, không phải 8 lần cho mỗi Part.
- Log lỗi dẫn chứng bổ sung `path`, `questionKey`, `criterion`, `run`. Ví dụ: `stage=part_4 rule=QUOTE_NOT_IN_RESPONSE path=details.parts[0].questions[0].criteria[1].evidenceQuotes[0] questionKey=p4:q1 criterion=GRAMMAR`. Chỉ số mảng tính từ 0 và là vị trí trong phản hồi đang kiểm tra; Part thật xem ở stage hoặc questionKey.
- Không log trích dẫn, bài làm, prompt, raw response hoặc key. Không tự chạy lại các job đã FAILED trước bản cập nhật; cần người dùng yêu cầu retry qua chức năng hiện có (tạo job mới). Không thay đổi hạn mức hoặc luồng Groq.

## Dẫn chứng theo ID và tiếp tục chấm khi retry thủ công

- Backend tạo `evidenceCatalog` từ nguyên văn câu trả lời, mỗi đoạn có ID và questionKey riêng. Gemini trả `evidenceIds`, `evidenceId`, `originalId`; backend kiểm tra ID có tồn tại và thuộc đúng câu rồi chuyển về `evidenceQuotes`, `quote`, `original` trong dữ liệu lưu/API hiện có. Không thay giao diện.
- Áp dụng ID cho dẫn chứng tiêu chí, điểm mạnh/yếu, phần gốc của sửa lỗi và dẫn chứng CEFR tổng hợp. Không áp dụng đề xuất giới hạn một dẫn chứng mỗi tiêu chí; giữ các giới hạn mảng hiện có.
- ID không hợp lệ vẫn bị từ chối với rule `EVIDENCE_ID_INVALID`, không tự tìm đoạn gần giống hay bịa dẫn chứng. Giới hạn retry 8 lần và chờ lỗi đầu ra 20–23 giây vẫn giữ.
- Catalog gồm các đoạn phủ nội dung câu trả lời và thêm các từ/cụm từ để tiện chỉ lỗi. Việc chọn ID không chứng minh nhận xét ngữ nghĩa là đúng: chất lượng nhận xét vẫn cần kiểm định; số token đầu vào có thể tăng do catalog.
- `writing_grading_jobs.last_validation_failure` lưu thông tin lỗi an toàn (stage/rule/path/questionKey/criterion), không lưu raw phản hồi lỗi, trích dẫn hoặc bài làm. Lần tự retry sau đọc thông tin này và tự thêm `repairInstruction` cho đúng Part hoặc bước tổng hợp. Người dùng không nhập chỉ dẫn sửa lỗi.
- Retry thủ công tạo revision/job mới nhưng kế thừa checkpoint Part của job FAILED ngay trước đó trong cùng attempt khi input hash khớp hoàn toàn (gồm bài làm, scope, assistance, model, rubric, prompt, cấu hình). Các Part vẫn được kiểm tra hợp lệ trước khi dùng; kết quả tổng hợp được chạy mới.
- Nếu Part 1–3 đã hợp lệ và Part 4 lỗi, retry tương thích chỉ gọi Part 4 và tổng hợp. Nếu lỗi tổng hợp, chỉ gọi tổng hợp. Nếu input/config không khớp, không kế thừa.
- Chuyển từ prompt v3 sang v4 làm hash khác: các job v3 cũ không được kế thừa sang v4. Không sửa hash/config của job cũ để ép tái sử dụng.
- Local đã chạy migration mới. Lệnh migrate đồng thời áp dụng hai migration có sẵn đang chờ: `AddTopicWorkflow1760000019000` và `ExpandGrammarTopics1760000020000` (bổ sung workflow/catalog topic). Không revert các migration này tự động.
- Test PostgreSQL dùng database `*_test` và schema tạm, AI giả lập; đã kiểm tra retry thủ công giữ 3 Part hợp lệ và chỉ gọi Part 4 + tổng hợp. Không chấm lại bài thật trong lúc triển khai.
