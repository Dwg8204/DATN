# Redis/cache và bộ đề bổ sung AptiMate

Ngày kiểm tra: 14/11/2026. Hướng dẫn này dành cho dự án đang có dữ liệu; không khởi tạo lại database.

## 1. Kết quả kiểm tra dữ liệu hiện tại

- 31 migration đã được áp dụng, không có migration còn chờ tại thời điểm kiểm tra.
- 28 đề sample và 140 đề expanded đều đã tồn tại, kiểm tra bằng ID sinh từ admin + component + requestId, không dựa vào tên đề.
- Roles ADMIN, STUDENT và admin khởi tạo đã tồn tại. Không chạy lại bootstrap để tránh tác động không cần thiết tới thông tin vai trò.
- Các script benchmark/backfill không phải seed bắt buộc; không tự chạy chúng.
- Thay đổi Redis và seed mới không cần migration. Không sửa migration hoặc seed cũ.

## 2. Groq dừng sau bốn part

Lượt full Writing `32e1cdbd-0235-4f38-9c08-c84feaef6f6e` có trạng thái FAILED, mã GROQ_HTTP_413, rule TOKEN_LIMIT_EXCEEDED, stage synthesis. Checkpoint đã có Part 1–4. Lượt Writing Part 4 mới hơn đã hoàn thành, nên không phải mọi lượt Groq đều lỗi.

Nguyên nhân: bước tổng hợp gửi bài làm, nhận xét part, judgments và evidence catalog trong một yêu cầu. Provider từ chối kích thước token của yêu cầu này. Đây không phải yêu cầu người dùng xác nhận sau mỗi bốn part, cũng không phải hai part đang chấm chồng nhau.

Worker coi 413 là không thể khắc phục chỉ bằng chờ, nên chuyển FAILED và giao diện cho Retry. Nếu inputHash không đổi, Retry dùng lại `reference_ai_jobs.config.writingParts` trong PostgreSQL và chạy bước tổng hợp; không gọi lại bốn part đã lưu. Redis không tham gia checkpoint này. Lặp lại cùng payload lớn có thể tiếp tục thất bại.

Đề xuất xử lý tiếp theo: đo token riêng request synthesis; loại phần dữ liệu lặp (đặc biệt catalog và nhận xét dài), dùng đánh giá part đã kiểm định và dẫn chứng có nguồn rõ ràng, thêm một nhánh tổng hợp gọn khi nhà cung cấp báo TOKEN_LIMIT_EXCEEDED. Không tự cắt câu trả lời của người học hoặc đổi CEFR thành trung bình điểm. Cần kiểm thử giữ nguyên tiêu chí và trích dẫn trước khi đổi luồng. Trong đợt thay đổi giao diện/cache/seed này chưa sửa prompt hoặc gọi chấm lại bài cũ.

## 3. Bộ seed mới

Namespace `aptimate-additional-tests-v1`, file `backend/src/database/seeds/seed-additional-tests.ts`.

| Kỹ năng | Full exam | Full practice | Practice từng part | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Grammar & Vocabulary | 5 | 5 | 10 | 20 |
| Reading | 5 | 5 | 20 | 30 |
| Listening | 5 | 5 | 20 | 30 |
| Writing | 5 | 5 | 20 | 30 |
| Speaking | 5 | 5 | 20 | 30 |
| Tổng | 25 | 25 | 90 | 140 |

Năm chủ đề: Technology, Gardening, Travel, Science, Wellbeing. Seed dùng cấu trúc bài của bộ expanded để tương thích bộ kiểm tra xuất bản hiện tại; dữ liệu chủ đề, từ vựng, tình huống và audio mới được đặt trong file riêng. Đây là bộ luyện tập sinh theo template, không phải đề chứng chỉ chính thức hay 140 nội dung full test hoàn toàn độc lập: mỗi bộ có biến thể exam, practice và các part tương ứng. Dictation/Flashcard không có cấu trúc đề thi cùng loại nên không đưa vào seed tests này.

Listening có 85 kịch bản, tạo bằng Windows David/Zira, chuyển MP3 bằng FFmpeg, kiểm tra thời lượng bằng ffprobe, upload Cloudinary. Mỗi URL gắn hash của đúng lời thoại; thiếu hoặc khác hash thì seed từ chối ghi dữ liệu. Speaking dùng hai ảnh được cung cấp: `Colleagues discussing a new project.jpg` và `A couple planning a weekend trip.jpg`; nội dung câu hỏi mô tả đúng hoạt động hội họp/lập kế hoạch. Giữ nguyên ảnh nguồn.

### Chạy trên Windows trong thư mục backend

```powershell
npm install
# Chỉ kiểm tra nội dung, không kết nối database:
node node_modules/ts-node/dist/bin.js src/database/seeds/seed-additional-tests.ts --dry-run
# Cần giọng Windows David/Zira và Cloudinary đã cấu hình trong .env:
node node_modules/ts-node/dist/bin.js scripts/prepare-additional-media.ts --upload
# Kiểm tra manifest đầy đủ:
node node_modules/ts-node/dist/bin.js src/database/seeds/seed-additional-tests.ts --dry-run --with-audio
# Kiểm tra URL rồi thêm đề trong một transaction:
node node_modules/ts-node/dist/bin.js src/database/seeds/seed-additional-tests.ts --apply
```

Đã có media manifest thì máy khác không cần tổng hợp lại audio. Commit các manifest URL/hash, không commit `.env`, MP3/WAV tạm trong uploads. Script upload ghi checkpoint sau từng file và không ghi đè media cũ. Nếu quá trình tạo audio dừng, chạy lại cùng lệnh. Việc upload sử dụng dung lượng/băng thông Cloudinary hiện có; không gọi Gemini/Groq hay sử dụng quota chấm bài.

Apply chỉ INSERT đề chưa có, không sửa đề đã tồn tại kể cả đã chỉnh sửa/lưu trữ. Dùng advisory lock để hai tiến trình seed cùng namespace không tạo trùng. Nếu có nhiều admin, chỉ định SAMPLE_SEED_ADMIN_ID bằng admin cần sở hữu đề; không tự tạo hoặc đổi vai trò tài khoản. Giữ nguyên giá trị này giữa các lần apply để giữ ID ổn định.

## 4. Thiết kế Redis phù hợp kiến trúc hiện tại

### Phạm vi đã triển khai

| Dữ liệu | Cache | TTL | Lý do |
| --- | --- | --- | --- |
| Tra từ Anh–Việt | Redis + cache RAM cũ | Redis 5 phút; RAM giữ chính sách cũ | Dùng chung kết quả, hạn chế giữ dữ liệu thiếu do provider tạm lỗi |
| Embedding chatbot | Redis | 24 giờ | Tránh gọi lại cùng văn bản/model/task/dimension |
| Điểm, feedback, lịch sử, bài đang làm | PostgreSQL | Không cache | Cần kết quả mới nhất và kiểm tra quyền |
| Checkpoint, retry, quota, lease AI | PostgreSQL | Không cache | Không đổi cơ chế hàng chờ hiện hành |

Cache-aside: đọc Redis → miss thì chạy nguồn hiện tại → lưu kết quả với TTL → trả về. Redis không phải nguồn dữ liệu gốc. Kết quả lỗi không được lưu; JSON hỏng hoặc sai cấu trúc được bỏ qua. Force refresh từ điển bỏ qua cache Redis và cache RAM. Giữ cơ chế gộp các tra cứu đang chạy của từ điển; không gộp embedding có AbortSignal khác nhau để tránh việc hủy một yêu cầu ảnh hưởng người khác.

Key gồm prefix phiên bản + loại dữ liệu + SHA-256 input. Embedding phân biệt RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT, mã model, dimension 768 và phiên bản chuẩn hóa. Không chứa nguyên văn câu hỏi, token hay API key. Value embedding chỉ chứa vector; từ điển chứa kết quả tra từ. Vector vẫn phải được bảo vệ bằng giới hạn truy cập Redis.

Timeout kết nối 800 ms, command 500 ms, tắt offline queue, retry kết nối có khoảng chờ tối đa 30 giây. Redis lỗi thì gọi nguồn bình thường; không chặn backend khởi động. Log lỗi không chứa URL có mật khẩu, input hoặc nội dung người học; tối đa một cảnh báo mỗi phút mỗi process. Khi kết nối phục hồi, có log Redis cache connected. Value tối đa 256 KiB.

Docker local: Redis 7.4 Alpine, maxmemory 128 MB, allkeys-lru, chỉ bind cổng host 127.0.0.1:6379, không AOF/snapshot vì đây là dữ liệu tái tạo được. Restart Redis có thể làm cache lạnh nhưng không mất bài làm. Không dùng Redis cache này để lưu session hoặc job quan trọng vì eviction có thể xóa key.

### Bật trên môi trường hiện tại

Chạy từ backend:

```powershell
docker compose up -d redis
docker compose exec -T redis redis-cli ping
```

Kết quả mong muốn: `PONG`. Chỉ thêm/sửa ba dòng trong `.env`, không copy đè toàn bộ file:

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
REDIS_KEY_PREFIX=aptimate:cache:v1
```

Nếu backend chạy trong Docker, compose đã dùng `REDIS_URL=redis://redis:6379`. Sau khi cài dependency ioredis, cần rebuild image backend:

```powershell
# Từ thư mục gốc dự án, giữ nguyên PostgreSQL và các volume:
docker compose up -d redis
docker compose up -d --build --no-deps backend
```

Nếu chạy Node.js trên máy, chỉ khởi động lại backend sau `npm install`. Có thể tắt bằng REDIS_ENABLED=false và restart backend; không cần sửa database. Không dùng `down -v`, reset database hoặc FLUSHALL.

### Kiểm thử runtime

```powershell
node node_modules/ts-node/dist/bin.js scripts/cache-smoke.ts
```

Script kiểm tra hai client dùng chung giá trị, TTL hết hạn và tiếp tục xử lý khi client ngắt kết nối. Chỉ ghi/xóa key smoke có UUID riêng. Không gọi LLM. Unit test kiểm tra dữ liệu cache hỏng, provider lỗi, key không lộ input, phân tách namespace, refresh và giới hạn kích thước.

Có thể theo dõi Redis bằng `docker compose exec -T redis redis-cli INFO stats` và `INFO memory`; xem keyspace_hits, keyspace_misses, evicted_keys và used_memory. So sánh độ trễ tra từ lặp lại, số request embedding thực tế trước/sau; không tự suy đoán mức cải thiện khi chưa đo.

### Các bước mở rộng sau khi đo hiệu quả

1. Cache danh mục đề công khai: TTL khoảng 30–60 giây, key gồm kỹ năng, purpose, trang, sort/filter và phiên bản. Sau publish/archive/edit thành công mới invalidation; không cache đáp án bị ẩn hoặc dữ liệu admin. Kiểm thử sửa đề phải hiện ngay trước khi bật.
2. Nếu nhiều backend instance, thêm distributed single-flight cho tác vụ an toàn, khóa có TTL và token-owner khi unlock. Không áp dụng khóa đơn giản vào luồng chấm AI có checkpoint/lease đang hoạt động.
3. Chỉ cân nhắc Redis/BullMQ cho worker khi có yêu cầu tải và thiết kế outbox, xử lý lặp, phục hồi restart và tương thích job cũ. Đây là một thay đổi kiến trúc riêng, không đưa vào đợt cache ban đầu.
4. Production: Redis riêng trong mạng nội bộ, ACL/password, rediss/TLS nếu qua mạng, secret manager, giới hạn RAM, giám sát lỗi/eviction; không public cổng 6379. Prefix khác nhau giữa dev/staging/production.

## 5. Kết quả thực hiện ngày 14/11/2026

- Đã chuẩn bị và kiểm tra 85 audio cùng 2 ảnh; apply tạo 140 đề mới, tổng số đề tăng từ 180 lên 320.
- Chạy lại seed: created=0, skipped=140. Số tài khoản vẫn là 3 và số lượt làm bài vẫn là 136 trước/sau thao tác.
- Redis do người vận hành bật bằng Docker; kiểm tra runtime cache-smoke đã PASS: cache dùng chung, TTL, fallback khi ngắt client.
- Đã thêm REDIS_ENABLED=true, REDIS_URL=redis://127.0.0.1:6379, REDIS_KEY_PREFIX=aptimate:cache:v1 vào .env local. Không ghi key/secret vào tài liệu.
- Backend: typecheck và build thành công; 99 test suites / 744 tests thành công. Frontend build thành công (còn cảnh báo chunk lớn có sẵn).
- Backend đang phục vụ health/ready trả 200. Cần restart backend Node.js hoặc rebuild/restart backend Docker theo hướng dẫn trên để chắc chắn tiến trình hiện hành nạp cấu hình Redis và dependency mới; việc smoke-test dùng một tiến trình kiểm tra riêng.

## 6. Tài liệu tham khảo

- Redis, [Key eviction](https://redis.io/docs/latest/develop/reference/eviction/): cache có thể tái tạo, maxmemory và chính sách eviction.
- Redis/ioredis, [tài liệu client](https://github.com/redis/ioredis): reconnect, offline queue, timeout và quản lý kết nối.

Tra cứu ngày 14/11/2026. Cấu hình trên là lựa chọn triển khai cho AptiMate, không phải cam kết Redis sẽ xử lý lỗi token hay tăng quota LLM.
