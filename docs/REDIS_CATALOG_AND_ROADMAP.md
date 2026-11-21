# Cache danh sách đề và kế hoạch mở rộng Redis

Cập nhật: 18/11/2026.

## 1. Luồng hai API đã triển khai

Frontend đã tách danh sách công khai và trạng thái theo người dùng trước thay đổi này. Giữ nguyên giao diện và hợp đồng API:

1. Lấy trang danh sách đề đã xuất bản. Backend đọc Redis; cache miss thì đọc PostgreSQL và lưu 120 giây.
2. Lấy trạng thái của các ID trong trang từ `/api/v1/test-attempts/states?testIds=...` hoặc `/api/v1/practice-attempts/states?testIds=...`.
3. Frontend ghép bằng `testId` để hiển thị bài đang làm, đã nộp, trạng thái chấm và điểm.

API trạng thái yêu cầu đăng nhập, dùng `actor.id` từ phiên xác thực, không nhận userId tùy ý từ trình duyệt. Trạng thái và điểm vẫn truy vấn PostgreSQL theo người dùng và EXAM/PRACTICE, không lưu trong cache chung. Khách chỉ xem danh sách công khai. Trạng thái API hiện phản ánh lượt làm mới nhất theo logic đang có, không tự chuyển sang điểm cao nhất.

API danh sách được cache:

| Kỹ năng | GET, sau tiền tố /api/v1 |
| --- | --- |
| Grammar & Vocabulary | /grammar-tests |
| Writing | /writing-tests |
| Listening | /listening-tests |
| Reading | /reading-tests/published |
| Speaking | /speaking-tests/published |

Cache chỉ chứa response danh sách công khai từ `listPublished`, không chứa nội dung đáp án, transcript, điểm hay trạng thái riêng của người học. Số lượt làm tổng của đề, nếu có trong response cũ, có thể trễ tối đa TTL; trạng thái và điểm cá nhân lấy riêng.

## 2. Khóa cache và vô hiệu hóa

- Namespace dữ liệu: `aptimate:cache:v1:published-catalog:v1:<hash>`.
- TTL: **120 giây**, không cần thêm biến môi trường.
- Hash bao gồm thế hệ cache, kỹ năng và các tham số truy vấn được sắp theo tên: purpose, mode, search, page, pageSize, cùng status PUBLISHED.
- Không cache danh sách quản trị hoặc chi tiết đề trong thay đổi này.
- Bộ lọc hiện tại là kỹ năng, EXAM/PRACTICE, Part/full và từ khóa. Chưa có bộ lọc topicId riêng trong API danh sách; không diễn giải search là một bộ lọc chủ đề chuẩn hóa. Nếu thêm topicId sau này phải triển khai truy vấn dữ liệu và UI tương ứng trước.

Interceptor chỉ gắn vào các controller quản trị đề (cả Reading cũ), cùng cập nhật cờ placement. Sau khi POST/PUT/PATCH/DELETE thành công, đổi thế hệ cache dùng chung. GET và thao tác lỗi/conflict không đổi thế hệ.

Các key thế hệ cũ trở nên không được truy cập và tự hết hạn trong 120 giây; không dùng KEYS/FLUSHALL để xóa cả Redis. Cách này bảo đảm một truy vấn cũ đang chạy không ghi đè dữ liệu của thế hệ mới. Đổi thế hệ toàn danh mục đơn giản và phù hợp tần suất admin chỉnh đề hiện tại.

Redis không hoạt động: đọc trực tiếp PostgreSQL, không khiến thao tác lưu đề thất bại. Nếu Redis lỗi đúng lúc vô hiệu hóa rồi kết nối lại, dữ liệu cũ còn tồn tại có thể được dùng tới khi hết TTL. Seed/script ghi trực tiếp database không đi qua interceptor: chờ TTL hoặc chủ động gọi invalidateCatalog sau khi batch hoàn tất. Kiểm tra published/quyền khi mở hoặc bắt đầu đề vẫn dựa trên backend hiện có.

## 3. Áp dụng và kiểm tra

Không cần migration, seed, thư viện mới hoặc sửa .env nếu Redis hiện đã bật.

- Backend Node.js: restart `npm run start:dev` nếu chưa tự reload.
- Backend Docker bản build cố định: chạy `docker compose up -d --build --no-deps backend` tại thư mục backend; giữ PostgreSQL và Redis đang hoạt động.
- Chạy tại backend: `node node_modules/ts-node/dist/bin.js scripts/cache-smoke.ts`.

Smoke test kiểm tra dùng cache giữa hai client, TTL, đổi thế hệ danh mục và fallback. Chỉ dùng namespace UUID riêng rồi dọn namespace đó; không gọi LLM, không sửa bài làm.

Kiểm tra thủ công:

1. Mở danh sách một kỹ năng, tìm `aptimate:cache:v1:published-catalog:v1:*` trong Redis Insight.
2. Tải lại cùng bộ lọc: dùng lại cache. Đổi trang/kỹ năng/EXAM-PRACTICE tạo khóa khác.
3. Admin sửa hoặc ẩn một đề thử nghiệm. Tải lại danh sách: phản ánh dữ liệu mới mà không chờ 2 phút.
4. Hai tài khoản có lịch sử khác nhau: danh sách đề chung nhưng điểm/trạng thái đúng theo từng tài khoản.
5. Dừng Redis trong môi trường local: danh sách vẫn đọc được từ database.

Giao diện đang mở không được tự push thay đổi từ admin; cần tải lại hoặc phát sinh request mới. Có thể bổ sung cập nhật realtime riêng nếu cần.

## 4. Kế hoạch tiếp theo theo mức ưu tiên

### Ưu tiên 1 — Đo hiệu năng và tối ưu lịch sử/dashboard

Mục tiêu: xác định truy vấn tốn thời gian trước khi mở rộng cache.

- Đo p50/p95 và số truy vấn cho danh sách, lịch sử, dashboard; phân biệt cache lạnh và cache nóng.
- Kiểm tra EXPLAIN (ANALYZE, BUFFERS) với dữ liệu đại diện, không benchmark tải cao trên database người dùng đang sử dụng.
- Giảm trường JSON lớn trong danh sách; bỏ join không cần thiết ở truy vấn COUNT lịch sử nếu không tìm theo tiêu đề.
- Đối chiếu index hiện có trước khi thêm index. Nếu cần, tạo migration mới, không sửa migration cũ.
- Nghiệm thu: kết quả phân trang, lọc và tổng số giữ nguyên; có số liệu trước/sau và không tăng truy vấn theo số thẻ đề.

### Ưu tiên 2 — Cache thống kê dashboard theo người dùng

Đây là ứng viên cache nên làm tiếp sau danh sách đề, khi số liệu đo cho thấy truy vấn tổng hợp đáng kể.

- TTL khởi đầu 30 giây.
- Khóa gồm userId, khoảng thời gian, kỹ năng, purpose và phiên bản định dạng kết quả.
- Giữ nguyên xác thực; chỉ tra cache sau khi xác định actor từ phiên đăng nhập.
- Vô hiệu hóa sau submit, chấm tự động hoàn tất, giáo viên sửa điểm hoặc xóa dữ liệu liên quan; checkpoint chưa tạo kết quả cuối không được tính thành kết quả đã hoàn thành.
- Gemini vẫn là kết quả chính theo nghiệp vụ hiện tại; hoàn thành Groq tham khảo không thay điểm dashboard.
- Việc vô hiệu hóa cần nằm tại các đường cập nhật dữ liệu dùng chung, bao gồm worker, không chỉ HTTP controller.
- Kiểm thử hai người dùng, nhiều bộ lọc, cập nhật điểm muộn, lỗi Redis và truy vấn cũ hoàn tất sau invalidation.
- Nghiệm thu: không lẫn dữ liệu tài khoản, không trả điểm cũ sau invalidation thành công, API vẫn chạy khi Redis tắt.

### Ưu tiên 3 — Danh mục chủ đề và cấu hình công khai

- Xác định endpoint trả danh mục chung; tách các dữ liệu cá nhân như chủ đề đã học hoặc độ thành thạo.
- TTL 5–15 phút, khóa theo ngôn ngữ/phiên bản nếu nội dung có bản dịch.
- Invalidate sau admin cập nhật danh mục, import hoặc backfill dữ liệu.
- Nếu thêm lọc chủ đề cho danh sách đề: triển khai mapping test-topic và truy vấn lọc trước; cache chỉ tăng tốc truy vấn đã đúng.
- Nghiệm thu: cập nhật chủ đề xuất hiện đúng, không cache cấu hình bí mật.

### Ưu tiên 4 — Cache kết quả truy xuất RAG

- Hiện embedding đã cache; chỉ thêm cache truy xuất khi đo thấy truy vấn retrieval còn là điểm nghẽn.
- Khóa gồm hash câu hỏi chuẩn hóa, phiên bản embedding, phiên bản kho tài liệu, bộ lọc và phạm vi quyền truy cập.
- TTL 5 phút; invalidate khi import/sửa/ẩn tài liệu.
- Cache đoạn tài liệu/ID truy xuất, chưa cache toàn bộ câu trả lời có lịch sử hội thoại cá nhân.
- Kiểm thử quyền truy cập, tài liệu bị ẩn và thay phiên bản kho tri thức.

### Ưu tiên 5 — Bộ đếm và giới hạn API dùng chung nhiều backend

- Chỉ cần khi triển khai nhiều instance; PostgreSQL hiện vẫn giữ cơ chế điều phối chấm và quota.
- Thiết kế bộ đếm nguyên tử, cửa sổ thời gian và hành vi khi Redis mất kết nối; không đồng thời giữ hai nguồn quota độc lập gây đếm sai.
- Phân biệt giới hạn theo request với token; Redis không tăng quota nhà cung cấp.
- Đối với trạng thái quan trọng, dùng instance/chính sách bộ nhớ riêng, không dựa vào cache `allkeys-lru` có thể bị loại bỏ.
- Chỉ triển khai sau kiểm thử đồng thời và phục hồi; chưa chuyển hàng chờ AI sang Redis ở đợt này.

## 5. Phạm vi thay đổi đợt này

Đã triển khai cache danh sách đề 5 kỹ năng và invalidation qua API quản trị, bổ sung kiểm thử. Tái sử dụng hai API và frontend ghép dữ liệu hiện có. Các mục ưu tiên 1–5 là kế hoạch, chưa tự thay đổi dashboard, truy vấn lịch sử, RAG hoặc hàng chờ chấm.

## Cập nhật triển khai dashboard ngày 20/11/2026

Đã triển khai riêng cache dashboard theo tài khoản, TTL 45 giây. Thay vì phụ thuộc hook invalidation ở từng API/worker, mỗi lần đọc kiểm tra dấu vân tay metadata các bài đã nộp và múi giờ; thay đổi dữ liệu tạo khóa mới. Cách này bao phủ cả thay đổi điểm từ worker và tránh truy vấn cũ ghi vào khóa mới. Đổi lại, cache hit còn một truy vấn metadata; cần tiếp tục đo với dữ liệu lớn trước khi cân nhắc bộ đếm revision lưu bền.

Bộ lọc gồm skill/part/range theo API hiện có. Mục thống kê bài thi và hồ sơ năng lực giữ nguyên phạm vi dữ liệu trước đây. Chưa triển khai các ưu tiên Redis khác (chủ đề, RAG retrieval, quota hoặc hàng chờ).
