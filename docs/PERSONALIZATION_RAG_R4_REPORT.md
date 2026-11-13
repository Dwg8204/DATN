# RAG R4 — Xếp lại tuần học sau đánh giá đầu vào

Ngày kiểm chứng: 13/11/2026. Nhánh chung: `feature/personalization-rag`.

## Hành vi đã triển khai

- Khi mục tiêu ACTIVE, kế hoạch thuộc tuần hiện tại có item PLACEMENT, chưa có `replanned_after_placement_at` và `missingPlacement(profile)` rỗng, dựng snapshot mới và chọn ứng viên qua R3, sau đó lập lịch RULE cho phần còn lại của tuần.
- Mọi ngày đã qua hoặc có bất kỳ tiến độ nào đều được giữ nguyên cả ngày: IDs, nội dung, done_count và completed_at. Đồng bộ các bài vừa nộp trước khi xác định ngày cần giữ. Khi ngày 4 đã có tiến độ, đề khớp tốt nhất được chuyển sang ngày 5 thay vì bị bỏ theo lịch ngày 4.
- `ReportJobsService.replaceUntouched` được dùng trong cùng transaction với dấu đã xếp lại. Lỗi lưu thì rollback toàn bộ. Đề vừa bị archive thì giữ kế hoạch và chưa đặt dấu, để lượt sau thử lại.
- Không gọi generation hoặc embedding API trong thao tác R4. Snapshot và vector đã lưu là đầu vào; báo cáo tuần/nhận xét vẫn đi theo worker hiện có.
- Khóa user trước, khóa plan sau; worker dùng SKIP LOCKED, quét tối đa 50 ứng viên mỗi lượt 60 giây. Các lời gọi sync/worker đồng thời không xếp lại lần hai. Không thêm phụ thuộc từ PersonalizationProgressService về PlanService.
- Báo cáo PLAN_START hoặc báo cáo tạo trước thời điểm R4 không được ghi đè kế hoạch đã xếp lại khi hoàn thành muộn.
- Overview trả `plan.replannedAfterPlacementAt`. UI Việt/Anh có thông báo đóng được, lưu trạng thái đóng theo planId trong localStorage; lỗi đọc/ghi storage không làm hỏng Dashboard.
- Câu nhắc assessment đổi thành hoàn thành 3 bài bắt buộc để điều chỉnh lộ trình ngay. Writing/Speaking vẫn tùy chọn.

## Giữ API GET chỉ đọc

Kế hoạch gốc đề xuất kiểm tra trong `current()` và `sync()`. Để giữ kiến trúc S4 đang có, `current()` chỉ kiểm tra và trả `needsPlacementReplan`; overview gộp vào `needsSync`. Dashboard đã có luồng GET overview → POST sync → GET overview nên người học thấy kế hoạch mới khi mở trang mà không biến GET thành thao tác ghi. `sync()`/`ensureLocked()` mới thay kế hoạch dưới khóa user. Profile đọc một lần được truyền lại cho readiness check.

GET trực tiếp `/me/study-plan/current` không tự ghi; client dùng trường `needsPlacementReplan` để quyết định sync. Worker xử lý cả khi không mở Dashboard. Chu kỳ polling 60 giây không phải cam kết SLA cứng dưới tải lớn, backlog trên 50 người hoặc khi transaction đang bị khóa.

## Database và local

Dùng hai cột từ migration R3; không có migration mới. DB local hiện có 34 migration, backend readiness HTTP 200/database connected. Đã xác nhận `PERSONALIZATION_RAG_ENABLED=true` và `PERSONALIZATION_WORKER_ENABLED=true`. Không đổi key/model/billing hay file môi trường.

Tại lúc kiểm tra, DB ứng dụng chưa có plan mang dấu R4; không tạo bài làm giả trong tài khoản thật. Kịch bản Lan được chạy trong database test local, schema cô lập rồi tự dọn.

## Kiểm chứng

- 327 unit tests / 27 suites personalization, retrieval, chatbot, ai-shared đạt.
- PostgreSQL R4 với service/snapshot/repository/ranking thật, clock điều khiển: 2/3 bài không đổi; sau bài thứ ba ngày 3, ngày 1–3 giữ nguyên và ngày 4 nhận đề có matchCount=2; nhiều worker/sync/GET đồng thời và lần chạy kế tiếp không đổi IDs/marker nữa.
- Ngày 4 có hoạt động đã làm: giữ nguyên ngày 4, đề khớp chuyển sang ngày 5. Không có item PLACEMENT thì không xếp lại. Flag off thì không kích hoạt.
- Kiểm chứng rollback sau khi thay item, archive race chưa đặt dấu và retry thành công; AI START cũ không ghi đè. Một vòng xử lý fixture được assert dưới 60 giây.
- Fixture sử dụng vector tổng hợp và adapter outcome công khai để kiểm soát khớp; không phải đo chất lượng semantic/audio hay gọi AI thật. Giới hạn chất lượng R3 trong báo cáo R3 vẫn còn nguyên.
- Hồi quy PostgreSQL S1/GĐ4 kế hoạch và task thật, GĐ7 báo cáo, placement, S4 overview đồng thời/GET chỉ đọc đều đạt với RAG bật trong môi trường test.
- Browser 2 ca 1280 px và 390 px: overview cần sync dẫn đến POST sync, thông báo sau sync, đóng rồi reload không hiện lại cùng plan, plan mới hiện lại, locale Việt/Anh, storage bị chặn vẫn đóng được, plan cũ không hiện, không tràn ngang hoặc lỗi JS. Browser mock API; PostgreSQL integration kiểm tra backend thật.
- Typecheck/build backend và build frontend đạt. Cảnh báo kích thước bundle frontend hiện có vẫn còn.

## Cách thử trên ứng dụng

1. Dùng học viên chưa đủ ba kỹ năng đánh giá, tạo mục tiêu để tuần đầu có ba item PLACEMENT; chọn thời lượng đủ để còn ngày chưa học trong tuần.
2. Làm và nộp Grammar & Vocabulary, Reading, Listening. Có một số câu sai Reading/Grammar để R3 có dữ liệu truy xuất. Cần đạt điều kiện assessmentComplete của từng kỹ năng, không chỉ mở bài.
3. Sau bài thứ hai, kiểm tra chưa có dấu R4. Sau bài thứ ba, quay lại Dashboard hoặc để worker chạy lượt tiếp theo.
4. Kiểm tra thông báo điều chỉnh và các ngày chưa học. Ngày có tiến độ phải giữ nguyên. Badge khớp chỉ hiện nếu R3 tìm được đề đủ ngưỡng; không có nguồn khớp thì vẫn xếp lại bằng fallback.
5. Đóng thông báo, tải lại: cùng kế hoạch không hiện lại. Tải lại/đồng bộ nhiều lần không làm đổi kế hoạch lần hai.

Lệnh chạy lại: backend `npm run test:placement:replan:db` với TEST_DATABASE_URL chỉ tới database hậu tố `_test`, khác DATABASE_URL; frontend `npm run test:placement:replan:ui`. Không cần sửa thời gian máy hoặc database người học để mô phỏng ngày 3/ngày 4: fixture điều khiển clock riêng.
