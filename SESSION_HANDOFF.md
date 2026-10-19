# Bàn giao ngữ cảnh AptiMate cho phiên chat mới

## Cá nhân hóa P0 — 19/10/2026

- Đã tạo nhánh `feat/learning-personalization` theo yêu cầu tên tiếng Anh, không dùng `codex`; pull fast-forward `origin/develop` tới `3e7fae0` trước khi triển khai.
- Speaking Part không còn band ở kết quả mới, API đọc dữ liệu cũ, lịch sử và UI. Giữ điểm /50, tiêu chí và phản hồi; bài toàn kỹ năng vẫn có CEFR. Prompt tăng lên `speaking-rubric-v5`. Dashboard và context chatbot được kiểm thử không lấy band từ Part.
- Migration `1760000016000-RemoveSpeakingPartCefr` đã kiểm thử up/down/up trên `_test`, rồi áp dụng local. Local không có bài Speaking Part; cả 5 bài toàn kỹ năng giữ nguyên dữ liệu chấm. CHECK chặn ghi band Part vào cột và JSON; không còn migration chờ. GĐ1 cần dùng số migration mới từ `1760000017000` nếu chưa bị dùng.
- Backend 67 suite/417 test; Speaking UI + i18n 20 test; browser 3 test (16 tổ hợp Speaking); typecheck, build hai phía và lint file thay đổi đạt. Không gọi AI thật. Báo cáo và hướng dẫn test: `docs/PERSONALIZATION_P0_REPORT.md`.
- Dừng ở P0 chờ người dùng test/xác nhận; GĐ0 đã làm trước đó, chưa triển khai GĐ1. Không quan sát được quota tài khoản theo cửa sổ 5 giờ; nếu hệ thống hoặc người dùng báo gần hết quota, lưu bàn giao và tạm dừng theo yêu cầu.

## Đồng bộ và commit toàn bộ thay đổi — 19/10/2026

- Theo yêu cầu người dùng, đã fetch `origin/develop` và fast-forward nhánh `feature/backend-writing-crud` tới `0a33041` trước khi chia commit. Không đổi nhánh, không push.
- Chia thay đổi thành các task: migration/schema hai vai trò; API phân quyền; UI quản trị/phân quyền; sửa lịch sử chatbot; thống kê học tập dùng chung; Gemini/ghi token/quota; tài liệu bàn giao. Các ghi chú “chưa commit” bên dưới mô tả thời điểm trước đợt này.
- Kiểm thử trước commit: backend 66 suite/411 test đạt; frontend chính 95/95 test và 5/5 test phân quyền/API đạt. Không chạy lại Gemini thật, email hoặc migration trên database ứng dụng.
- Không đưa `.env`, thông tin đăng nhập hay file tạm vào commit; `.env.example` chỉ bổ sung cấu hình giới hạn RPM. Commit không đồng nghĩa người dùng đã nghiệm thu GĐ0; vẫn dừng trước các giai đoạn cá nhân hóa tiếp theo.

## Cá nhân hóa GĐ0 — 19/10/2026

- Theo yêu cầu triển khai GĐ0 bản 2, đã tách thống kê thuần và hạ tầng Gemini/ghi `ai_requests` sang `features/ai-shared`. Chatbot vẫn đọc 20 bài gần nhất của chính người đăng nhập, giữ schema/action/thought signature và mã lỗi. Chi tiết, lệnh test và giới hạn: `docs/PERSONALIZATION_GD0_REPORT.md`.
- Cấu hình mới `GEMINI_MAX_RPM` mặc định 5/model/process; HTTP 429 có cooldown theo Retry-After, không tự retry. Chưa có quota phân tán hoặc ngân sách trả phí. Không sửa `.env`, model hoặc pipeline chấm Writing/Speaking.
- Baseline 20 test chatbot đạt; kết quả cuối 7 suite/57 test đạt, typecheck/build backend và ESLint các file đã sửa đạt. Hồi quy bổ sung thống kê, quota, request recording và DI; PostgreSQL integration trên `aptimate_chatbot_test` đạt với HTTP mock, không gọi Gemini thật. Xem báo cáo GĐ0 để biết cách nghiệm thu.
- Đã fetch develop tới `0a33041`, tree trùng HEAD `2039b94`. Thao tác tạo nhánh mới bị người dùng từ chối: giữ nhánh hiện tại, không commit/push; giữ nguyên thay đổi phân quyền/UI/Speaking có sẵn.
- Chưa làm P0 hoặc GĐ1. P0 Speaking Part chưa được xác nhận hoàn tất; migration số `1760000015000` đã được task phân quyền dùng, cần chọn lại số khi triển khai nền dữ liệu. Dừng ở GĐ0 chờ người dùng kiểm thử.

## Cập nhật phân quyền — 19/10/2026

- Hệ thống chỉ còn **User (mã STUDENT)** và **Admin (ADMIN)**. Giữ mã STUDENT để tương thích đăng ký, Exam/Practice và dữ liệu hiện có; không thêm role USER riêng.
- Đã gỡ tab/form tạo Teacher, thao tác nâng quyền, API POST /admin/users và PATCH /admin/users/:id/role, DTO/service/repository tương ứng, nhãn Anh–Việt và tùy chọn người nhận thông báo. API cũ trả 404; lọc role không hợp lệ trả 400.
- Chỉ Admin quản lý đề ở cả 5 kỹ năng, Reading legacy, upload media quản trị và tạo bài dictation. Bỏ giới hạn tác giả dành cho role cũ; Admin quản lý được đề của mọi tác giả. User vẫn dùng các luồng học/làm bài hiện có; Practice cho cả User/Admin, Exam giữ chính sách STUDENT.
- Migration RestrictAccountRoles1760000015000 chuyển mọi tài khoản TEACHER (kể cả đã xóa mềm) về STUDENT, tăng auth_version, thu hồi refresh token và ghi audit. Giữ ID, tác giả đề, bài làm, lịch sử và dữ liệu học tập. Constraint database chặn mọi role ngoài ADMIN/STUDENT; seed chỉ tạo hai role.
- Thông báo nhắm role cũ chuyển sang SELECTED_USERS: giữ recipient đã chốt của lịch gửi/lịch sử, lấy người nhận hiện tại cho draft; không chuyển thành gửi toàn bộ User. Nguồn dữ liệu thủ công result_source/vocabulary_source_type đổi nhãn sang MANUAL, giữ dữ liệu nguồn cũ.
- Đã áp dụng migration vào database local: **1 ADMIN, 4 STUDENT**, không còn migration chờ. Hai tài khoản được chuyển role cần đăng nhập lại. Máy khác chạy npm run db:migrate trong backend rồi khởi động backend với code mới.
- Rollback chỉ phục hồi khả năng đọc schema cũ, không tự cấp lại quyền đã thu hồi hoặc mở rộng người nhận. Tên TEACHER còn trong migration lịch sử/chuyển đổi và test phủ định là có chủ đích. Từ “teacher” trong bài tiếng Anh, ví dụ từ điển và tên Aptis for Teachers không phải role hệ thống.
- Kiểm chứng: PostgreSQL integration trên database _test với schema riêng và rollback; kiểm tra chuyển role, phiên, tài khoản xóa mềm, tác giả, thông báo, enum, constraint và down/up. Backend 61 suite/372 test + 8 test HTTP phân quyền đạt. Frontend 5 test authorization/API và 4 browser test (en/vi, desktop/mobile, từ chối User/role cũ) đạt. Sau dọn code phân quyền cũ, chạy lại 4 suite/23 test backend liên quan đạt; typecheck/build backend đạt. Frontend chính 95/95 test, kiểm tra i18n và build đạt; lint frontend không có lỗi, còn cảnh báo có sẵn; ESLint các file backend thay đổi đạt. Build frontend còn cảnh báo bundle lớn hơn 500 kB. Kiểm thử browser dùng API mock; không gọi lại AI hoặc gửi email thật.
- Không commit/push. Giữ nguyên thay đổi chatbot có sẵn trước task này.


## Mốc chatbot mới nhất — 16/10/2026

- Sau đợt commit, người dùng yêu cầu sửa UI lịch sử: đã tách nút sửa/xóa và đưa form đổi tên vào đúng thẻ hội thoại, giữ danh sách khi lưu; hỗ trợ Enter/Escape, trạng thái lỗi và dark mode. Browser test mở rộng với 32 phiên và màn hình 320px; đợt sửa này chờ người dùng test lại, chưa thuộc các commit trước.

- Theo yêu cầu mới nhất, đã pull `origin/develop` trên `feature/backend-writing-crud` (Already up to date), khôi phục thay đổi không xung đột và chia commit local theo task: schema, backend, corpus/ingestion, kiểm thử, UI, linh vật và tài liệu. Không push. Các ghi chú “chưa commit” bên dưới là trạng thái trước mốc đồng bộ này.

- Theo yêu cầu tiếp theo, nút mở chatbot đã đổi sang linh vật robot SVG đỏ–kem có chớp mắt/nhún/vẫy tay; component `AssistantPet` + CSS riêng. Giữ aria-label, thao tác bàn phím, mobile và reduced motion. Đợt này chỉ đổi launcher, chưa mở giai đoạn AI tiếp theo.

- Trạng thái chức năng, bằng chứng kiểm thử và các giai đoạn còn lại được tập hợp tại `docs/CHATBOT_STATUS.md`; đọc tài liệu này trước khi tiếp tục chatbot.
- Người dùng đã test và đánh giá các chức năng hiện có tạm ổn; yêu cầu sửa riêng đường dẫn Notebook và trạng thái chờ. Đã sửa `OPEN_NOTEBOOK` thành `/dictation?mode=notebook`, hiển thị bong bóng ba chấm typing thay chữ thô; chờ nghiệm thu lại. Không coi đây là xác nhận toàn bộ cá nhân hóa/RAG.

- Người dùng yêu cầu làm theo từng giai đoạn; hoàn thành phải dừng báo cáo và chờ họ test/xác nhận rồi mới tiếp tục.
- Đã hoàn tất mốc gửi/nhận Gemini local, cấu hình `.env` bật `CHATBOT_ENABLED=true`, model chat `gemini-3.5-flash-lite`; giữ nguyên cấu hình chấm bài.
- 20 test backend, 4 test frontend, DB integration + 5 lượt Gemini thật và backend build đạt. RAG local xác nhận 14 tài liệu/14 chunk. Chi tiết, giới hạn và hướng dẫn nghiệm thu: `docs/CHATBOT_STAGE_2_REPORT.md`.
- Chưa commit/push; chưa khởi động backend nền thường trực. Không tự triển khai tiếp cá nhân hóa/RAG mở rộng trước khi người dùng xác nhận.

Cập nhật: 12/10/2026, múi giờ Asia/Bangkok. Các snapshot repository ngày 04/10 ở dưới là lịch sử; xem các mục cuối để biết thay đổi mới nhất.

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
3. Nếu tiếp tục AI Writing: theo yêu cầu mới ngày 11/10, tạm hoãn dataset/benchmark độ chính xác, ưu tiên bản thử tích hợp API và output contract; xem kế hoạch ở mục 10. Các test luồng dữ liệu vẫn cần làm.
4. Nếu được yêu cầu code: đọc runtime/schema hiện tại vì repository đã tiến xa hơn lịch sử chat; không dùng mô hình mock/tài liệu Reading cũ làm kiến trúc toàn hệ thống.
5. Cập nhật file bàn giao khi hoàn thành task mới, ghi rõ thay đổi đã kiểm chứng và phần còn chờ.

Các lệnh kiểm tra có sẵn (chạy trong thư mục tương ứng khi phù hợp với thay đổi): backend `npm run typecheck`, `npm test`, `npm run build`; frontend `npm test`, `npm run build`, `npm run lint`. E2E backend chỉ dùng database riêng `TEST_DATABASE_URL` có tên kết thúc `_test`, không chạy lên database phát triển thật. Không cần chạy toàn bộ kiểm thử chỉ cho việc thêm tài liệu này.

## 9. Tiếp nối ngày 05/10/2026: commit và seed đề mẫu

- Đã fetch và fast-forward `origin/develop` đến `d13bc2c`, không conflict. Nhánh vẫn là `feature/backend-writing-crud`.
- Đã commit task danh sách đề công khai: `5195b15` — `feat: cho phép khách xem danh sách đề thi và luyện tập`. Khách xem catalog; khi bắt đầu làm bài chuyển đăng nhập; lịch sử/trạng thái chỉ lấy khi đã đăng nhập. Kiểm thử backend 7/7 đạt; trình duyệt 14/15 đạt, ca timeout đạt khi chạy lại riêng.
- Đã commit bản bàn giao cũ: `a8d66cb` — `docs: bàn giao tiến độ AptiMate và định hướng AI Writing`. Chưa push trong phiên này.
- Người dùng yêu cầu tạo file seed cho cả 5 kỹ năng, cung cấp một ảnh bìa chung, bốn ảnh Speaking và hai audio Listening. Khi được hỏi về giới hạn EXAM chỉ Full, người dùng chọn **giữ quy tắc hiện tại: 28 đề**, không mở rộng Tests thành từng Part.
- Đã tạo `backend/src/database/seeds/seed-sample-tests.ts`, script `npm run db:seed:samples`, hướng dẫn `backend/src/database/seeds/SAMPLE_TESTS.md` và kiểm thử seed.
- Bộ mẫu: 5 EXAM Full + 23 PRACTICE (mỗi kỹ năng một Full và mỗi Part một đề; Grammar có 2 Part, các kỹ năng khác 4 Part). Tạo và publish bằng repository hiện tại, ghi questions/snapshots/audit trong một transaction. Chạy lại cùng ADMIN bỏ qua đề đã có, giữ cả đề đã sửa/lưu trữ; cần ADMIN đang hoạt động. Không tạo tài khoản hay attempt.
- Đã kiểm chứng: typecheck backend đạt, 5 kiểm thử seed đạt; `npm run db:seed:samples -- --dry-run` xác thực đủ 28 đề qua content validation, không kết nối database.
- **Chưa chạy seed ghi vào database**, chưa kiểm chứng persistence bằng database thật. Task seed được commit riêng theo yêu cầu người dùng ngày 05/10/2026; tài liệu bàn giao được commit riêng, chưa push. Listening là câu hỏi/đáp án fixture, chưa đối chiếu nội dung các audio; Speaking có câu hỏi mô tả/so sánh tổng quát. Không gọi bộ mẫu này là đề chuẩn đánh giá năng lực.

## 10. AI Writing: kế hoạch thử tích hợp ngày 11/10/2026

- Người dùng yêu cầu tạm bỏ qua dataset kiểm định, viết kế hoạch chi tiết dùng API miễn phí để thử; dễ đổi provider; chỉ dùng các bảng chính.
- Full Writing cần CEFR toàn bài, nhận xét chung/toàn bộ Part cho trang kết quả; điểm mạnh/yếu, tiêu chí và góp ý theo Part và từng câu cho trang chi tiết. Bài một Part có cùng hai phần output nhưng không CEFR.
- Đã tạo `docs/AI_WRITING_IMPLEMENTATION_PLAN.md`: đề xuất Gemini Developer API với `gemini-2.5-flash-lite` (tài liệu chính thức kiểm tra có Free Tier; quota phải xác minh trong project người dùng), hướng dẫn lấy key/backend env/REST, interface provider, cấu trúc thư mục, rubric/prompt/validator, worker và UI.
- Đề xuất chỉ thêm `assessment_jobs`; kết quả lưu `test_attempts.result`, đáp án dùng `attempt_progress`, đề dùng snapshot. Không nối bảng thống kê/budget/learning vào MVP.
- Đã đọc code hiện tại: Writing Exam PENDING_AI/QUEUED; Practice chuyển sang UNASSESSED/NOT_STARTED nên phải nối enqueue riêng; hook result chưa polling. Kiểu AssessmentResult cần hỗ trợ AI; result_source hiện dùng AUTOMATIC được, không có enum AI.
- Kế hoạch đề xuất MVP lấy CEFR và feedback làm kết quả, score/max_score NULL, chưa tự tạo `/50` khi công thức chưa chốt. Đây là **đề xuất**, không coi là người dùng đã bỏ yêu cầu điểm số trước đây. CEFR Full là ước lượng; bài trắng/thiếu bằng chứng được phép null.
- Chưa triển khai AI, chưa tạo key/migration hay gọi chấm thực tế, chưa commit kế hoạch. Hai package-lock đang sửa là thay đổi có sẵn, giữ nguyên.

## 11. Đồng bộ và commit AI Writing ngày 12/10/2026

- Đã pull `develop` đến `98bba29`. Khi khôi phục thay đổi Writing có conflict ở hai service Exam/Practice; đã ghép cả Reading CEFR/result presentation mới và Writing enqueue/retry/status. Không còn conflict trong Git.
- Phần AI Writing đã được triển khai trong workspace trước lượt pull này. Xem `docs/AI_WRITING_PROGRESS.md`, `docs/AI_WRITING_REVIEW_FIX_PLAN.md` và `docs/AI_WRITING_RUNBOOK.md` để biết triển khai, kiểm chứng từ phiên thực hiện và giới hạn còn lại; mục 10 là lịch sử kế hoạch, không phản ánh trạng thái code hiện tại.
- Sửa lỗi thiếu `dist/main`: đặt cache incremental trong `dist`. Đã chạy hai lần Nest build đều thành công, có `dist/main.js`. Commit `7bac188` — `fix: sửa lỗi thiếu dist/main khi khởi động backend`.
- Theo yêu cầu commit toàn bộ, chia phần còn lại: `fb6352f` — hạ tầng Gemini; `139c24d` — backend chấm Writing/hàng đợi; `64f5288` — giao diện kết quả và lịch sử. Tài liệu được commit riêng sau các task code. Chưa push trong lượt này.
- `backend/.gitignore` đã bỏ qua `*.tsbuildinfo`; cache cũ không commit. Không đưa `.env` hay API key vào commit.
- Kiểm tra trong lượt commit: frontend `npm test` đạt 81/81; test nhãn lịch sử riêng đạt 1/1; backend 8 suites/54 tests đạt (Writing/provider và hai service vừa merge); diff whitespace đạt. Hai lần Nest build thành công ở task sửa build trước đó.


## 12. Thanh tiến độ chấm bài và kết quả Writing — 14/10/2026

Đã triển khai theo `docs/ASSESSMENT_PROGRESS_AND_WRITING_RESULT_PLAN.md`: thanh % ước lượng dùng chung cho 5 kỹ năng, overlay khi nộp bài, trạng thái chờ AI trên Writing/Speaking và polling chung tối đa 5 phút. % chỉ lên 100 khi có kết quả hợp lệ; dừng khi lỗi, tắt AI hoặc hết phiên kiểm tra. Ba kỹ năng khách quan tiếp tục chấm theo đáp án.

Writing tổng quát giữ CEFR cho Full, thông tin bài và feedback chung; comment theo Part nằm ở trang chi tiết. Part không có CEFR. Job Writing mới dùng locale vi và prompt v3; snapshot cũ vẫn đọc được. Speaking rubric v2 yêu cầu nhận xét tiếng Việt; chỉ dùng lại cache assessment cùng prompt version và giữ transcript tiếng Anh.

Đã qua 85 frontend test chính, 94 test Reading/Practice, 68 backend test liên quan và 2 browser test đa trường hợp; build frontend đạt. Chưa kiểm tra lượt chấm thật qua Gemini/Groq; test browser/provider dùng mock. Không có migration mới, chưa commit/push. Chi tiết và hành vi dữ liệu cũ xem mục 10 của tài liệu kế hoạch.


### Điều chỉnh điều hướng trang kết quả — 14/10/2026

Đã rà soát Grammar, Vocabulary (dùng chung grammar-vocab, Part 2), Reading, Listening, Writing, Speaking và kết quả Reading legacy. Logo TestHeader không còn mở xác nhận thoát khi xem kết quả/chi tiết; các route chi tiết đặt confirmExit=false. Trang đang làm bài tiếp tục có xác nhận thoát.

ResultBackButton trong components/common dùng chung mẫu nút Back của Writing. Detail quay về summary theo attemptId/practice; summary quay về danh sách đúng kỹ năng và Exam/Practice. Error state cũng dùng nút chung. Audit chi tiết: docs/RESULT_NAVIGATION_AUDIT.md. Kiểm thử frontend chính 87/87 và Reading/Practice 94/94 đạt; chưa commit/push.


## 13. Rà soát Anh–Việt — 14/10/2026

Bộ dịch chuyển sang frontend/src/i18n/locales/en.json và vi.json, có 1.708 khóa khớp nhau: 504 khóa cũ và 1.204 cặp UI bổ sung. Giao diện hardcode trên khoảng 170+ file được chuyển sang helper useUiTranslation/UiText hoặc t hiện có. Có dịch nhãn động, metadata, lỗi/toast/progress, kiểm tra dữ liệu Admin và một số formatter ngày giờ theo locale.

AnswerSelect mặc định giữ nguyên lựa chọn đáp án tiếng Anh; bộ lọc UI dùng translateLabels. Nội dung đề/bài làm/transcript và feedback AI đã lưu giữ theo dữ liệu/chính sách cũ. Không dịch lại AI khi đổi ngôn ngữ. Xem docs/I18N_AUDIT.md để bổ sung bản dịch và các ngoại lệ dữ liệu động.

Đã qua 90 frontend test chính, 94 test Reading/Practice, 3 browser test đổi ngôn ngữ/Writing/Speaking và build frontend. Chưa commit/push. Không gọi API dịch bên ngoài.


## 14. Triển khai comment thật theo kỹ năng (14/10/2026)

- Thay comment mock bằng `CommentsModule` + API GET/POST/DELETE và bảng `skill_comments`. Mỗi skill có một màn thảo luận chung; Tests/Practice của cùng skill dùng chung, khác skill tách biệt.
- Chỉ hai cấp; trả lời reply vẫn thuộc root. Server suy ra người được @ từ `replyToId`; self reply so sánh user ID và không @. Trigger DB chặn cấp 3, chéo skill và thay đổi định danh/thread.
- Đọc public, gửi/reply cần JWT, xóa mềm chỉ owner; giữ reply sau xóa. Nội dung thuần tối đa 2.000 ký tự, giới hạn 10 lần gửi/phút.
- Frontend có trạng thái loading/trống/lỗi/retry/phân trang, giữ draft khi gửi thất bại, mutation lock, hủy request khi đổi skill/session. Dùng danh tính thật; bỏ nút like mẫu không hoạt động. Chưa realtime hoặc sửa comment.
- Migration `1760000013000-AddSkillComments.ts` đã áp dụng thành công vào DB local. Không thêm env mới. DB máy khác cần `npm run db:migrate`.
- Thêm 24 khóa comments mỗi ngôn ngữ; hiện 1.732 khóa Anh/Việt đồng bộ.
- Kiểm tra: 7 test backend comment, PostgreSQL integration rollback, 1 browser test comment mobile, 90 test frontend hồi quy, build backend/frontend thành công.
- Chi tiết và lệnh chạy: `docs/COMMENTS_IMPLEMENTATION.md`. Chưa commit/push; giữ nguyên thay đổi các task trước.


## 15. Commit theo từng task (14/10/2026)

Đã tách các thay đổi từ mục 12–14 thành 7 commit tiếng Việt: đồng bộ Anh–Việt; tiến độ chấm bài và kết quả/feedback Writing; điều hướng trang kết quả; comment hai cấp theo skill; icon gửi; icon trả lời/xóa; tài liệu bàn giao. Các ghi chú chưa commit trong mục trước mô tả trạng thái tại lúc triển khai; trạng thái hiện tại đã commit, chưa push. Không đưa env, API key hoặc cache build vào Git.


## 16. Bổ sung 6 slide Key Features, giữ nguyên style cũ (14/10/2026)

- Người dùng chọn 6 luồng theo menu: Nghe, Đọc, Viết, Nói, Ngữ pháp & từ vựng, Dictation/Flashcard/Sổ tay. Sau đó yêu cầu giữ nguyên style và slider tự chuyển động; đã bỏ bản thiết kế tab/CTA mới.
- Khôi phục nguyên CSS `FeatureShowcase.module.css` từ HEAD. Giữ carousel cuộn ngang, nút trước/sau, chấm trạng thái và tự chuyển mỗi 3 giây như cũ. Hiện có 6 slide/6 chấm, vuốt trên mobile bằng carousel gốc.
- `HomePage` lấy 6 ảnh từ `pages/homeFeatures.js` và title/description/imageAlt Anh–Việt từ `home.features.flows`. Không thêm tab, CTA, badge, caption hoặc thay bố cục cũ.
- Thay link ảnh hết hạn bằng 6 Unsplash photo URLs riêng; nguồn ảnh đã kiểm tra HTTP 200/image/jpeg. URL dùng crop 1200x800 để cùng tỷ lệ; thêm lazy loading, kích thước ảnh và khóa slide theo ID để không remount khi đổi ngôn ngữ.
- Phạm vi chỉ Key Features; ảnh review/header không thuộc task này.
- Kiểm tra: browser test desktop/mobile (6 slide/ảnh/chấm, tự chuyển sau 3 giây, cuộn thủ công, vòng lại đầu, đổi ngôn ngữ, dark mode, không tràn ngang), 3 test i18n và build frontend đạt. Browser test dùng ảnh fixture. Lệnh test `npm run test:home:features`.
- Đã commit local; chưa push thay đổi task này.


### Điều hướng khi click slide Key Features

Theo yêu cầu tiếp theo, cả slide (ảnh và nội dung) trở thành Link có cursor pointer và focus bàn phím. Nghe/Viết/Nói/Ngữ pháp dẫn tới overview tương ứng, Đọc tới /reading, Dictation tới /dictation. Giữ nguyên bố cục và tự chuyển 3 giây; không thêm nút CTA. Browser test kiểm tra href/cursor, click cả 6 slide trên desktop/mobile và Enter để điều hướng bằng bàn phím. Đã commit local; chưa push.

## 17. Responsive admin và đồng bộ develop (14/10/2026)

- Dashboard dùng cột grid `minmax(0, 1fr)` để biểu đồ rộng cuộn trong panel, tránh kéo giãn toàn trang mobile. Nhãn ẩn của bảng thông báo được giữ trong vùng cuộn bằng `position: relative` trên `.tableScroll`.
- Thanh đầu trang cho ô tìm kiếm xuống dòng ở màn hình điện thoại. Nút đóng/mở sidebar không bị co mất kích thước.
- Test Management hiển thị đầy đủ trên một dòng ở desktop. Sidebar mobile/thu gọn mở menu nổi chứa Thi thử và Luyện tập; chọn đúng query `purpose`, đóng khi chọn, bấm bên ngoài hoặc Escape, và hỗ trợ focus bàn phím.
- Biểu tượng Test Management nằm cùng trục với các biểu tượng sidebar khác; mũi tên đặt riêng bên phải ở sidebar thu gọn.
- Browser test `tests/adminResponsive.browser.test.mjs` kiểm tra tràn ngang ở 15 màn hình admin, 8 kích thước, hai ngôn ngữ; kiểm tra riêng điều hướng menu con, nhãn desktop một dòng và căn thẳng biểu tượng. Lệnh `npm run test:admin:responsive`.
- Đã fetch/pull `origin/develop` vào nhánh `feature/backend-writing-crud` bằng fast-forward tới `201afa6`, khôi phục toàn bộ thay đổi local không có xung đột. Sau đồng bộ: 92 test unit, browser test trang chủ và điều hướng sidebar đều đạt; build frontend đạt.
- Các task trang chủ, responsive admin và tài liệu kế hoạch chatbot được commit local theo nhóm; chưa push.
