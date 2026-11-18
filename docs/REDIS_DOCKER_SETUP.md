# Hướng dẫn Redis Docker cho người pull code AptiMate

Cập nhật: 17/11/2026. Dành cho môi trường local, ưu tiên dự án đã có database và .env. Không cần migration hoặc chạy lại seed để dùng Redis.

## 1. Redis dùng để làm gì?

Redis hiện cache kết quả từ điển Anh–Việt (5 phút), vector embedding chatbot (24 giờ) và danh sách đề đã xuất bản (2 phút). Danh sách đề được vô hiệu hóa sau khi API quản trị thay đổi đề thành công; trạng thái và điểm theo người dùng vẫn lấy riêng từ PostgreSQL. Chi tiết và kế hoạch mở rộng: [Cache danh sách đề và lộ trình Redis](REDIS_CATALOG_AND_ROADMAP.md). Điểm thi, feedback, lịch sử, checkpoint và hàng chờ AI vẫn lưu PostgreSQL. Redis không tăng quota Groq/Gemini và không tự sửa lỗi payload quá lớn.

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

## 9. Cài Redis không dùng Docker trên Windows

Có hai lựa chọn:

- **Ubuntu qua WSL:** chạy Redis trong môi trường Linux trên Windows.
- **Memurai:** server tương thích Redis chạy trực tiếp trên Windows, phù hợp khi không dùng được WSL.

Chỉ chọn một cách. Không chạy nhiều server trên cùng cổng 6379.

### 9.1. Cách A — Redis trong Ubuntu/WSL

Mở PowerShell với quyền Administrator:

```powershell
wsl --install -d Ubuntu
```

Khởi động lại máy nếu được yêu cầu, mở Ubuntu và tạo tài khoản Linux. Nếu đã cài Ubuntu thì không cần cài lại; kiểm tra bằng:

```powershell
wsl -l -v
```

Trong terminal **Ubuntu**, chạy:

```bash
sudo apt update
sudo apt install redis-server redis-tools
sudo service redis-server start
redis-cli ping
```

Kết quả mong muốn: `PONG`.

Đây là Redis từ kho Ubuntu, phiên bản có thể khác image Docker của dự án. Kiểm tra phiên bản:

```bash
redis-server --version
```

Các lệnh quản lý trong Ubuntu, chạy riêng theo nhu cầu:

```bash
sudo service redis-server start
sudo service redis-server status
sudo service redis-server stop
```

Sau khi khởi động lại Windows, mở Ubuntu và bật Redis nếu dịch vụ chưa chạy.

Từ PowerShell, kiểm tra kết nối:

```powershell
Test-NetConnection 127.0.0.1 -Port 6379
```

Mong muốn: `TcpTestSucceeded : True`.

WSL 2 vẫn cần hỗ trợ ảo hóa. Nếu máy không dùng được WSL, sử dụng cách B.

### 9.2. Cách B — Memurai chạy trực tiếp Windows

Memurai là server tương thích Redis, không phải ứng dụng quản lý Redis Insight.

1. Tải tại https://www.memurai.com/get-memurai.
2. Chọn **Memurai for Redis — Developer Edition** và đọc điều khoản.
3. Chạy bộ cài MSI với quyền Administrator.
4. Chọn cài thành Windows service, dùng cổng 6379 nếu cổng chưa bị chiếm.
5. Không cần mở firewall cho truy cập từ máy khác khi chỉ dùng local.
6. Mở `services.msc`, tìm Memurai và kiểm tra trạng thái Running.

Kiểm tra trong PowerShell, điều chỉnh đường dẫn nếu cài nơi khác:

```powershell
& 'C:\Program Files\Memurai\memurai-cli.exe' -h 127.0.0.1 -p 6379 ping
```

Kết quả mong muốn: `PONG`.

Có thể Start, Stop hoặc Restart dịch vụ trong Windows Services.

Theo thông tin nhà cung cấp đối chiếu ngày 17/11/2026, Developer Edition dành cho phát triển/kiểm thử, không dùng production và cần khởi động lại sau tối đa 10 ngày chạy. Kiểm tra lại điều khoản khi tải.

### 9.3. Cấu hình cache local

Chỉ áp dụng cho instance mới dành riêng cho cache AptiMate.

- Ubuntu: sửa `/etc/redis/redis.conf`.
- Memurai: sửa `memurai.conf` trong thư mục cài đặt bằng quyền Administrator.

Tìm và cập nhật các thiết lập tương ứng:

```conf
bind 127.0.0.1
protected-mode yes
maxmemory 128mb
maxmemory-policy allkeys-lru
appendonly no
save ""
```

Khởi động lại dịch vụ sau khi sửa.

Cấu hình này giới hạn bộ nhớ và không lưu cache bền vững. Không áp dụng việc tắt persistence cho server dùng chung có dữ liệu cần giữ lại. Không mở Redis công khai ra Internet.

## 10. Cài Redis Insight để quản lý trên desktop

Redis Insight là giao diện xem và quản lý dữ liệu. Cài Redis Insight không tự tạo Redis server; cần hoàn thành mục 9 hoặc bật Redis Docker trước.

Tải bộ cài theo hệ điều hành tại:

https://redis.io/docs/latest/operate/redisinsight/install/install-on-desktop/

Sau khi cài:

1. Mở Redis Insight.
2. Chọn thêm database bằng kết nối thủ công.
3. Điền cấu hình local:

| Trường | Giá trị |
| --- | --- |
| Tên kết nối | AptiMate Local |
| Host | 127.0.0.1 |
| Port | 6379 |
| Database | 0 |
| TLS | Tắt với cấu hình local này |
| Username/password | Để trống nếu server chưa cấu hình xác thực |

Nếu server đã có mật khẩu/ACL, sử dụng tài khoản được cấp; không bỏ xác thực để làm theo ví dụ.

4. Lưu và mở kết nối.
5. Trong Browser, tìm `aptimate:cache:v1:*`.
6. Xem giá trị, loại dữ liệu và TTL của từng key.

Không cần đăng ký Redis Cloud để kết nối server local.

Cache chỉ xuất hiện khi ứng dụng sử dụng chức năng tương ứng. Danh sách key rỗng không tự chứng minh kết nối lỗi.

Có thể chạy các lệnh sau trong CLI/Workbench:

```text
PING
INFO memory
INFO stats
```

Không dùng `FLUSHALL` hoặc `FLUSHDB` để kiểm thử trên dữ liệu dùng chung.

Đóng Redis Insight không dừng Redis server. Muốn dừng server, sử dụng Windows Services, Ubuntu hoặc Docker tùy cách cài.

## 11. Kết nối backend chạy ngoài Docker

Trong `backend/.env`, thêm hoặc cập nhật ba dòng sau, tránh khai báo trùng:

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
REDIS_KEY_PREFIX=aptimate:cache:v1
```

Giữ nguyên các biến PostgreSQL, API key và cấu hình khác.

Hostname `redis` trong `redis://redis:6379` dành cho mạng Docker Compose; backend chạy trực tiếp Windows sử dụng địa chỉ local như trên.

Trong PowerShell tại thư mục `backend`:

```powershell
npm install
node node_modules/ts-node/dist/bin.js scripts/cache-smoke.ts
npm run start:dev
```

Chạy lần lượt. Kết quả mong muốn:

- Smoke test PASS cho cache, TTL và fallback.
- Backend có log `Redis cache connected`.
- Redis Insight xem được key khi chức năng bắt đầu tạo cache.

Nếu backend đang chạy, khởi động lại tiến trình đó để đọc `.env`; không mở thêm backend cùng cổng 3000.

Nếu từng đặt `$env:REDIS_URL` trong terminal, mở terminal mới để tránh biến môi trường cũ ghi đè `.env`.

Smoke test không gọi LLM hoặc thay đổi bài làm. Không cần chạy migration, seed lại hoặc reset PostgreSQL để cài Redis.

## 12. Xử lý lỗi khi không dùng Docker

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Redis Insight không kết nối được | Kiểm tra Redis/Memurai đang chạy và lệnh ping trả PONG |
| WSL trả PONG nhưng Windows không kết nối được | Kiểm tra localhost forwarding của WSL, VPN/firewall và cổng 6379; không mở bind công khai để bỏ qua lỗi |
| Cổng 6379 đã được dùng | Kiểm tra server/container hiện có; không tự dừng dịch vụ của dự án khác |
| Backend báo Redis cache unavailable | Kiểm tra REDIS_URL và khởi động lại backend |
| Memurai Developer tự dừng sau nhiều ngày | Kiểm tra giới hạn phiên bản và khởi động lại dịch vụ |
| Không cài được server Redis | Tạm đặt REDIS_ENABLED=false cho backend Node.js và khởi động lại |

Redis là cache bổ sung; PostgreSQL vẫn lưu bài làm, kết quả và lịch sử. Tắt Redis không xóa các dữ liệu này.

Tài liệu tham khảo:

- WSL: https://learn.microsoft.com/en-us/windows/wsl/install
- Redis trên WSL: https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-database
- Memurai: https://docs.memurai.com/en/installation
- Giới hạn Memurai: https://www.memurai.com/get-memurai
- Redis Insight: https://redis.io/docs/latest/operate/redisinsight/install/install-on-desktop/

