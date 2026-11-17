# Hướng dẫn Redis Docker cho người pull code AptiMate

Cập nhật: 17/11/2026. Dành cho môi trường local, ưu tiên dự án đã có database và .env. Không cần migration hoặc chạy lại seed để dùng Redis.

## 1. Redis dùng để làm gì?

Redis hiện cache kết quả từ điển Anh–Việt (5 phút) và vector embedding chatbot (24 giờ). Điểm thi, feedback, lịch sử, checkpoint và hàng chờ AI vẫn lưu PostgreSQL. Redis không tăng quota Groq/Gemini và không tự sửa lỗi payload quá lớn.

Cấu hình đã có trong backend/compose.yaml:

| Thuộc tính | Giá trị |
| --- | --- |
| Image | redis:7.4-alpine |
| Container | aptimate-redis |
| Cổng máy host | 127.0.0.1:6379 |
| Giới hạn bộ nhớ dữ liệu Redis | 128 MB |
| Khi đầy bộ nhớ | allkeys-lru: loại key ít được dùng gần đây |
| Persistence | Tắt AOF và snapshot; cache có thể tái tạo |

Redis khởi động lại có thể mất cache, nhưng không mất dữ liệu bài làm. Backend tiếp tục xử lý từ nguồn gốc nếu Redis không sẵn sàng.

## 2. Chuẩn bị

- Pull code mới nhất, gồm package-lock.json và file Compose.
- Cài/mở Docker Desktop, chọn Linux containers và chờ Engine sẵn sàng.
- Dùng Docker Compose 2.20.3 trở lên; Compose ở thư mục gốc sử dụng include.
- Giữ nguyên backend/.env đang dùng. Chỉ khi cài mới và chưa có file này mới tạo từ .env.example rồi cấu hình ứng dụng theo README.
- Không cần cài Redis trực tiếp trên Windows. Backend Node.js chạy ngoài Docker cần phiên bản Node.js đáp ứng README và npm install trong backend.

Kiểm tra Docker:

```powershell
docker version
docker compose version
```

## 3. Bật riêng Redis sau khi pull

Chạy tại thư mục gốc repository, nơi có backend/, frontend/ và compose.yaml:

```powershell
docker compose up -d redis
docker compose ps redis
docker compose exec -T redis redis-cli ping
```

Kết quả mong muốn: container aptimate-redis Running/healthy, lệnh ping trả PONG. Lệnh up chỉ định redis không khởi tạo lại PostgreSQL hay seed dữ liệu.

Chọn MỘT cách chạy backend bên dưới, không chạy hai backend cùng cổng 3000.

## 4. Cách A — backend cũng chạy Docker

Compose đã cấu hình:

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379
```

redis là tên service trong mạng Docker; không dùng localhost để backend container kết nối Redis container.

Sau khi pull lần đầu có bổ sung thư viện ioredis, chạy từ thư mục gốc:

```powershell
docker compose up -d redis
docker compose up -d --build --no-deps backend
docker compose ps backend redis
docker compose logs --tail 80 backend
```

--no-deps giữ các service khác nguyên trạng; PostgreSQL và các phụ thuộc của backend cần đang hoạt động. Với người cài cả hệ thống lần đầu, làm theo README gốc để bật đầy đủ các dịch vụ.

Log mong muốn: Redis cache connected và backend khởi động thành công. Có thể kiểm tra API:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health/ready
```

Readiness thành công chỉ xác nhận backend sẵn sàng; cần thêm PONG/log để xác nhận Redis vì cache được thiết kế không chặn khởi động.

Compose ở thư mục gốc tự nạp compose.override.yaml cho watch mode. Chạy cùng lệnh trong backend/ sử dụng bản build cố định, sửa source sẽ cần build lại.

Các biến trong environment của Compose ghi đè env_file. Vì vậy chỉ đặt REDIS_ENABLED=false trong .env chưa tắt được Redis ở backend Docker khi Compose vẫn đặt true. Nếu muốn tắt cache cho backend Docker, đổi override environment tương ứng rồi tạo lại container backend.

## 5. Cách B — backend chạy Node.js trên máy, Redis chạy Docker

Nếu backend Docker đang chạy, dừng riêng service đó từ thư mục gốc:

```powershell
docker compose stop backend
```

Chỉ thêm/cập nhật ba dòng sau trong backend/.env, giữ nguyên các biến khác:

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
REDIS_KEY_PREFIX=aptimate:cache:v1
```

Sau đó:

```powershell
cd backend
npm install
npm run start:dev
```

Backend Node.js trên máy dùng cổng host 127.0.0.1:6379. Không dùng hostname redis ở cách này. PostgreSQL vẫn dùng cấu hình kết nối hiện có của bạn.

## 6. Kiểm tra cache thực tế

Nếu máy có Node.js và đã cài dependencies, mở terminal khác trong backend/:

```powershell
node node_modules/ts-node/dist/bin.js scripts/cache-smoke.ts
```

Script dùng REDIS_URL trong .env hoặc mặc định localhost. Nếu .env đặt redis://redis:6379 cho Docker, trong terminal kiểm tra riêng trên host có thể đặt:

```powershell
$env:REDIS_URL = 'redis://127.0.0.1:6379'
node node_modules/ts-node/dist/bin.js scripts/cache-smoke.ts
```

Biến trên chỉ áp dụng cho terminal hiện tại, không sửa file .env. Kết quả mong muốn: PASS cho cache dùng chung, hết hạn TTL và fallback khi client ngắt kết nối. Script chỉ ghi/xóa key smoke có UUID riêng, không gọi LLM hoặc thay đổi bài làm.

Nếu không cài Node.js trên máy, kiểm tra bằng Redis CLI và sử dụng chức năng tra từ trên ứng dụng:

```powershell
docker compose exec -T redis redis-cli --scan --pattern 'aptimate:cache:v1:*'
docker compose exec -T redis redis-cli INFO stats
docker compose exec -T redis redis-cli INFO memory
```

Cache chỉ xuất hiện sau khi sử dụng chức năng, và tự hết hạn; danh sách key rỗng không tự chứng minh Redis lỗi. Khi tra từ, kết quả cũng có thể lấy từ cache RAM hiện có.

## 7. Quản lý trực quan

Docker Desktop → Containers → nhóm backend → aptimate-redis: xem trạng thái, logs, CPU/RAM, Start/Stop.

Để xem key/value và TTL, có thể cài Redis Insight bản desktop theo tài liệu chính thức: https://redis.io/docs/latest/operate/redisinsight/install/install-on-desktop/

Thêm kết nối local: tên AptiMate Local, host 127.0.0.1, port 6379, database 0, TLS tắt. Username/password để trống với cấu hình local hiện tại. Tìm key theo prefix aptimate:cache:v1:*. Không cần đăng ký Redis Cloud để kết nối Redis local.

## 8. Bật/tắt và xử lý lỗi

Chạy từ thư mục gốc:

```powershell
docker compose stop redis
docker compose up -d redis
docker compose logs --tail 50 redis
```

| Lỗi | Cách kiểm tra/xử lý |
| --- | --- |
| Cannot connect to Docker daemon | Mở Docker Desktop, chờ Engine khởi động; kiểm tra docker version |
| Cổng 6379 đã được dùng | Kiểm tra container/tiến trình hiện có; không tự dừng Redis của dự án khác. Nếu đổi cổng host, cập nhật REDIS_URL của backend chạy trên host |
| Backend Docker không kết nối Redis | Xác nhận service redis chạy cùng Compose và URL là redis://redis:6379 |
| Backend Node.js không kết nối Redis | Xác nhận PONG và URL localhost; restart backend sau khi chỉnh .env |
| Cannot find module ioredis | Node.js: npm install. Docker: rebuild image backend |
| EADDRINUSE cổng 3000 | Chỉ chạy backend Docker hoặc Node.js, không chạy cả hai |
| Redis cache unavailable | Backend đang fallback; kiểm tra Redis và URL. Cache lỗi không đồng nghĩa dữ liệu database bị mất |

Không chạy docker compose down -v, reset database, migrate:revert hoặc seed lại để cài Redis. Không dùng FLUSHALL/FLUSHDB để kiểm thử trên môi trường dùng chung. File .env chứa secret không được commit.

Đây là cấu hình local chỉ mở cổng host loopback. Triển khai server thật cần mạng riêng, kiểm soát truy cập, ACL/password và TLS khi phù hợp; không mở Redis công khai ra Internet.
