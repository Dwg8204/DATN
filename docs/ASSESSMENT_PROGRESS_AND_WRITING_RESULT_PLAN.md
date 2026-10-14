# Kế hoạch thanh tiến độ chấm bài, kết quả Writing và feedback tiếng Việt

Ngày lập: 14/10/2026. Cơ sở: code sau khi merge develop tại `1fff37f`.
Trạng thái: đã triển khai code ngày 14/10/2026; xem kết quả kiểm tra bên dưới.

## 1. Mục tiêu và phạm vi

1. Hiển thị thanh tiến độ có phần trăm cho luồng nộp/chấm bài của cả 5 kỹ năng, áp dụng Exam và Practice, Full và từng Part.
2. Với Writing Full: trang tổng quát hiển thị trình độ **CEFR**, nhận xét tổng quát toàn bài và thông tin lần làm bài; toàn bộ nhận xét theo Part/câu hỏi nằm ở trang chi tiết.
3. Với Writing Part: trang tổng quát có nhận xét chung của Part đã làm, không có CEFR; chi tiết của Part và câu hỏi nằm ở trang chi tiết.
4. Toàn bộ phần AI nhận xét/giải thích cho Writing và Speaking mới chấm phải bằng tiếng Việt, độc lập ngôn ngữ giao diện.

Grammar & Vocabulary, Reading và Listening hiện chấm theo đáp án bằng ObjectiveGraderService. Chúng dùng cùng giao diện tiến độ nhưng nhãn là “Đang chấm bài”; Writing/Speaking dùng “Đang chờ AI” hoặc “AI đang chấm bài”. Không mở rộng ba kỹ năng khách quan sang chấm AI trong task này.

## 2. Hiện trạng đã kiểm tra

- `AttemptPageState` chỉ thể hiện spinner khi đang tải API.
- Writing dùng `WritingAssessmentStatus` ở trang tổng quát và chi tiết, hiện thông báo chữ theo QUEUED/PROCESSING/FAILED; chưa có thanh phần trăm.
- `useWritingAssessmentPolling` kiểm tra sau 3–10 giây, giới hạn khoảng 2 phút và có nút kiểm tra lại.
- Speaking dùng `useAttemptResult`, kiểm tra mỗi 5 giây, tối đa 60 lần; trang hiện thông báo chung, chưa phân biệt rõ xếp hàng/xử lý.
- WritingAiSummary đang hiển thị overallComment, partSummaries và priorities ngay trên trang tổng quát.
- Writing lưu chi tiết từng Part/câu hỏi trong kết quả; presenter đã tách response summary và detail. Không cần gọi AI lần hai để mở trang chi tiết.
- Prompt Writing hiện chọn tiếng Việt/Anh theo feedbackLocale. Config snapshot và input hash của job cần được giữ nhất quán khi đổi chính sách ngôn ngữ.
- Provider AI trả kết quả một lần; hiện không có phần trăm xử lý thật từ Gemini.

## 3. Thiết kế thanh phần trăm

### 3.1. Ý nghĩa và nguyên tắc

Thanh hiển thị **tiến độ ước lượng của quá trình nộp/chấm bài**, có nhãn “Tiến độ ước lượng”. Không thể suy ra chính xác phần trăm AI đã đọc/chấm từ thời gian chờ hoặc số token.

| Trạng thái UI | Phần trăm đề xuất | Điều kiện và thông báo |
| --- | --- | --- |
| SUBMITTING | 0–10% | Đang lưu và nộp bài; chặn nộp trùng |
| LOADING_RESULT | 10–15% | Đang kiểm tra kết quả trên máy chủ |
| QUEUED | 15–25% | Đã lưu bài, đang chờ đến lượt chấm |
| PROCESSING | 25–90% | AI đang đánh giá bài làm; tăng chậm theo thời gian |
| LONG_WAIT | Giữ mức hiện tại, tối đa 95% | Đang chờ lâu hơn dự kiến; cho phép kiểm tra lại |
| COMPLETED | 100% | Máy chủ xác nhận chấm xong và kết quả hợp lệ đã tải về |
| PAUSED / DISABLED | Dừng, bỏ animation | Chấm AI tạm dừng/chưa bật; bài đã được lưu |
| FAILED / PARTIAL_FAILED | Dừng, hiển thị lỗi | Không tự đưa về 100%; giữ bài làm và cho thao tác phù hợp |
| CONNECTION_ERROR | Dừng, báo kết nối | Chưa biết kết quả chấm; không kết luận AI thất bại |

- Các khoảng phần trăm là quy ước UX, không phải SLA hay đo lường thực tế.
- Trong một lượt chấm, % không giảm. Nếu backend chuyển PROCESSING về QUEUED do retry tự động, giữ mức hiện tại và đổi thông báo thành đang thử lại/chờ dịch vụ.
- Retry thủ công tạo lượt hiển thị mới khi server xác nhận nhận yêu cầu; chỉ reset khi có bằng chứng lượt chấm mới, không reset sau mỗi lần polling.
- Bài khách quan có thể đi thẳng tới 100% ngay sau submit thành công. Không giữ người dùng chờ giả để chạy hết animation.
- Khi vào lại kết quả đã chấm, hiển thị kết quả ngay, không phát lại màn hình chờ.
- Không hiển thị countdown, thời gian hoàn thành cam kết hoặc số câu đã chấm khi backend chưa cung cấp dữ liệu đó.

### 3.2. Bố cục hiển thị

- Trong lúc gửi bài: panel tiến độ nổi trên vùng làm bài, vô hiệu nút nộp; có tiêu đề, số %, thanh tiến độ và mô tả bước hiện tại. Không thể tự đóng để gửi thêm request.
- Sau khi server đã lưu bài: chuyển sang trang kết quả, hiển thị panel cùng thiết kế ở vị trí đầu trang. Người dùng có thể rời trang hoặc xem lại bài đã nộp; chấm tiếp tục ở backend.
- Chỉ một panel hoạt động tại mỗi thời điểm; tránh panel của submit và result chồng nhau.
- Trang kết quả chi tiết Writing/Speaking cũng dùng panel này khi mở trực tiếp trong lúc chấm.
- Hỗ trợ màn hình nhỏ, dark mode và `prefers-reduced-motion`.
- Dùng `role="progressbar"`, `aria-valuemin/max/now`, tên mô tả; thông báo bước qua vùng `aria-live="polite"`. Không đọc lại từng % bằng screen reader.

### 3.3. Component và hook dùng chung

Đề xuất dưới `frontend/src/features/test-attempts/`:

- `components/AssessmentProgress.jsx` và CSS module: panel hiển thị, nhận trạng thái và tiến độ, không tự gọi API.
- `hooks/useAssessmentProgress.js`: tính % ước lượng, animation, reset theo attempt/lượt chấm, cleanup timer.
- `utils/assessmentProgress.js`: chuẩn hóa trạng thái và quy tắc giới hạn phần trăm, có thể kiểm thử độc lập.
- Một adapter chuẩn hóa dữ liệu từ Writing/Speaking và kết quả khách quan; giữ API riêng của mỗi loại attempt.

Đầu vào tối thiểu: attemptId, component, submissionState, gradingStatus, resultReady, assessmentRevision, enabled nếu có, lỗi kết nối, retrying và callback phù hợp. Không suy luận “AI bị tắt” chỉ từ việc bài chờ lâu.

Tận dụng trạng thái `submitting` trong TestAttemptContext/PracticeAttemptContext và frame dùng chung. Kiểm tra tất cả route thực tế của 5 kỹ năng trước khi gắn panel, bao gồm trường hợp trang không đi qua SharedAttemptFrame.

## 4. Đồng bộ và polling

1. Chuẩn hóa trạng thái UI trước; status backend là nguồn quyết định hoàn tất/thất bại. Timer chỉ làm mượt %.
2. Giữ cơ chế không gọi request chồng, hủy khi unmount/đổi attempt, bỏ qua response cũ. Cô lập key theo attemptId + Exam/Practice.
3. Đồng bộ trải nghiệm Writing và Speaking: polling có backoff 3–10 giây, tạm ngừng khi tab ẩn, kiểm tra ngay khi tab hiện lại.
4. Đề xuất hết phiên tự kiểm tra sau 5 phút thì chuyển LONG_WAIT, hiện rõ “Tự động kiểm tra đã tạm dừng” và nút “Kiểm tra lại”; không coi đó là timeout của job backend. Nút mở phiên polling mới.
5. Lỗi mạng sau khi có dữ liệu phải hiện thông báo kết nối bên cạnh trạng thái đã biết; không tiếp tục tăng % như thể chắc chắn đang xử lý.
6. COMPLETED chỉ chuyển 100% khi response kết quả đủ để render. Khi chấm xong nhưng tải detail lỗi, hiển thị lỗi tải chi tiết riêng.
7. FAILED/PARTIAL_FAILED/disabled dừng polling tùy trạng thái và hiện hành động thực sự được backend hỗ trợ. Writing dùng retry hiện có và giới hạn cooldown/quota của server; không thêm nút retry Speaking khi chưa có API tương ứng.
8. Speaking chưa đồng ý gửi audio phải hiện bước xác nhận đang có; không mô tả AI đang chấm khi còn cần thao tác của người dùng.
9. Nếu cần thêm thông tin enabled/retryable cho Speaking, bổ sung trường đọc vào response hiện có sau khi kiểm tra contract. Không tạo endpoint tiến độ mới chỉ để trả % giả.

## 5. Bố cục Writing tổng quát

### 5.1. Full Writing

Thứ tự nội dung:

1. Tiêu đề đề, nhãn Full Writing và trạng thái lần làm bài.
2. Panel tiến độ khi chưa chấm xong hoặc thông báo lỗi/tạm dừng.
3. Khi hoàn tất: hàng tổng quan gồm thẻ CEFR nổi bật và thẻ thông tin (thời gian, số câu trả lời, loại bài).
4. Khối rộng “Đánh giá chung của AI”: overallComment và các ưu tiên cải thiện chung toàn bài. Không có card Part hoặc nhận xét từng câu.
5. Nút chính “Xem kết quả chi tiết”, nút phụ “Làm bài khác”.

Desktop dùng hai cột ở hàng tổng quan; phần feedback toàn bài chiếm toàn chiều rộng. Mobile xếp một cột với CEFR trước. Dùng biến theme, khoảng cách 16–24px và chiều rộng nội dung khoảng 1000–1100px.

CEFR là trình độ ước lượng, không tạo điểm /50 mới. Hiển thị rationale ngắn và hạn chế đánh giá khi có. Nếu không đủ bằng chứng, hiển thị “Chưa đủ dữ liệu để ước lượng CEFR”, không gán A1 hay 0. Trong lúc chờ, dùng placeholder, không hiện trình độ giả.

### 5.2. Writing theo Part

- Bỏ thẻ CEFR hoàn toàn, kể cả placeholder CEFR.
- Hiển thị thông tin lần làm và nhận xét tổng quan của Part đã làm.
- Chi tiết tiêu chí, điểm mạnh/yếu, sửa lỗi và gợi ý nằm ở trang chi tiết.
- Giữ nhãn đã xem gợi ý/bài tham khảo đối với Practice có hỗ trợ.

### 5.3. Tách nội dung trong code

- Sửa `WritingAiSummary` bỏ vòng lặp partSummaries khỏi trang tổng quát.
- `WritingResultPage` tổ chức lại CEFR, metadata và overall feedback; CSS responsive/dark mode tương ứng.
- `WritingResultDetailPage` đưa comment của Part đang chọn vào đầu khối đánh giá Part, kế tiếp overview, strengths, weaknesses, suggestions và đánh giá từng câu.
- Nếu partSummaries và part.overview trùng nội dung, hiển thị một phần tổng quan rõ ràng, tránh lặp hai đoạn giống nhau.
- Giữ bài làm gốc, bản sửa gợi ý và bài tham khảo; số Part thực tế dựa trên scope/snapshot.
- Ban đầu giữ contract summary/partSummaries hiện có để tương thích. Chuyển nơi hiển thị, không xóa dữ liệu khỏi kết quả lưu hoặc gọi lại AI.

## 6. Feedback tiếng Việt

### 6.1. Phạm vi ngôn ngữ

| Nội dung | Ngôn ngữ |
| --- | --- |
| Nhận xét chung/Part/câu, lý do CEFR, hạn chế, điểm mạnh/yếu, giải thích ngữ pháp/từ vựng, taskIssues và gợi ý | Tiếng Việt tự nhiên |
| Bài làm gốc, evidence quote, correction.original | Giữ nguyên văn tiếng Anh của người học |
| correction.replacement, suggestedRevision và ví dụ tiếng Anh được đề xuất | Tiếng Anh; giải thích đi kèm bằng tiếng Việt |
| Transcript Speaking | Tiếng Anh theo lời nói; feedback và lý do đánh giá bằng tiếng Việt |
| JSON keys, enum tiêu chí, trạng thái, nhãn CEFR | Giữ schema kỹ thuật; giao diện dịch nhãn khi hiển thị |

“Toàn bộ feedback tiếng Việt” áp dụng cho văn bản nhận xét, không dịch mất câu tiếng Anh cần sửa hay bằng chứng để đối chiếu.

### 6.2. Writing

1. Ép feedbackLocale='vi' tại điểm tạo config snapshot/job mới và các lượt retry theo chính sách mới; không phụ thuộc ngôn ngữ tài khoản hoặc locale gửi từ frontend.
2. Thêm prompt version mới, ví dụ `writing-prompt-v3`, với danh sách trường phải dùng tiếng Việt và ngoại lệ tiếng Anh được nêu rõ.
3. Thêm ví dụ JSON ngắn về lỗi ngữ pháp: câu trích dẫn/sửa bằng tiếng Anh, explanation bằng tiếng Việt. Giữ mọi ràng buộc evidence, câu trắng, wordLimits và Full/Part hiện tại.
4. Cập nhật dispatch prompt theo version tường minh. Không để mọi version khác v1 tự động dùng v2 như hiện tại.
5. Giữ cách đọc các snapshot v1/v2 đã tạo. Không sửa riêng locale của job cũ vì sẽ làm lệch input_hash; nếu đổi snapshot khi retry phải xây dựng lại input/hash nhất quán trong transaction và tuân thủ khóa job.
6. Rà soát fallback cho bài trắng và lỗi để cũng trả mô tả tiếng Việt.

### 6.3. Speaking

- Tìm định nghĩa SPEAKING_RUBRIC/SPEAKING_PROMPT_VERSION đang được provider sử dụng, rà soát tất cả trường feedback/cefrReason và siết chỉ dẫn tiếng Việt.
- Tăng prompt version khi thay đổi; giữ transcript tiếng Anh và đánh giá dựa trên audio/bằng chứng như hiện tại.
- Rà soát cache `__assessment`: không tái sử dụng cache từ prompt cũ như kết quả version mới. Cache hit/miss phải tôn trọng version đã lưu; không xóa transcript hợp lệ chỉ vì đổi ngôn ngữ nhận xét.

### 6.4. Kiểm soát output và dữ liệu cũ

- Validator bắt buộc locale đúng snapshot, nội dung không rỗng và schema/evidence hợp lệ. Cờ locale='vi' không tự chứng minh mọi câu đã bằng tiếng Việt.
- Dùng fixture và kiểm thử mẫu thật để kiểm tra ngôn ngữ từng trường. Không dùng quy tắc “phải có dấu tiếng Việt” để loại câu: các thuật ngữ, CEFR và trích dẫn có thể không có dấu.
- Nếu sau kiểm thử cần cơ chế sửa ngôn ngữ tự động, thiết kế retry giới hạn và chi phí rõ ràng; không thêm vòng gọi AI không giới hạn trong MVP.
- Kết quả cũ vẫn được hiển thị theo dữ liệu đã lưu; prompt mới chỉ tác động lần chấm mới. Không tự chấm lại hàng loạt hoặc dịch đè bài cũ trong task này.

## 7. Database và API

- Không cần bảng mới hoặc migration cho thanh % ước lượng và đổi bố cục.
- Tận dụng grading_status, assessment_revision, result JSONB và config_snapshot hiện có.
- Không lưu % animation vào DB. Khi reload, suy ra mức hiển thị theo trạng thái server; không cam kết khôi phục đúng số % của tab trước.
- Chỉ thêm metadata phản ánh trạng thái thật vào response nếu cần để phân biệt chờ xác nhận/tạm dừng; mọi bổ sung API phải tương thích caller cũ.
- Không thay đổi công thức chấm khách quan, rubric CEFR, schema câu trả lời hay chế độ lưu bài.

## 8. Thứ tự triển khai

1. Lập bảng route và contract của submit/result/detail cho 5 kỹ năng; xác định trạng thái terminal, lỗi và consent Speaking.
2. Xây state adapter, chính sách phần trăm và component dùng chung; kiểm thử quy tắc 100%, retry, dừng khi lỗi.
3. Gắn tiến độ vào Exam/Practice submit và trang kết quả cả 5 kỹ năng; thống nhất polling Writing/Speaking.
4. Sửa bố cục Writing tổng quát và chuyển nhận xét Part sang trang chi tiết.
5. Thêm prompt tiếng Việt có version, chuẩn hóa locale job mới và xử lý tương thích snapshot/cache cũ.
6. Kiểm thử chức năng, trình duyệt và build; sửa lỗi phát hiện được, cập nhật handoff/runbook.

Các nhóm commit tiếng Việt đề xuất: “thêm thanh tiến độ chấm bài dùng chung”, “sắp xếp lại kết quả Writing”, “chuẩn hóa feedback AI bằng tiếng Việt”, “bổ sung kiểm thử và tài liệu”.

## 9. Kiểm thử và tiêu chí nghiệm thu

### Logic và tích hợp

- 5 kỹ năng × Full/Part được hỗ trợ × Exam/Practice hợp lệ; EXAM vẫn chỉ Full theo quy tắc hệ thống.
- Bài khách quan: submit nhanh/chậm, lỗi gửi bài, hết giờ tự nộp, không gửi trùng và không gọi AI mới.
- Writing/Speaking: QUEUED → PROCESSING → COMPLETED, lỗi/tạm dừng, retry tự động, mạng mất rồi nối lại, backend chấm xong nhưng GET kết quả lỗi.
- Chỉ hoàn tất 100% khi server và dữ liệu kết quả xác nhận; không vượt 95% khi còn chờ.
- Đổi attempt/route/tab, refresh, mở trang chi tiết trực tiếp, hết phiên polling và kiểm tra lại; không leak timer hoặc hiển thị dữ liệu của attempt trước.
- Speaking cần consent chưa hiển thị “AI đang chấm”; thất bại một phần không được trình bày như thành công toàn bộ.

### Writing và ngôn ngữ

- Full có CEFR hoặc trạng thái thiếu bằng chứng; Part không hiện CEFR.
- Trang tổng quát không có danh sách nhận xét Part/câu; trang chi tiết vẫn có đủ thông tin theo Part và theo câu.
- Giữ hiển thị bài làm gốc, corrections, evidence, bản sửa, mẫu và nhãn Practice có hỗ trợ.
- Đổi UI sang tiếng Anh vẫn tạo feedback mới bằng tiếng Việt.
- Payload provider có đúng prompt version và locale; job cũ vẫn chạy theo snapshot, job mới/retry mới không lệch input_hash.
- Fixture có tiếng Việt trên các trường nhận xét và tiếng Anh trên transcript/câu sửa; kiểm tra bài trắng, thiếu Part và nội dung cố yêu cầu AI trả lời bằng tiếng Anh.
- Kiểm thử mẫu thật: một Writing Full, một Writing Part và một Speaking hợp lệ để đánh giá ngôn ngữ thực tế trong quota hiện có; test mock không thay thế được xác minh này.

### Giao diện và build

- Kiểm tra desktop và mobile khoảng 390px, sáng/tối, bàn phím, screen reader semantics và reduced motion.
- Dùng API giả lập chậm/lỗi để quan sát thanh % mà không tiêu tốn quota AI.
- Chạy test backend liên quan prompt/coordinator/worker/provider; test frontend progress/polling và browser Writing/Speaking; build frontend/backend.
- Bàn giao mô tả tiến độ là ước lượng, quy tắc dừng polling, hành vi dữ liệu cũ và kết quả kiểm thử thực tế.


## 10. Kết quả triển khai — 14/10/2026

- Thêm AssessmentProgress và chính sách % ước lượng dùng chung. Tích hợp overlay lúc submit qua SharedAttemptFrame của cả 5 kỹ năng, loading lúc đọc kết quả và thanh hoàn tất trên trang tổng quát.
- Writing/Speaking có thanh tiến độ trên trang tổng quát và chi tiết; consent Speaking vẫn là bước riêng trước khi hiển thị tiến độ AI.
- Chung hook useAssessmentPolling: không gọi chồng, hủy request cũ, phân biệt Exam/Practice và attempt, dừng khi tab ẩn, dừng sau 5 phút với thông báo và nút kiểm tra lại. Lỗi mạng giữ bài làm và hiện lỗi kết nối.
- Speaking summary API bổ sung assessment.enabled để frontend dừng kiểm tra khi AI bị tắt. Không thêm bảng hoặc migration.
- Writing Full dùng hàng tổng quan CEFR/thông tin bài, feedback toàn bài phía dưới; bỏ card Part khỏi tổng quát và đưa comment Part vào chi tiết. Writing Part vẫn không có CEFR.
- Job Writing mới/retry mới dùng tiếng Việt và writing-prompt-v3. Snapshot v1/v2 cũ giữ cách đọc; coordinator tạo lại input/config nhất quán cho lượt mới.
- Speaking dùng speaking-rubric-v2, nhận xét và qualityFlags bằng tiếng Việt, transcript/câu trích dẫn tiếng Anh. Cache assessment chỉ tái sử dụng khi phiên bản prompt khớp; giữ cache transcript.
- Kiểm thử đã đạt: 85 test frontend chính; 94 test Reading/Practice hồi quy; 68 test backend trên 9 suite liên quan Writing/Speaking và hai service attempt; 2 browser test gồm nhiều trường hợp desktop/mobile, pending/completed, trang tổng quát/chi tiết và dark mode. Build frontend đạt; cảnh báo chunk lớn của Vite vẫn còn.
- Đã xem ảnh render mobile Writing để kiểm tra bố cục. Browser dùng dữ liệu/API giả lập; chưa chạy bài nộp thật qua Gemini/Groq trong lượt này, nên ngôn ngữ response thực tế cần kiểm tra khi test bằng tài khoản dự án.
- Code chưa commit/push trong lượt triển khai này.

Điều chỉnh tiếp ngày 14/10/2026: feedback AI theo câu chỉ render ở tab Bài làm của bạn (Your answer). Tab Bản sửa gợi ý và Bài tham khảo chỉ render nội dung câu trả lời tương ứng trong mỗi card; không lặp lại feedback theo câu.

Feedback theo câu ở tab Your answer dùng accordion native details/summary: mặc định đóng, dấu + để mở và dấu − để đóng; thao tác được bằng bàn phím. Mỗi câu mở/đóng độc lập và khi đổi sang tab khác rồi trở lại thì feedback được thu gọn.
