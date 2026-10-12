# Review và kế hoạch sửa AI Writing

Ngày review: 11/10/2026. Phạm vi: code hiện có trong working tree, đối chiếu `AI_WRITING_IMPLEMENTATION_PLAN.md`.

**Trạng thái sau triển khai: đã sửa R1–R6.** Các mục bên dưới giữ bằng chứng của lượt review ban đầu; kết quả sửa và kiểm thử nằm ở mục 6.

## 1. Kết luận

Phát hiện 6 vấn đề mức P2 cần sửa: hai lỗ hổng kiểm tra đầu ra AI, thiếu dữ liệu giới hạn số từ, sai cách đếm retry thủ công, trạng thái lịch sử chưa chính xác và thiếu nhãn hỗ trợ trên trang chi tiết. P2 nghĩa là cần xử lý trong đợt sửa tiếp theo; chưa thấy bằng chứng về lỗi P0/P1 trong phạm vi kiểm tra này.

Các điểm đã làm đúng qua đọc code: dùng snapshot và answers đã khóa; enqueue trong transaction nhưng gọi AI ngoài transaction; kiểm tra owner/component/purpose khi retry; bảo vệ ghi kết quả bằng revision và lease token; Part không trả CEFR; không tự quy CEFR Writing ra điểm /50; Writing có bảng job/provider text riêng, không dùng pipeline audio của Speaking.

Không diễn giải test pass là bằng chứng AI chấm chính xác về chuyên môn. Việc đối chiếu người chấm/dataset vẫn ngoài phạm vi theo yêu cầu trước đó.

## 2. Findings và cách sửa

### R1 — P2: Nhận xét bắt buộc có thể rỗng nhưng vẫn được lưu là COMPLETED

**Vị trí:** `backend/src/features/writing-assessment/services/writing-assessment-validator.service.ts:32`; helper `text()` trong `contracts/writing-assessment.schema.ts`.

Validator chỉ kiểm tra kiểu string và chiều dài tối đa. Không kiểm tra nội dung sau trim. Các trường `summary.overallComment`, `partSummaries[].comment`, `details.parts[].overview`, `questions[].comment`, `criteria[].comment` đều có thể là chuỗi rỗng/khoảng trắng. Khi đó worker vẫn lưu kết quả thành công; người học không nhận được nhận xét theo yêu cầu và không được retry kết quả COMPLETED.

**Đã tái hiện:** lấy `writingFixture(2)`, xóa nội dung các trường trên, đặt evidenceQuotes thành mảng rỗng; `WritingAssessmentValidator.validate()` chấp nhận (`empty_required_feedback_accepted true`). Không gọi Gemini.

**Sửa:**

1. Phân biệt chuỗi bắt buộc có nội dung với chuỗi nullable trong contract; bổ sung kiểm tra `trim().length > 0` cho các nhận xét bắt buộc.
2. Áp dụng tương tự cho nội dung của một finding/suggestion/correction đã được khai báo: nếu có phần tử thì comment/explanation không được rỗng. Không bắt mọi mảng phải có phần tử: bài tốt có thể không có lỗi sửa.
3. Giữ `suggestedRevision`, `cefr.rationale` nullable theo nghiệp vụ; không thêm lời nhận xét giả chỉ để vượt validation.
4. Lỗi này đi qua cơ chế invalid-output retry hiện có. Không lưu COMPLETED nếu chưa có đủ nội dung bắt buộc.

**Test nghiệm thu:** chuỗi rỗng và chỉ khoảng trắng ở từng nhóm trường đều bị từ chối; bài trắng do backend sinh và bài tốt có mảng corrections rỗng vẫn hợp lệ; worker chỉ ghi COMPLETED sau khi response hợp lệ.

### R2 — P2: Câu bỏ trống vẫn có thể nhận lỗi ngữ pháp/từ vựng bịa

**Vị trí:** `backend/src/features/writing-assessment/services/writing-assessment-validator.service.ts:128` và `:131`.

Nhánh BLANK cấm strengths/corrections/suggestedRevision và kiểm tra judgments, nhưng không kiểm tra loại weakness. `findings()` chỉ duyệt evidence; một weakness có `evidence: []` luôn vượt qua bước này. Với bài Full có một câu trắng, AI có thể gán cho câu đó weakness GRAMMAR “Sai thì động từ” dù không có chữ nào để đánh giá. Trường hợp toàn bài trắng không bị vì backend tự sinh phản hồi; trường hợp **một phần bài trắng** vẫn gọi AI và bị ảnh hưởng.

**Đã tái hiện:** fixture Full, đặt `p1:q1` trắng, các judgments đúng quy tắc BLANK, xóa corrections/revision, thêm weakness GRAMMAR với evidence rỗng; validator chấp nhận (`invented_blank_grammar_accepted true`).

**Sửa:**

1. Câu BLANK chỉ được ghi vấn đề chưa trả lời ở TASK/taskIssues; từ chối weakness GRAMMAR/VOCABULARY/COHERENCE/REGISTER/MECHANICS gán cho câu trắng.
2. Với câu có nội dung, các nhận định về lỗi ngôn ngữ cụ thể cần bằng chứng thực sự; cho phép vấn đề thiếu nội dung TASK không có trích dẫn, vì không thể trích một ý chưa viết.
3. Không suy rộng thành cấm mọi góp ý cho câu trắng. Vẫn cho phép hướng dẫn bắt đầu trả lời câu hỏi.
4. Bổ sung quy tắc vào prompt cùng validator để giảm retry không cần thiết.

**Test nghiệm thu:** Full có câu trắng không lưu lỗi ngôn ngữ bịa; weakness TASK hợp lệ không bị từ chối; trích dẫn sai câu bị từ chối; bài có lỗi ngữ pháp thực với trích dẫn đúng vẫn được chấp nhận.

### R3 — P2: Giới hạn số từ luôn null, không khớp yêu cầu người học nhìn thấy

**Vị trí:** `backend/src/features/writing-assessment/services/writing-input-builder.service.ts:64`; `prompts/writing-system-v1.ts`; `frontend/src/features/writing/utils/writingAttemptPaper.js` và `pages/WritingPartPage.jsx:125`.

Frontend hiển thị hướng dẫn số từ cho từng Part, nhưng input builder luôn gán `minimumWords: null`. Ngay cả khi instruction ghi rõ “Write 20-30 words.”, payload vẫn có minimumWords null. Prompt còn yêu cầu không tự đặt giới hạn khi giá trị này null; validator đổi TOO_SHORT về ANSWERED trong trường hợp null. Như vậy nhánh TOO_SHORT không thể hoạt động trên input đang được tạo; hệ thống không truyền được yêu cầu độ dài nhất quán để AI nhận xét.

**Đã tái hiện:** fixture Part 2 với instruction “Write 20-30 words.” và response “Hello”: payload có `wordCount: 1`, `minimumWords: null`.

**Sửa:**

1. Thêm metadata giới hạn từ vào nội dung đề/snapshot cho từng câu hoặc loại task: minimum, maximum và tính chất `guidance` hay `required`. Giới hạn ký tự chống payload lớn hiện có không thay thế giới hạn từ.
2. Frontend và input builder cùng đọc metadata này; không duy trì hai bộ số độc lập. Part 4 phải tách email thân mật và trang trọng.
3. Đề mới lưu giới hạn rõ ràng khi publish. Với snapshot cũ không có metadata, giữ null nếu không xác định chắc chắn; không sửa snapshot cũ hàng loạt và không áp mặc định mới hồi tố.
4. Nếu hỗ trợ đọc yêu cầu từ instruction cũ, chỉ nhận dạng các mẫu rõ ràng, có test riêng; trường hợp mơ hồ phải giữ null. Không dùng regex rộng tự suy mọi con số trong đề là số từ.
5. Đưa thiếu/vượt độ dài vào TASK theo đúng yêu cầu bài; không biến ngắn hơn minimum thành A1 hoặc công thức tính CEFR. Không xóa đánh giá GRAMMAR/VOCABULARY của phần đã viết.
6. Cập nhật version input/rubric khi thay đổi chính sách; job đang chờ phải dùng chính sách tương thích với hash/config đã lưu, tránh tự gây `WRITING_INPUT_CHANGED` sau deploy.

**Test nghiệm thu:** ở dưới/đúng/trên giới hạn của từng Part; hai email có giới hạn khác nhau; đề không khai báo giới hạn vẫn null; frontend hiển thị đúng dữ liệu backend; câu ít từ vẫn có nhận xét nhưng không tự bị gán CEFR thấp.

### R4 — P2: Cho phép lần retry thủ công thứ tư khi job đầu nằm ngoài cửa sổ 24 giờ

**Vị trí:** `backend/src/features/writing-assessment/repositories/writing-grading-jobs.repository.ts:180–186`.

Code đếm **mọi job** tạo trong 24 giờ và chặn khi count >= 4. Cách này tương ứng 1 lần đầu + 3 retry chỉ khi job đầu cũng nằm trong cửa sổ. Nếu bài đã thất bại từ hơn 24 giờ trước, sau ba retry mới count chỉ bằng 3, nên lần retry thủ công thứ tư vẫn được phép. Mỗi revision lại có thể gọi provider nhiều lần; đây là sai giới hạn quota đã đặt trong kế hoạch.

**Bằng chứng kiểm tra tĩnh:** job đầu ở T-25h; ba job retry ở T-3h, T-2h, T-1h; truy vấn trả `recent=3`, cooldown đã qua, điều kiện `3 >= 4` sai nên enqueue tiếp.

**Sửa:**

1. Đếm số job retry trong 24 giờ, loại job đầu tiên của attempt dựa trên thứ tự job thực tế. Không giả định revision đầu là 1 vì enqueue dùng revision hiện tại + 1.
2. Có thể dùng CTE xác định job đầu tiên rồi lọc các job còn lại; không cần bảng thống kê mới. Nếu chọn thêm cột loại enqueue thì phải có migration/backfill rõ ràng.
3. Chặn khi đã có 3 retry thủ công; giữ transaction/khóa attempt để chống hai request vượt hạn mức đồng thời.
4. Dùng thời gian DB nhất quán cho cửa sổ và cooldown; trả thông tin thời điểm có thể retry nếu phù hợp. Không thay chính sách retry Speaking.

**Test nghiệm thu PostgreSQL:** job đầu trong và ngoài cửa sổ; ba retry được phép, lần thứ tư bị chặn; retry tự động không tính thành manual retry; ranh giới 24 giờ; hai request đồng thời chỉ tạo một revision.

### R5 — P2: Lịch sử báo đang chấm cả khi FAILED hoặc chưa bật AI

**Vị trí:** `frontend/src/features/profile/pages/LearningHistoryPage.jsx:50`.

`assessmentPending = component === 'WRITING' && gradingStatus !== 'COMPLETED'` gom FAILED và NOT_STARTED vào cùng trạng thái đang chấm. Người học có job thất bại sẽ tiếp tục thấy thông báo chờ, trong khi backend đã dừng và cần retry. Bài nộp lúc AI tắt cũng bị hiển thị đang chờ dù không có job. Đây là phần tích hợp consumer lịch sử còn thiếu; dòng code có từ trước thay đổi Writing AI nhưng cần được cập nhật cho luồng mới.

**Sửa:**

1. Pending chỉ gồm QUEUED/PROCESSING. FAILED/PARTIAL_FAILED và NOT_STARTED phải có nhãn riêng bằng i18n Việt/Anh.
2. COMPLETED với CEFR null vẫn là hoàn thành, không phải lỗi/chờ chấm; Part không có CEFR theo thiết kế.
3. Với CEFR Writing, nhãn lịch sử phải nói rõ là ước lượng; giữ cách diễn đạt của kỹ năng khác theo contract hiện tại.
4. Không thêm polling hàng loạt các attempt trong lịch sử; dùng thao tác tải lại hoặc cơ chế tải danh sách hiện có.

**Test nghiệm thu:** render bảng trạng thái QUEUED/PROCESSING/FAILED/NOT_STARTED/COMPLETED; Full thiếu bằng chứng và Part hoàn thành không hiện pending; kiểm tra cả desktop/mobile và hai ngôn ngữ.

### R6 — P2: Trang chi tiết Full Practice không báo đã xem bài mẫu

**Vị trí:** `frontend/src/features/writing/pages/WritingResultDetailPage.jsx:147`; đối chiếu `WritingResultPage.jsx:63` và `LearningHistoryPage.jsx:40`.

Nhãn đã dùng hỗ trợ chỉ nằm trong `WritingAiSummary` trên trang tổng quan. Trang chi tiết render `WritingCefr` nhưng không hiển thị `summary.result.assistance.revealedKeys`. Trong khi đó, lịch sử Practice dẫn thẳng đến trang chi tiết. Vì vậy luồng bình thường từ lịch sử có thể hiển thị CEFR của bài Full đã xem mẫu mà thiếu thông tin quan trọng này, dù server đã lưu assistance.

**Sửa:**

1. Tách thành component nhãn hỗ trợ dùng được ở cả hai trang, đặt gần phần CEFR/đánh giá tổng quan.
2. Đọc dữ liệu assistance đã lưu; không suy đoán từ query param hay tự hạ CEFR khi có hỗ trợ.
3. Có thể đánh dấu từng câu đã xem mẫu dựa trên key để người học đối chiếu. Full và Part đều cần nhãn nếu có hỗ trợ.
4. Trang chi tiết nên đồng thời hiện ngôn ngữ của feedback đã lưu, tránh hiểu nhầm khi người học đổi ngôn ngữ giao diện sau lúc nộp.

**Test nghiệm thu:** đi từ lịch sử Practice thẳng vào detail với revealedKeys có dữ liệu thì hiện nhãn; không có revealedKeys thì không hiện; Exam không tự hiện nhãn; việc đổi tab bài mẫu sau khi đã nộp không được tính là đã dùng hỗ trợ lúc làm bài.

## 3. Thứ tự triển khai thành task nhỏ

| Task | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| T1 | R1: nội dung nhận xét bắt buộc | Unit tests âm tính cho empty/whitespace và worker invalid-output |
| T2 | R2: policy câu trắng và evidence | Mixed blank/nonblank hợp lệ; không lưu nhận xét ngôn ngữ bịa |
| T3 | R4: giới hạn manual retry | Integration DB xác nhận tối đa 3 retry/24h, concurrency và cooldown |
| T4 | R3: contract giới hạn từ | Snapshot/UI/AI dùng dữ liệu thống nhất; tương thích snapshot/job cũ |
| T5 | R5: trạng thái lịch sử | State matrix và nhãn Việt/Anh đúng |
| T6 | R6: nhãn hỗ trợ ở trang chi tiết | Browser test đi từ lịch sử Practice |
| T7 | Hồi quy và tài liệu | Writing/Speaking tests, typecheck/build, cập nhật runbook/progress |

Mỗi task nên có commit riêng khi được yêu cầu commit. Không gom sửa provider/worker Speaking vào các task này; không chấm lại các bài COMPLETED hàng loạt. Kết quả cũ không đạt validator mới cần được xử lý bằng công cụ/migration riêng nếu sau này có yêu cầu, không tự phát sinh gọi AI khi đọc kết quả.

## 4. Các giới hạn cần ghi nhận, chưa tính là lỗi mới trong 6 findings

- `PracticeAttemptsService.reveal()` chưa ghi dấu đã xem mẫu ở server; `complete()` tin `dto.revealedKeys`. Đây là thiết kế có sẵn của Practice, nên nhãn hiện tại phản ánh khai báo client, không phải nhật ký xác minh độc lập. Nếu cần dùng CEFR Practice làm căn cứ chính thức, phải bổ sung lưu assistance phía server và xử lý race reveal/complete trong task riêng có hồi quy các kỹ năng khác. R6 sửa việc không hiển thị dữ liệu đã có, không mặc nhiên giải quyết tính xác thực của dữ liệu đó.
- Job lưu prompt/rubric version nhưng assessor hiện dùng hằng prompt đang chạy. Khi phát hành rubric mới, cần dispatch đúng version hoặc drain job cũ trước deploy; không gắn metadata version cũ cho nội dung prompt mới. Hiện chỉ có v1 nên chưa khẳng định có job thực tế bị chấm sai version.
- Test UI hiện chủ yếu dùng dữ liệu đã COMPLETED. Cần bổ sung pending → completed, FAILED → retry → completed, lỗi mạng và refresh detail; chưa có bằng chứng từ bộ test đó rằng các chuyển trạng thái đều được kiểm tra.
- Chưa kiểm định chất lượng CEFR bằng người chấm/dataset; schema/evidence validation không chứng minh được nhận xét đúng chuyên môn.

## 5. Kiểm tra của lượt review này

- Đọc kế hoạch, input builder, prompt/rubric, schema/validator, provider, coordinator, worker, repository/migration, các điểm nối submit/expiry/Practice, presenter, polling, hai trang kết quả, lịch sử và dashboard.
- `npm run test:writing`: **4 suites, 23 tests pass**. Các test hiện có chưa bắt được R1/R2; đã chạy thêm hai phép tái hiện trực tiếp trên validator và một phép kiểm tra input builder, tất cả dùng fixture cục bộ.
- Hồi quy Speaking/assessment-flow: **6 suites, 57 tests pass** (config, provider, repository, policy, finalizer và assessment-flow).
- Backend `npm run typecheck`: **pass**. `git diff --check`: **pass** trên diff tracked hiện có.
- Không gọi Gemini/Groq thật, không đọc/in API key, không sửa `.env`, không migrate/chấm lại dữ liệu, không sửa code ứng dụng hoặc tự commit trong lượt review.

Phạm vi xác minh: findings R1/R2/R3 có tái hiện bằng code chạy cục bộ; R4/R5/R6 được xác định từ điều kiện và đường dữ liệu trong source, chưa chạy browser/DB scenario riêng ở lượt này. Không dùng kết quả test từ phiên trước để thay cho kiểm tra hiện tại.

## 6. Kết quả triển khai bản sửa

- R1: schema có minimum length, validator kiểm tra chuỗi sau trim; mảng rỗng và trường nullable vẫn theo nghiệp vụ. Test worker xác nhận phản hồi rỗng không được finish và chỉ có một retry invalid output.
- R2: mọi finding ngôn ngữ cần evidence; câu trắng chỉ có weakness TASK. Có test bài Full chỉ trắng một câu và đối chiếu trích dẫn thật.
- R3: `wordLimits` theo từng câu lưu trong JSONB part_contents/snapshot (không cần migration mới). Đề mới có metadata guidance mặc định; chỉ mẫu rõ ràng `Write N–M words` được đọc thành required. Snapshot cũ không đủ thông tin giữ null; hai email đọc từng prompt. Backend gửi minimum/maximum/policy, frontend lấy đúng dữ liệu paper, không giữ bộ số hardcode riêng.
- Job mới dùng input/rubric/prompt v2. Worker dựng lại input v1 cho job cũ không có inputVersion và dùng prompt v1; kiểm thử PostgreSQL xác nhận job v1 hoàn thành mà không lỗi hash. Prompt v2 vẫn giữ CEFR độc lập và không quy số từ thành mức năng lực.
- R4: chỉ đếm revision retry trong 24 giờ, loại revision nhỏ nhất của attempt; cooldown dùng thời gian PostgreSQL. Integration xác nhận ba retry rồi chặn lần thứ tư cả khi job đầu đã ngoài cửa sổ, revision đầu khác 1, retry tự động không tính là manual và hai request cạnh tranh chỉ một request được enqueue.
- R5: lịch sử hiển thị nhãn riêng cho từng gradingStatus, CEFR Writing ghi rõ ước lượng. Có test bảng trạng thái Việt/Anh, không ảnh hưởng nhãn Speaking.
- R6: component `WritingFeedbackContext` dùng chung hai trang; detail hiển thị locale đã chấm và nhãn hỗ trợ từ result lưu sẵn. Browser test mở thẳng detail, Full/Part Practice, có/không trợ giúp, Exam, desktop/mobile và đổi tab sample sau submit.

Kiểm thử sau sửa: Writing/provider 6 suites/40 tests; content và Speaking regression 7 suites/66 tests; WritingTestsService 4 tests; frontend suite 81 tests; Writing/history unit 7 tests (có test trùng với suite tổng); browser UI và PostgreSQL integration đều pass. Typecheck và build backend/frontend pass. Frontend lint có cảnh báo sẵn có nhưng không có error; backend lint phạm vi sửa pass.

Không gọi Gemini/Groq thật trong lượt sửa, không thay key/env, không chạy migration hoặc sửa dữ liệu học viên; integration dùng database test riêng và schema tạm. Chưa commit/push. Các giới hạn trong mục 4 vẫn được ghi nhận, chưa mở rộng thành chức năng mới.
