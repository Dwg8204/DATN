# RAG R6 — Quản trị độ phủ và thiếu hụt

Ngày kiểm chứng: 14/11/2026. Nhánh chung: feature/personalization-rag. Không có migration mới, không triển khai R7.

## Đã triển khai

- Trang ADMIN /admin/rag, mục “Học liệu AI” cạnh Quản lý chủ đề; Việt/Anh, ba tab Độ phủ / Thiếu hụt / Thao tác. Dùng Button, ConfirmModal (bọc Modal), Pagination, PageLoader; bảng desktop chuyển thành thẻ mobile. Chip câu nguồn mở đúng trình sửa đề/Part. Có nút tải lại và cập nhật tiến độ mỗi 10 giây, không chồng request poll.
- GET /api/v1/admin/rag/status: năm kỹ năng; đếm câu thuộc đề PUBLISHED chưa lưu trữ, kiểm tra hash snapshot, hash hiện tại, text, model và embedding version trước khi tính đã embed. Phần trăm không làm tròn một giá trị thiếu thành 100%. Không có câu thì percent=null. Có số job completed/pending/failed, chủ đề active thiếu LESSON và tiêu chí thiếu CRITERION_GUIDE.
- Học liệu chỉ được tính khả dụng nếu READY, LEARNER, examVariant hỗ trợ, phiên bản mới nhất, chunk có vector đúng model. Tiêu chí dùng đúng 6 mã Writing và 4 mã Speaking hiện có, không thêm tiêu chí giả.
- GET /api/v1/admin/rag/gaps?feature&component&from&to&page&pageSize: nhóm kỹ năng/Part/chủ đề, số sự kiện, số user khác nhau còn định danh, trung bình top_similarity (bỏ NULL), tối đa 3 câu nguồn khác nhau. Loại trùng topic trong mỗi sự kiện; sự kiện nhiều topic thuộc nhiều nhóm, không cộng các nhóm thành số sự kiện toàn cục. Sắp giảm dần occurrences, tie-break ổn định. Tổng nhóm và trang dữ liệu đọc cùng transaction REPEATABLE READ. Dùng helper pagination, pageSize 1–100. Khoảng ngày UTC gồm hết ngày to; chặn ngày sai và from>to.
- POST /api/v1/admin/rag/reembed: theo kỹ năng hoặc tất cả; chỉ đề PUBLISHED có snapshot, không archived. Thêm job thiếu, xếp lại completed/failed; giữ pending, bỏ qua job bị khóa bằng SKIP LOCKED. Khóa advisory ngăn hai request bulk chồng nhau, trả 409 nếu bận. Audit RAG_REEMBED ghi actor, phạm vi, số queued trong cùng transaction. Kết quả UPDATE được chuẩn hóa qua CTE SELECT để đếm đúng số job với TypeORM.
- “Lập chỉ mục lại” dùng worker R1: tái sử dụng vector đúng hash/text/model/version và vector có đầu vào giống nhau, chỉ gọi embedding cho vector thiếu/cũ. Không xóa vector tốt để ép gọi AI. UI thông báo rõ hành vi này và không cho thao tác khi RAG tắt. API vẫn có thể xếp hàng khi worker tắt; job sẽ chờ tới lúc bật worker.
- PersonalizationWorker dọn retrieval_gaps có created_at cũ hơn 180 ngày, tối đa 1.000 dòng/lượt, SKIP LOCKED; không chạm dữ liệu đúng mốc hoặc mới hơn. Tiếp tục dọn ở các lượt sau nếu tồn nhiều dòng. Tác vụ chỉ chạy khi PERSONALIZATION_WORKER_ENABLED=true.
- Quyền: ADMIN; chưa đăng nhập 401, STUDENT 403. Endpoint không trả userId/email/bài viết người học; samples chỉ lấy nội dung ngân hàng đề quản trị được.

## Kiểm chứng

- PostgreSQL/Nest HTTP fixture: quyền 401/403, query/body validation, nhóm có topic trùng, nhiều user, NULL topic, ngày kết thúc UTC, pageSize/phân trang, sample tối đa 3, thiếu học liệu LEARNER/STAFF, bộ tiêu chí Speaking, reindex một kỹ năng đạt 100%, giữ job đang khóa/đang chờ, audit, vector cache, hash cũ và dọn gap cũ.
- 344 unit tests / 30 suites backend đạt (personalization, retrieval, chatbot, ai-shared, pagination); backend typecheck/build đạt.
- Browser R6: 4/4 ca en/vi × 390/1280px đạt: năm thẻ độ phủ, lọc kỹ năng/tính năng/ngày, link sửa đề, cancel/confirm POST, polling 10 giây, không tràn ngang, không lỗi runtime. Ca en/390 chạy thêm lỗi POST 503, hiển thị lỗi ngay trong modal và thử lại thành công.
- adminResponsive: phần bố cục en/vi đạt trên 320–1440px, có thêm /admin/rag. Hai test sidebar ban đầu dùng route /admin/feedback đã bỏ; đổi sang /admin/rag rồi chạy lại cả hai đạt.
- Frontend build đạt; lint không có lỗi, có warning Fast Refresh từ cấu trúc adminRoutes và set-state-in-effect trong luồng tải dữ liệu.

## Nghiệm thu local

Trước reindex: Grammar/Vocabulary 1.025/1.025, Reading 512/512, Listening 450/450, Writing 225/225, Speaking 216/216. Tổng 2.428/2.428. Tất cả 173 job hoàn thành, không pending/failed; không có chủ đề active thiếu LESSON hoặc tiêu chí thiếu CRITERION_GUIDE theo kiểm tra metadata/vector trên.

Đã xếp lại 35 đề Reading qua service R6; audit actor=null vì chạy kiểm chứng hệ thống qua CLI, không mạo danh tài khoản admin. Lệnh CLI drain riêng bị bộ duyệt tự động từ chối vì có thể gửi câu hỏi tới embedding provider; không chạy lại hay thay thế lệnh đó. Chỉ quan sát worker R1 đã chạy sẵn của ứng dụng xử lý hàng đợi theo chu kỳ. Kết quả cuối: **Reading 35/35 job completed, 0 pending, 0 failed; 512/512 câu (100%)**. Backend readiness HTTP 200; gọi status không đăng nhập trả 401.

Độ phủ 100% chỉ chứng minh đầy đủ vector/học liệu theo metadata, không phải độ chính xác truy xuất hoặc chất lượng nội dung 100%. Đánh giá semantic và hiệu chỉnh ngưỡng thuộc R7.

## Cách kiểm tra

1. Đăng nhập ADMIN, mở Học liệu AI hoặc /admin/rag. STUDENT không được truy cập.
2. Độ phủ: xem năm kỹ năng và danh sách thiếu bài học/hướng dẫn tiêu chí.
3. Thiếu hụt: lọc PLAN/EXPLAIN/REPORT, kỹ năng và ngày; xem nhóm nhiều lượt nhất; mở câu mẫu để tới trình sửa đề. Nếu chưa có sự kiện thì hiển thị rỗng, không tự tạo thống kê.
4. Thao tác: chọn Reading, nhấn Lập chỉ mục lại; Hủy không gửi POST; Xác nhận xếp hàng và tiến độ tự cập nhật. Khi worker xong, pending=0 và câu hợp lệ đạt 100%. Nếu có draft khác snapshot đã xuất bản, cần xuất bản phiên bản đúng trước, không tăng giả độ phủ bằng vector cũ.
5. Backend: npm run test:rag:admin:db với TEST_DATABASE_URL riêng hậu tố _test. Frontend: npm run test:rag:admin:ui; npm run test:admin:responsive. Fixture biệt lập, không gửi embedding thật hoặc email.
