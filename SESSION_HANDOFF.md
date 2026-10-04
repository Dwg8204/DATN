# Bàn giao ngữ cảnh AptiMate cho phiên chat mới

Cập nhật: 04/10/2026, múi giờ Asia/Bangkok.

## Cách sử dụng và mức độ tin cậy

Đọc toàn bộ file này trước khi tiếp tục công việc. Đây là bản bàn giao lịch sử và quyết định sản phẩm, không phải bằng chứng rằng mọi chức năng đã được kiểm thử lại hôm nay. Code hiện tại, migration đang được sử dụng và yêu cầu mới nhất của người dùng là căn cứ khi có khác biệt.

Phân biệt rõ ba trạng thái: chức năng đã làm theo lịch sử hội thoại; trạng thái đã đọc trực tiếp từ repository ngày 04/10/2026; phương án AI mới đề xuất và chưa triển khai. Không nói rằng AI Writing đã hoạt động hoặc dataset đã được tải.

Không lưu khóa API, nội dung `.env`, thông tin đăng nhập hay dữ liệu học viên trong tài liệu bàn giao.

## 1. Hệ thống và cách làm việc của người dùng

- Dự án: AptiMate, hệ thống luyện tập và thi thử tiếng Anh Aptis.
- Workspace: `E:\Đồ án tốt nghiệp\project`; terminal PowerShell trên Windows.
- Frontend: React 18, Vite, React Router, i18next; code theo `frontend/src/features`.
- Backend: NestJS 11, TypeScript, TypeORM, PostgreSQL; code theo `backend/src/features`.
- Các thành phần: Grammar & Vocabulary, Reading, Listening, Writing, Speaking; admin quản lý đề; lịch sử/kết quả; từ vựng, flashcard, dictation; tài khoản, dashboard, mục tiêu, thông báo.
- Người dùng muốn tiếng Việt tự nhiên, đúng văn phong; không dịch máy móc. Ví dụ Overview → Tổng quan, không phải “Đọc tổng quan”.
- Ưu tiên sửa component dùng chung khi lỗi lặp lại giữa các màn hình.
- Giữ màu sắc/theme hiện tại khi yêu cầu chỉ sửa bố cục. Ảnh minh họa bố cục không mặc nhiên yêu cầu sao chép màu.
- Khi được yêu cầu commit: cập nhật từ nhánh `develop`, giải quyết conflict, commit tiếng Việt theo từng task nhỏ; không gom hàng chục file thuộc nhiều task vào một commit.
- Lần này người dùng chỉ yêu cầu tạo tài liệu bàn giao. Không tự pull, commit, push hoặc sửa các thay đổi đang dở.
- AI Writing là công việc đang được bàn luận; bước gần nhất là tìm dataset kiểm định.

## 2. Trạng thái Git được kiểm tra ngày 04/10/2026

Nhánh: `feature/backend-writing-crud`.

HEAD lúc kiểm tra: `5cb5db8` — `test: bổ sung kiểm thử khôi phục nháp và hướng dẫn sử dụng`.

Các commit gần HEAD cho thấy repository đã tiếp tục phát triển ngoài những chỉnh sửa UI trong lịch sử chat này:

| Commit | Nội dung |
|---|---|
| `5cb5db8` | Kiểm thử khôi phục nháp và hướng dẫn |
| `54ce032` | Giữ ảnh, âm thanh và nội dung khi upload/làm mới |
| `38ceb48` | Giữ thông tin giữa Part, xác nhận thoát trình tạo đề |
| `46199e6` | Lưu và khôi phục nháp đề trên thiết bị |
| `6628678` | Giữ trang tạo đề khi mất kết nối xác thực |
| `ea65938` | Chống tạo đề trùng khi thử lại, kiểm tra phiên bản xuất bản |
| `dced980` | Cho phép lưu nháp chưa hoàn chỉnh |

Thay đổi chưa commit tại thời điểm kiểm tra; phải giữ nguyên và kiểm tra lại trước mọi thao tác Git:

```text
M backend/src/features/grammar-tests/controllers/grammar-tests.controller.ts
M backend/src/features/listening-tests/controllers/listening-tests.controller.ts
M backend/src/features/writing-tests/controllers/writing-tests.controller.ts
M frontend/package.json
M frontend/src/pages/TestListPage.jsx
M frontend/src/routes/appRoutes.jsx
?? backend/src/common/tests/public-catalog.spec.ts
?? frontend/tests/publicCatalog.browser.test.mjs
```

File bàn giao này được thêm sau snapshot trên. Chưa kiểm thử, commit hoặc push những thay đổi đang dở trong lần bàn giao.

Sandbox hiện báo Git dubious ownership. Có thể dùng cấu hình riêng cho mỗi lệnh, không cần sửa global config:

```powershell
git -c safe.directory='E:/Đồ án tốt nghiệp/project' status --short
```

Không suy ra remote đã đồng bộ từ danh sách commit local; chưa fetch/pull trong lần này.

## 3. Những task đã làm trong lịch sử hội thoại

### Tra từ và menu ngôn ngữ

- Chọn ngôn ngữ trên thanh menu: chỉ hiển thị cờ tròn; trong dropdown hiển thị cờ + mã EN/VI, bỏ tên English/Tiếng Việt. English dùng cờ Anh, không phải cờ Mỹ.
- Select/dropdown cần nhỏ gọn, sát nội dung, canh đúng theo trigger; áp dụng component/style dùng chung.
- Popup tra từ bằng double-click; click bên ngoài phải đóng, không bắt người dùng bấm X.
- Nghĩa tiếng Việt ngắn gọn theo từ loại; không để các nghĩa phụ hoặc đoạn định nghĩa tiếng Anh chen vào phần nghĩa tiếng Việt.
- Ví dụ là câu khác, không lấy lại câu trong đề làm ví dụ.
- Đồng nghĩa có pointer và click để tra tiếp; nút look up again phải thực sự refresh.
- Đã xử lý phiên âm hiển thị sai, phát âm và độ trễ theo các vòng sửa; người dùng xác nhận tra từ đã trơn tru trước khi chuyển sang task khác.
- Đã bỏ dòng “Interface preview — the vocabulary API will be connected later.” trong phần thêm từ vào list.
- Người dùng đã tạo Azure Translator thành công ở East Asia, đã đặt key vào env và xác nhận dịch hoạt động. Không sao chép key sang tài liệu/chat.

Code dictionary đọc ngày 04/10/2026:

- `backend/src/features/dictionary/services/dictionary.service.ts` gọi Azure và Wiktionary song song.
- Azure `/dictionary/lookup` lấy bản dịch theo từ loại, back-translations hỗ trợ đồng nghĩa; `/dictionary/examples` lấy ví dụ.
- Wiktionary cung cấp phiên âm, bổ sung nghĩa và đồng nghĩa. Không tuyên bố Azure cung cấp IPA.
- Cache memory TTL 24 giờ, tối đa 500 từ; refresh xóa cache của từ đó.
- Timeout Wiktionary 1,5 giây; Azure lookup cấu hình bị chặn tối đa 3 giây; ví dụ 1,5 giây.
- Chỉ hai nhà cung cấp trong luồng này; không tự đưa Dictionary API/Datamuse/Tatoeba trở lại.
- Frontend: `frontend/src/features/practice/components/DictionaryPopover.jsx` và CSS tương ứng.
- Menu ngôn ngữ: `frontend/src/components/layout/LanguageSelector.jsx` và CSS tương ứng.

### i18n và phân trang

- Đã rà soát nhiều màn hình: menu, phân trang, thông báo, dashboard, mục tiêu, trang chủ và sau đó bổ sung riêng trang đăng nhập.
- Nhãn select trong từng kỹ năng bỏ tiền tố kỹ năng: Reading Overview → Overview; Reading Tests → Tests; tương tự kỹ năng khác.
- Phân trang đồng bộ URL và API; không chỉ đổi UI mà bỏ page param.
- Các điểm bắt đầu: `frontend/src/i18n/index.js`, `frontend/src/features/auth/pages/LoginPage.jsx`, `frontend/src/hooks/useUrlQueryState.js`.
- Không coi việc “đã rà soát” là chứng minh không còn chuỗi tiếng Anh; nếu có báo lỗi mới phải kiểm tra lại màn hình cụ thể.

### Grammar: publish, submit và kết quả

- Đã sửa lỗi publish Full Grammar: “Purpose is not an accepted field.”
- Đã sửa lỗi submit Full Grammar hiện thông báo lỗi server; lịch sử commit có bản sửa enum/câu lệnh submit.
- Kết quả phải hiển thị lựa chọn thực của thí sinh (A/B/C hoặc nội dung), không ghi mỗi “Answered”. Đã mở rộng cả dữ liệu backend và cách hiển thị frontend.
- Grammar Part 2 khi làm bài: chỉnh câu hỏi/đáp án để câu hỏi không bị ép thành cột rất hẹp, xuống dòng liên tục.
- Grammar result detail Part 1: ba đáp án trên cùng hàng, chia width đều; đáp án không chọn vẫn có viền/card nhìn rõ; giải thích phía dưới.
- Grammar result detail Part 2: mỗi từ cần match là card; “Bạn chọn” và “Đáp án đúng” dạng pill; options box bên phải là sticky panel.
- Khung bài làm cả hai Part được thu hẹp, căn giữa; Final score khớp cả mép trái/phải của khung; hai nút Part bám mép trái đó.
- Giữ màu sắc cũ; không dùng nền tối của ảnh minh họa để thay theme.
- Frontend: `frontend/src/features/grammar_vocab/pages/GrammarVocabResultPage.jsx`, `GrammarVocabResultDetailPage.jsx` và styles cùng thư mục.

Các commit của nhóm task này còn xuất hiện trong Git local:

| Commit | Nội dung |
|---|---|
| `e294c83` | Sửa submit/enum casts (theo bàn giao lịch sử) |
| `2eb9111` | Bổ sung lựa chọn thí sinh vào dữ liệu kết quả |
| `388dd43` | Hiển thị đáp án thí sinh trong trang kết quả |
| `de5f721` | Đồng bộ trạng thái phân trang với URL |
| `4717d38` | Bố cục Grammar Part 2 (theo bàn giao lịch sử) |
| `5dafcc5` | Tối ưu bố cục trang kết quả chi tiết |
| `d146167` | Bổ sung tiếng Việt cho trang đăng nhập |

## 4. Luồng làm bài và nguồn dữ liệu cần giữ đúng

- Đề của attempt lấy từ snapshot bất biến; chỉnh đề published không thay nội dung bài đang làm.
- Server là nguồn điểm/kết quả; frontend không tự chấm hoặc bịa điểm trong khi chờ AI.
- Question keys của Writing: Part 1 `p1:q1`…`p1:q5`; Part 2 `p2:q1`; Part 3 `p3:q1`…`p3:q3`; Part 4 `p4:q1` email thân mật, `p4:q2` email trang trọng.
- Writing answer: `{ kind: 'TEXT', text }`.
- Exam dùng autosave, revision và thời gian server. Practice có chính sách riêng: không tự khôi phục/autosave như exam, lưu đáp án cuối khi hoàn thành. Kiểm tra code context/policy hiện tại trước khi thay đổi.
- Nháp trình tạo đề admin là chức năng khác với autosave bài làm của học viên; không nhầm hai luồng.
- Không tự khôi phục tính năng “Learning” đã được loại khỏi định hướng trước đó; cá nhân hóa hướng tới các bài practice/full test hiện có.

Tài liệu đọc trước khi sửa attempt:

- `backend/src/features/test-attempts/README.md`
- `frontend/src/features/test-attempts/README.md`
- Backend `assessments/`, `repositories/`, `policies/` trong feature test-attempts.
- Frontend `context/TestAttemptContext.jsx`, `context/PracticeAttemptContext.jsx`, `hooks/useAttemptResult.js`.

README có thể cũ: một số mô tả CEFR và schema trong `database/README.md` không còn khớp hoàn toàn migration/code. Không dùng tài liệu cũ để tự tạo lại bảng attempt_sections/attempt_answers nếu runtime đang dùng attempt_progress/result JSONB.

## 5. AI Writing: quyết định sản phẩm mới nhất

Người dùng chọn làm chấm AI Writing trước Speaking, chatbot và cá nhân hóa.

Yêu cầu bắt buộc: Full Writing bốn Part phải trả điểm và **CEFR Writing ước lượng ngay sau chấm**, hoàn toàn độc lập với Grammar/Reading/Listening/Speaking. Không yêu cầu thi thêm Grammar để có CEFR Writing.

- Full Writing trả CEFR Writing, không phải CEFR tổng thể bốn kỹ năng hoặc chứng chỉ chính thức.
- Luyện riêng một Part trả đánh giá Part; không suy ra toàn bộ CEFR Writing từ một Part.
- Chấm sau khi nộp, chạy nền, lưu kết quả để mở lại không phải gọi API.
- AI cần chỉ rõ điểm mạnh, điểm yếu và lỗi với dẫn chứng, cách sửa và giải thích bằng ngôn ngữ giao diện.
- Nhóm tiêu chí: đáp ứng yêu cầu, ngữ pháp, từ vựng, tổ chức/liên kết, văn phong; phản hồi thêm chính tả/dấu câu/độ rõ nghĩa.
- Part 1 ưu tiên đúng yêu cầu và hiểu được; không yêu cầu câu phức. Part 4 phải xem xét cả hai email và sự khác biệt văn phong.
- Không chấm độ giống đáp án mẫu, không trừ điểm máy móc mỗi lỗi; phân biệt lỗi thật với gợi ý viết hay hơn.
- Bài trắng/quá ít bằng chứng không ép nhãn A1. Lỗi API không biến thành điểm 0.

### Những điểm chưa chốt, không được trình bày như quyết định đã phê duyệt

- Thang rubric tham khảo British Council từng Part: 0–3, 0–5, 0–5, 0–6.
- Trước đây đã đề xuất cộng `/19` rồi chuẩn hóa `/50`, nhưng lượt sau đã điều chỉnh: **không dùng phép nhân tuyến tính đó để tự gán CEFR**. Chưa chốt công thức điểm `/50`, trọng số hoặc bảng ngưỡng CEFR.
- Hướng hiện tại: đối chiếu mô tả năng lực có bằng chứng, tổng hợp hồ sơ từng Part/tiêu chí và hiệu chỉnh bằng người chấm. Không tính trung bình số hóa A1/A2/B1/B2.
- Model, nhà cung cấp fallback, quota, prompt, output schema và bảng job vẫn là phương án đề xuất, chưa triển khai/chốt cuối.

### Trạng thái code AI Writing ngày 04/10/2026

- `backend/src/features/test-attempts/assessments/adapters/writing-paper.adapter.ts`: các câu TEXT có `points: 0`.
- Objective grader dùng kết quả `PENDING_AI` cho Writing; chưa có điểm Writing thực.
- `backend/src/features/test-attempts/policies/exam-cefr.policy.ts` chưa quy đổi Writing; có nhánh Listening và Speaking. Nhánh Speaking tồn tại không chứng minh AI Speaking đã vận hành.
- Không có migration `assessment_jobs` trong danh sách đã kiểm tra.
- Frontend có `frontend/src/features/writing/pages/WritingResultPage.jsx`, `WritingResultDetailPage.jsx` và các component sẵn để mở rộng.

## 6. Kiến trúc AI đã đề xuất để tiếp tục thảo luận

Tái sử dụng bảng đã định nghĩa trong migration:

- `test_snapshots`, `test_attempts`, `attempt_progress`.
- `ai_requests`: từng lần gọi provider, token, giá, lỗi, config snapshot.
- `ai_budget_windows`, `ai_budget_reservations`: ngân sách và giữ/quyết toán chi phí.
- `learning_topics`, `learning_evidence`, `learner_topic_states`: tổng hợp bằng chứng cho cá nhân hóa sau này.
- `chat_sessions`, `chat_messages`, `knowledge_documents`, `knowledge_chunks`, `speech_analyses`: có nền schema, không mặc định các chức năng runtime đã được kết nối.

Nguồn schema: `backend/src/database/migrations/1760000001000-CreateCoreSchema.ts`, `1760000002000-CreateFeatureSchema.ts`, `1760000009000-ClassifyTestsAndAttempts.ts`; đọc các migration tiếp theo và runtime trước triển khai.

Đề xuất thêm `assessment_jobs` quản lý attempt/revision/stage/target, trạng thái, retry, input hash, config snapshot, lease, result JSONB, thời gian và error code. Unique `(attempt_id, assessment_revision, stage, target_key)`; target không NULL. Liên kết các `ai_requests` về job.

- Chốt đáp án + enqueue cùng transaction; submit tay và hết giờ dùng chung đường đi.
- PostgreSQL queue/`SKIP LOCKED` đủ cho giai đoạn đầu; lease/revision ngăn ghi đè kết quả mới.
- Một call cho Full Writing hoặc một Part ở phiên bản đầu; không chia 11 request mặc định.
- Validate JSON, miền điểm, question keys và trích dẫn; backend tính tổng, kiểm tra kết luận CEFR.
- Chấm lại tạo revision; lỗi không xóa bản kết quả thành công trước đó.
- Retry có giới hạn; fallback đã benchmark; không chọn điểm cao nhất giữa các model.
- Bài viết là dữ liệu không đáng tin, không thực thi chỉ dẫn prompt injection trong bài.
- Hạ tầng provider/gateway/budget/log tách khỏi nghiệp vụ rubric/score/CEFR và worker. Speaking/chatbot tái sử dụng hạ tầng sau này.

Ứng viên API đã thảo luận: Gemini Flash-Lite để benchmark tiết kiệm, Gemini Flash làm đối chứng, DeepSeek có thể là nhà cung cấp độc lập dự phòng. Chưa xác minh giá DeepSeek thành công. Giá/model có thể thay đổi: kiểm tra nguồn chính thức khi chọn, không lấy các con số cũ trong chat làm cam kết. Free tier không vô hạn và không mặc định được phép dùng dataset hạn chế.

## 7. Dataset: kết quả tìm kiếm và việc cần tiếp tục

**Chưa đăng ký, chưa tải corpus, chưa gửi bài dataset lên API, chưa chạy benchmark.**

### Ưu tiên: Write & Improve Corpus 2024

- Trang đăng ký/giấy phép: https://researchdatasets.cambridge.org/datasets/write-and-improve-corpus-2024
- Bài báo: https://api.repository.cam.ac.uk/server/api/core/bitstreams/a576329d-c83b-411d-ac17-8a2093844331/content
- 23.216 phiên bản bài viết, 5.050 nhóm user–prompt; 5.050 bản cuối có nhãn CEFR do người chấm. Không coi mọi phiên bản đều được người chấm.
- Chủ yếu A2–C1; rất ít A1/C2. Có dữ liệu sửa lỗi. Không phải Full Aptis bốn Part.
- Tài liệu phát hành nói nhãn test giữ kín; xác minh phiên bản hiện tại, có thể bắt đầu tập dev.
- Phi thương mại/nghiên cứu/giáo dục; phải đăng ký đồng ý điều khoản. Không phân phối/GitHub; có điều kiện với sản phẩm dẫn xuất và API: chạy local hoặc dịch vụ không giữ dữ liệu để huấn luyện. Kiểm tra điều khoản đầy đủ trước sử dụng; không mặc định Gemini free phù hợp.

### CLC FCE Dataset v1.1

- https://researchdatasets.cambridge.org/datasets/clc-fce-dataset
- 1.244 bài thi, bài gốc ẩn danh, điểm và chú thích lỗi; v1.1 có JSONL, sửa/bổ sung điểm, nhiều lượt chấm cho 97 bài đánh giá.
- Tốt cho điểm chấm/sửa lỗi; rubric FCE cũ, không lấy điểm FCE tự quy đổi Aptis/CEFR bài viết.
- Điều khoản Cambridge tương tự: phi thương mại, đăng ký, không phân phối, lưu ý sử dụng với API.

### W&I + LOCNESS, BEA-2019

- https://www.cl.cam.ac.uk/research/nl/bea2019st/
- Link tải `W&I+LOCNESS v2.1` trên trang; 3.600 bài người học ở nhóm A/B/C và 100 bài bản ngữ; có bản sửa tham chiếu.
- Tốt kiểm định lỗi ngữ pháp; nhãn A/B/C không phân biệt B1/B2. Không gán bài bản ngữ là C2.
- Dùng phi thương mại; cần đọc điều khoản gói dữ liệu trước tải/sử dụng.

### EFCAMDAT

- https://ef-lab.mml.cam.ac.uk/EFCAMDAT.html
- Khoảng 1,18 triệu bài, cần đăng ký học thuật và được duyệt.
- Nhãn trình độ liên quan đầu vào/khóa học/tiến trình học, không phải mỗi bài được giám khảo chấm CEFR độc lập. Không chọn làm ground truth chính.

### Aptis thực

- Báo cáo có nghiên cứu 6.407 bài Aptis: https://oro.open.ac.uk/75228/1/Owen_Shrestha_and_Bax_2021.pdf
- Nguồn British Council: https://www.britishcouncil.org/exam/english/aptis/research/publications/arags/researching-lexical-thresholds-and-lexical-profiles-across
- Chưa tìm thấy đường tải công khai corpus và nhãn. Báo cáo công khai không đồng nghĩa corpus công khai.
- Có thể đề xuất liên hệ tác giả/British Council; không tự gửi thư hoặc đại diện người dùng đăng ký nếu chưa được yêu cầu.

Khuyến nghị cuối cùng của phiên trước: đăng ký W&I 2024; dùng nhãn người chấm để kiểm định CEFR bài viết, BEA kiểm định sửa lỗi; song song có tập riêng 50–100 Full Writing AptiMate được giáo viên chấm để đánh giá đúng bốn Part. Đây là quy mô pilot, không bảo đảm độ tin cậy mọi mức năng lực.

Tách tập hiệu chỉnh và giữ riêng tập kiểm định theo người viết/đề/nhóm phiên bản; không để cùng bài sửa nhiều lần rơi vào cả hai. Đo lệch điểm từng Part, CEFR exact/adjacent agreement, độ ổn định, lỗi bắt oan, chất lượng giải thích, chi phí và độ trễ. Không dùng AI tự sinh bài/nhãn làm bằng chứng độc lập AI chấm đúng.

## 8. Điểm bắt đầu ở phiên mới

1. Đọc file này và hướng dẫn repository hiện có; chạy `git status`, không đụng thay đổi đang dở ngoài scope.
2. Hỏi/đọc yêu cầu mới nhất để biết tiếp tục đăng ký/tải dataset, thiết kế rubric hay triển khai; không mặc định các phương án đã được duyệt.
3. Nếu tiếp tục AI Writing: ưu tiên rubric/output contract + benchmark dataset hợp lệ, trước khi nối chấm vào submit.
4. Nếu được yêu cầu code: đọc runtime/schema hiện tại vì repository đã tiến xa hơn lịch sử chat; không dùng mô hình mock/tài liệu Reading cũ làm kiến trúc toàn hệ thống.
5. Cập nhật file bàn giao khi hoàn thành task mới, ghi rõ thay đổi đã kiểm chứng và phần còn chờ.

Các lệnh kiểm tra có sẵn (chạy trong thư mục tương ứng khi phù hợp với thay đổi): backend `npm run typecheck`, `npm test`, `npm run build`; frontend `npm test`, `npm run build`, `npm run lint`. E2E backend chỉ dùng database riêng `TEST_DATABASE_URL` có tên kết thúc `_test`, không chạy lên database phát triển thật. Không cần chạy toàn bộ kiểm thử chỉ cho việc thêm tài liệu này.
