# GĐ10 — Chủ đề, AI gợi ý và admin duyệt

## Bổ sung thao tác và thống kê chủ đề — 21/10/2026

- Bỏ nút tải lại và viền đỏ khi click button; giữ chỉ báo bàn phím màu trung tính. Các thao tác xem/sửa/xóa dùng icon với tên truy cập và tooltip; mobile là từng thẻ riêng.
- Chi tiết chủ đề dùng Modal chung, hiển thị mã, kỹ năng, loại, mô tả, trạng thái, số câu liên quan/đã duyệt/chờ duyệt và số đề. Đếm câu khác nhau với nhãn APPROVED/SUGGESTED đúng fingerprint, cùng kỹ năng, đề chưa lưu trữ (gồm nháp); không tính nhãn từ chối/lỗi thời. Chủ đề ẩn vẫn giữ số liên kết.
- Xóa mềm tái sử dụng trạng thái is_active=false qua DELETE /admin/learning-topics/:id (ADMIN), có xác nhận, transaction và audit TOPIC_DELETE. Giữ toàn bộ nhãn/lịch sử; có thể bật lại bằng sửa. Không thêm migration hoặc xóa cứng dữ liệu.
- Độ phủ hiển thị trực tiếp 5 khung thống kê với tỷ lệ, số câu đã duyệt/tổng và thanh tiến độ; chỉ tính đề đã xuất bản, ngưỡng 80% như trước.
- Kiểm chứng: PostgreSQL GĐ10 gồm số câu, quyền xóa, 404, giữ nhãn khi xóa và khôi phục; browser kiểm tra chi tiết, hủy/xác nhận xóa, icon sửa, không còn tải lại, thống kê luôn hiện và luồng duyệt cũ. Build frontend, typecheck và ESLint backend đạt; Oxlint còn cảnh báo effect tải dữ liệu có sẵn. Đã xem ảnh desktop/mobile. Chưa commit/push và chưa làm GĐ11.


## Cập nhật giao diện quản lý chủ đề — 21/10/2026

- Sidebar admin chỉ còn **Quản lý chủ đề**, sáng đúng ở cả hai URL cũ. Bên trong có hai tab **Chủ đề học tập / Duyệt chủ đề**; topbar dùng cùng tên quản lý.
- Danh mục chuyển sang danh sách gọn, thêm/sửa trong Modal chung; tìm tên/mã/mô tả, lọc kỹ năng và trạng thái bật/ẩn. Phần duyệt có tìm tên đề hoặc nội dung/mã câu/chủ đề, các bộ lọc công việc, trạng thái và nhãn cần xem lại.
- Tái sử dụng Button, Modal, ConfirmModal, Pagination và paginate có sẵn. Phân trang cả danh mục, đề và nhãn; thay đổi số dòng, nhảy trang. API tests/labels thêm search, pageSize (1–100), totalItems chính xác kể cả kết quả rỗng; tìm kiếm trên toàn bộ kết quả phía server.
- Tông đỏ theo admin, tab và khối lọc thống nhất; câu hỏi/điều khiển duyệt chia hai cột trên desktop, xếp dọc trên mobile. Hướng dẫn, độ phủ và thêm nhãn thủ công thu gọn; xử lý AI hàng loạt nằm ở danh sách đề. Giữ nguyên xác nhận duyệt cả đề theo revision, không bị giới hạn bởi tìm kiếm/phân trang.
- Kiểm chứng: PostgreSQL GĐ10 gồm tìm kiếm/phân trang/tổng số và toàn bộ luồng duyệt; browser Anh–Việt, tìm kiếm danh mục, Pagination, thêm/sửa/ẩn và duyệt cả đề; ảnh desktop/mobile, typecheck, build frontend. Không migration, không duyệt nhãn thật, chưa triển khai GĐ11.


Ngày triển khai: 21/10/2026. Theo mục 8.5, 9.1, 9.4 và hàng GĐ10 trong [kế hoạch bản 2](PERSONALIZATION_IMPLEMENTATION_PLAN_V2.md).

## Quyết định đã chốt với người dùng

- Hỗ trợ rà soát nhãn trên dữ liệu thật sau triển khai; không tự động duyệt các gợi ý AI.
- Chủ đề yếu: có ít nhất **3 câu khác nhau đã chấm**, tỷ lệ sai/bỏ trống có trọng số **≥40%**. Không suy điểm yếu từ nhãn của câu hỏi Writing/Speaking; tiếp tục dùng tiêu chí chấm hiện có.
- Điều kiện bật theo từng kỹ năng: **≥80% câu thuộc đề đang PUBLISHED, chưa archive, có ít nhất một nhãn APPROVED còn đúng phiên bản và thuộc chủ đề đang bật**. Mỗi câu tính một lần, dù có nhiều nhãn. Không dùng confidence làm điều kiện tự duyệt.

## Đã triển khai

### Bổ sung luồng hàng loạt theo yêu cầu ngày 21/10/2026

- **Duyệt toàn bộ đề:** trong chi tiết đề có nút nổi bật **Duyệt tất cả nhãn chờ của đề**. Hộp xác nhận lấy số nhãn/số câu từ server, không bị giới hạn bởi bộ lọc hoặc trang 100 nhãn. Chỉ duyệt SUGGESTED đúng phiên bản, thuộc chủ đề đang bật/cùng kỹ năng; giữ APPROVED/REJECTED và bỏ qua nhãn không hợp lệ. Câu chưa có nhãn vẫn cần AI hoặc thêm nhãn thủ công. Nút duyệt các nhãn đang hiển thị vẫn được giữ để áp dụng các chỉnh sửa riêng.
- `GET /admin/tests/:id/topic-approval` trả bản xem trước; `POST /admin/tests/:id/approve-topics` nhận revision của bản xem trước. Xác nhận khóa đề/câu/nhãn và chủ đề liên quan trong transaction; nếu bộ nhãn thay đổi trả 409 để mở lại xác nhận, không duyệt nhãn mới xuất hiện mà admin chưa xác nhận. Ghi người/thời điểm duyệt và audit từng nhãn, giữ source AI, xếp việc tính lại evidence. Không cần migration mới cho chức năng này.
- Nếu dropdown đang có thay đổi chủ đề chưa lưu, nút duyệt toàn bộ tạm tắt và UI hướng dẫn duyệt thay đổi hoặc chọn lại chủ đề cũ; không bỏ qua âm thầm chỉnh sửa của admin. Kiểm thử đã đạt với 104 nhãn vượt một trang, nhãn ngoài bộ lọc, hủy/xác nhận, hai yêu cầu đồng thời, preview lỗi thời, bỏ qua nhãn stale/hidden và giữ APPROVED/REJECTED. Không chạy thao tác duyệt trên dữ liệu thật trong lượt phát triển này.

- Nút **Gợi ý cho các đề chưa có nhãn** áp dụng cho toàn bộ đề chưa archive của kỹ năng đang chọn (hoặc tất cả kỹ năng), gồm cả bản nháp và các trang danh sách khác. `POST /admin/topic-labels/suggest-missing` chỉ xếp đề còn câu chưa có nhãn hiện hành thuộc chủ đề đang bật; không xóa nhãn, không tự duyệt và không xếp trùng việc đang chạy/chờ retry. Nhãn REJECTED là quyết định đã xử lý, không tự yêu cầu lại.
- Bấm lại không đặt lại số lần retry hay thời gian chờ của công việc đang hoạt động. Công việc hết lượt retry hoặc đã hoàn tất nhưng còn thiếu nhãn có thể được xếp lại sau cooldown 10 phút/đề. Lệnh backfill dùng cùng logic, không còn đặt lại toàn bộ hàng đợi.
- `GET /admin/topic-labels/progress` trả số câu đã có kết quả gán nhãn, số nhãn chờ duyệt, số đề đủ nhãn/chờ xử lý/chờ thử lại/thất bại và cấu hình bật worker/AI. UI cập nhật mỗi 10 giây; số liệu gán nhãn này **khác với tỷ lệ APPROVED 80%**. Worker tắt thì UI báo công việc vẫn đang được giữ. Không suy ra tiến trình worker đang sống chỉ từ cờ cấu hình.
- Lọc đề: còn thiếu nhãn, có nhãn chờ duyệt, xử lý thất bại. Lọc nhãn: confidence dưới 80% hoặc chưa có, nội dung đã đổi, chủ đề bị ẩn. Danh sách nhãn phân trang 100; nút duyệt chỉ áp dụng nhãn hiện hành đang hiển thị trong bộ lọc/trang và có hộp xác nhận. Poll tiến độ không xóa lựa chọn đang sửa của admin.
- Câu hỏi, đáp án và ngữ cảnh hiển thị thành văn bản dễ đọc; ô chọn câu không còn đưa JSON thô. Ngân hàng đáp án Vocab lấy theo đúng set.
- Migration `1760000020000-ExpandGrammarTopics` đã áp dụng local: thêm 15 nhóm Grammar phát hiện khi rà soát, nâng danh mục từ 30 lên **45 chủ đề** (Grammar: 27). Giữ nguyên chủ đề admin đã sửa; rollback giữ các chủ đề có thể đã được dùng để duyệt.
- Đã chạy backfill trên local theo yêu cầu, **xếp thêm 35 đề**, giữ nhãn/công việc có sẵn. Lần kiểm tra sau đó ghi nhận 103/565 câu có kết quả gán nhãn, 111 nhãn chờ duyệt trên 38 đề có câu (gồm nháp). Đây là mốc quan sát, không phải số liệu nghiệm thu hoặc khẳng định batch đã hoàn tất. Chưa duyệt tự động nhãn thật.
- Kiểm thử bổ sung đạt: typecheck/build hai phía, ESLint backend, browser chủ đề Anh–Việt/mobile, PostgreSQL GĐ10 và chuỗi migration up/down/up. Fixture kiểm tra hai yêu cầu đồng thời chỉ xếp 50 đề một lần, phạm vi kỹ năng, giữ APPROVED/REJECTED, cooldown, retry, tiến độ, ba bộ lọc nhãn và phân trang 106 nhãn. Oxlint không lỗi, còn cảnh báo effect tải dữ liệu; build frontend còn cảnh báo chunk lớn.

Phần dưới mô tả triển khai và mốc dữ liệu ban đầu; cập nhật hàng loạt ở trên thay thế các mô tả thao tác cũ tương ứng.

- Seed 30 chủ đề: 12 Grammar & Vocab, 5 Reading, 5 Listening, 4 Writing, 4 Speaking. Seed idempotent, không ghi đè tên/trạng thái admin đã sửa.
- `/admin/learning-topics`: thêm/sửa/ẩn, lọc kỹ năng, hiển thị tỷ lệ đã duyệt. Mã và kỹ năng của chủ đề đã tạo giữ cố định để không làm đổi nghĩa dữ liệu cũ; tên, mô tả, loại và trạng thái sửa được. Nhãn cũ không bị xóa khi ẩn chủ đề.
- `/admin/topic-labels`: chọn đề, hiển thị câu/đáp án/ngữ cảnh, nhãn và confidence thấp trước; duyệt từng nhãn, đổi sang chủ đề cùng kỹ năng, từ chối, thêm nhãn ADMIN được duyệt ngay, xác nhận duyệt toàn bộ nhãn đang chờ. Có bộ lọc trạng thái và danh sách đề phân trang. Trang sửa đề có số nhãn chờ duyệt và link đi tới màn duyệt.
- API dùng JWT + role ADMIN, DTO whitelist, UUID và giới hạn lô 500 nhãn. Mỗi lần duyệt ghi người duyệt, thời điểm và audit chứa quyết định/chủ đề gốc để đánh giá tỷ lệ duyệt nguyên ở GĐ11.
- Lưu/xuất bản đề tự xếp việc nền qua trigger trong cùng transaction. Không gọi AI trong request lưu đề. Hàng đợi bền vững, khóa hàng/advisory lock chống hai worker xử lý cùng việc, retry và giới hạn RPM dùng chung với báo cáo cá nhân hóa. 429 lùi lịch và dừng lượt AI.
- Mỗi đề một lần gọi khi nhỏ; đề trên 30 câu chia theo Part. Prompt chỉ gửi nội dung đề/đáp án/ngữ cảnh, kỹ năng, Part và danh sách chủ đề đang bật, không gửi bài làm học viên. Output mỗi câu 1–3 mã và confidence 0..1; mã ngoài danh sách bị loại, thiếu hoàn toàn mã hợp lệ thì retry. Ghi `TOPIC_TAGGING` qua recorder chung trong `ai_requests`.
- AI chỉ ghi `SUGGESTED/AI`; không ghi `APPROVED`. Nhãn có fingerprint câu hỏi và ngữ cảnh đề. Nội dung đổi thì gợi ý AI chưa duyệt bị xóa, xếp việc lại; nhãn đã duyệt của phiên bản cũ không được dùng cho câu đã đổi.
- Giữ ID câu khi lưu lại Reading/Listening/Speaking không đổi vị trí; các câu bị bỏ mới được xóa mềm. Grammar/Writing đã có upsert. Điều này tránh mất nhãn đã duyệt khi chỉ lưu lại đề.
- Bảng ánh xạ câu hỏi của từng `test_snapshot` giữ fingerprint/key bất biến. Bài đã nộp chỉ tạo evidence với nhãn APPROVED khớp đúng phiên bản. Không gán nhãn mới cho câu cũ đã đổi. Với snapshot cũ chỉ backfill khi chứng minh câu và ngữ cảnh chưa đổi kể từ snapshot.
- Sau chấm, trigger xếp việc evidence. Worker chạy độc lập với AI enabled, ghi `learning_evidence` và tính lại `learner_topic_states` dưới khóa theo học viên. Replay/regrade không nhân đôi; dữ liệu SIMULATED/PENDING_AI/UNASSESSED không tạo điểm yếu. Writing/Speaking AI/MANUAL chỉ ghi OBSERVED, không biến thành đúng/sai chủ đề.
- Snapshot dùng `weak.topics` (trường đã có từ GĐ3), giới hạn đúng cửa sổ mục tiêu/kỳ báo cáo. Truy vấn kiểm tra lại nhãn, phiên bản, chủ đề còn bật, assessment revision và ngưỡng phủ; nhãn SUGGESTED/REJECTED không lọt vào.
- RULE và AI plan hỗ trợ ứng viên `TOPIC_REVIEW` từ đề xuất bản có câu thuộc chủ đề yếu. Việc mở bài qua luồng Exam/Practice hiện có và tự hoàn thành sau bài nộp hợp lệ; mỗi bài vẫn chỉ cấp tiến độ cho một việc trong tuần. Không có nút tự đánh dấu xong chủ đề. Tối đa 3 việc/ngày vẫn giữ nguyên.

## Migration, vận hành và dữ liệu thật

Migration `1760000019000-AddTopicWorkflow.ts` bổ sung fingerprint, ánh xạ snapshot, hai queue, view và trigger; seed 30 chủ đề. Đã áp dụng vào database local, không chỉnh `.env`. Máy khác chạy `npm run db:migrate` trước khi khởi động code mới.

Worker dùng `PERSONALIZATION_WORKER_ENABLED`; gọi AI thêm điều kiện `PERSONALIZATION_AI_ENABLED`, dùng provider/model/timeout/RPM hiện có. Không thêm khóa cấu hình mới. Cần khởi động lại backend để đăng ký `TopicsModule`.

```powershell
# backend: xem số đề sẽ xử lý; không gọi AI
npm run topics:backfill
# chạy migration trước; xếp việc các đề còn thiếu nhãn, giữ công việc đang chờ
npm run topics:backfill -- --apply
```

Script không tự duyệt, không gọi AI ngay và không thay nội dung đề. Migration không tự xếp toàn bộ đề cũ. Sau khi xếp việc, màn Duyệt chủ đề tự cập nhật tiến độ; mở đề hoặc tải lại để lấy nhãn mới. Nút gợi ý lại riêng từng đề vẫn giới hạn một lần/10 phút/đề và thay các gợi ý chưa duyệt. Nút hàng loạt giữ các nhãn hiện hành ở mọi trạng thái và chỉ bổ sung câu còn thiếu.

Khảo sát local sau migration: **34 đề xuất bản**, Grammar & Vocab **275 câu**, Reading 87, Listening 75, Writing 60, Speaking 36. Hiện chưa có nhãn được duyệt. Grammar & Vocab cần **ít nhất 220/275 câu** được duyệt để bật ôn chủ đề. Có 533 ánh xạ câu/snapshot được backfill. Các số này là mốc khảo sát, sẽ thay đổi khi sửa/ẩn/xuất bản đề.

**Chưa nghiệm thu ngưỡng 80% trên dữ liệu thật.** Không được coi fixture đạt 80% là dữ liệu thật đã đạt. Đã hỗ trợ rà soát toàn bộ 275 câu Grammar & Vocab, gộp thành 151 nhóm nội dung/đáp án trong [file đề xuất nhãn](PERSONALIZATION_GD10_LABEL_REVIEW.md), có ID từng câu và đề để đối chiếu. 198 câu dùng được mã hiện tại, 74 câu cần bổ sung chủ đề, 3 câu tạm giữ để admin xem lại nội dung/đáp án. Đây là đề xuất để người duyệt kiểm tra, chưa phải quyết định APPROVED. Chưa chạy gợi ý AI hàng loạt hoặc duyệt nhãn thật trong đợt kiểm thử này.

Khi rà soát Vocab, phải dùng ngân hàng đáp án của đúng set. Prompt đã bổ sung vị trí/groupKey; màn duyệt hiển thị ngữ cảnh đúng set và cho xem đầy đủ câu chưa có nhãn trước khi thêm thủ công. Một câu “She ___ to work every day” hiện lưu đáp án “going”; đề xuất tạm giữ để admin kiểm tra, không sửa dữ liệu thật trong lượt này.

## Kiểm thử

- Backend: toàn bộ 80 suite/555 unit test đạt; typecheck, build và ESLint phần GĐ10 đạt.
- PostgreSQL: GĐ1–GĐ9 hồi quy đạt; GĐ10 đạt phân quyền HTTP 401/403, whitelist DTO, seed, queue, nhãn AI SUGGESTED, mã ngoài danh mục, độ phủ 60%/80%, evidence đúng phiên bản, replay/regrade, ownership, cooldown và giữ ID câu khi lưu lại Reading/Listening/Speaking. Ca bổ sung kiểm tra đúng 40% (gồm bỏ trống), dưới 40%, 2/3 câu, ẩn chủ đề, giới hạn RPM và 429 không tăng retry đều đạt. TOPIC_REVIEW tạo được và tự hoàn thành bằng bài nộp hợp lệ.
- Bộ chatbot database cũ đạt với migration mới: persistence, token accounting, ownership, concurrent idempotency, stale recovery, feedback và phân trang.
- Frontend: bộ chính 95/95 đạt; browser quản lý/duyệt chủ đề 1/1 và browser cá nhân hóa 1/1 đạt, gồm giao diện điện thoại. Build đạt, còn cảnh báo chunk lớn có sẵn. Oxlint phần mới không lỗi; còn cảnh báo set-state-in-effect khi tải lại trang.
- `git diff --check` đạt. Các kiểm tra database chạy tuần tự trên database `_test`, không dùng database ứng dụng làm fixture.

```powershell
# backend, các lệnh DB dùng TEST_DATABASE_URL kết thúc _test, chạy tuần tự
npm run typecheck
npm test
npm run test:personalization:db
npm run test:chatbot:db
npm run build

# frontend
npm test
npm run test:topics:ui
npm run test:personalization:ui
npm run build
```

Không gọi AI thật/SMTP thật trong kiểm thử; không log bài làm. Rollback migration bỏ queue/ánh xạ/fingerprint của GĐ10 nhưng giữ danh sách chủ đề và nhãn. GĐ11 (rubric và đo độ chính xác trên nhãn thật) chưa triển khai. Thay đổi GĐ8–GĐ10 chưa commit/push.
