# AptiMate

## Chạy toàn bộ hệ thống bằng Docker Desktop

Cấu hình dành cho chạy local: PostgreSQL, Mailpit, NestJS backend và React frontend. Khi chạy từ thư mục gốc, Docker tự nạp `compose.override.yaml` để bật **tự cập nhật code**: NestJS chạy watch mode, frontend chạy Vite với hot reload. Không cần cài Node.js trên máy để chạy bằng Docker.

### Bắt đầu

1. Mở Docker Desktop và chờ Docker Engine sẵn sàng, dùng Linux containers. Cần Docker Compose 2.20.3 trở lên vì file Compose gốc dùng [include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/).
2. Giữ file `backend/.env` hiện có. Nếu cài mới, sao chép `backend/.env.example` thành `backend/.env`, cấu hình JWT secrets và các dịch vụ cần dùng. Với file mẫu, điền thông tin Cloudinary hoặc đặt `CLOUDINARY_ENABLED=false` nếu chưa dùng upload ảnh.
3. Dừng backend/frontend đang chạy bằng terminal (nếu có) để giải phóng cổng `3000` và `5173`.
4. Nhấp đúp **`start-docker.cmd`** ở thư mục gốc. File này chuẩn bị image phát triển, chạy các container ở nền, chờ healthcheck và mở trình duyệt. Lần đầu cần Internet để tải image và dependencies. Sau khi đã bật, cứ lưu code để ứng dụng tự cập nhật.

Hoặc chạy từ thư mục gốc:

```bash
docker compose up -d --build --wait --wait-timeout 180
```

| Dịch vụ | Địa chỉ |
| --- | --- |
| Giao diện | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Mailpit (hộp thư thử nghiệm) | http://localhost:8025 |
| PostgreSQL từ pgAdmin | localhost:5433 |

### Những lần chạy tiếp theo — không cần gõ lệnh

Trong **Docker Desktop → Containers**, tìm nhóm **`backend`** rồi bấm **Start/Stop** cho cả nhóm. Nhóm gồm `aptimate-postgres`, `aptimate-mailpit`, `aptimate-backend` và `aptimate-frontend`. Tên nhóm được giữ từ cấu hình cũ để tiếp tục dùng volume **`backend_aptimate_postgres_data`**.

Bạn cũng có thể nhấp đúp `start-docker.cmd` để bật và mở website, hoặc `stop-docker.cmd` để dừng. Các container có `restart: unless-stopped`: container đang chạy sẽ chạy lại khi Docker Engine khởi động lại; nếu đã bấm Stop thì cần Start lại. Docker Desktop phải đang hoạt động.

### Cập nhật code và cấu hình

Khi sửa code trong `frontend/src`, Vite cập nhật giao diện trong trình duyệt. Khi sửa code trong `backend/src`, NestJS tự biên dịch và khởi động lại tiến trình API bên trong container (thường mất vài giây). **Không cần build lại image, chạy lại script hay restart container khi sửa code thông thường.** Các thư mục source được mount trực tiếp từ máy; dependencies Linux nằm trong image. Watcher dùng polling để nhận thay đổi khi sửa file trên Windows/Docker Desktop.

Các trường hợp cần thao tác thêm:

- Thêm/xóa/nâng phiên bản thư viện trong `package.json` hoặc `package-lock.json`, sửa Dockerfile hay Compose: chạy lại `start-docker.cmd` một lần để build/cập nhật container.
- Sửa `backend/.env`: chạy lại `start-docker.cmd` để nạp môi trường mới; chỉ bấm Restart không nạp lại `.env`.
- Thêm migration: chạy migration có chủ đích theo phần bên dưới. Watch mode không cập nhật schema database.

- Backend đọc khóa API, JWT và SMTP từ `backend/.env`. Compose ghi đè kết nối database thành `postgres:5432`, các cổng local và đường dẫn FFmpeg/FFprobe của Linux.
- SMTP bên ngoài (ví dụ Gmail) được giữ nguyên. Nếu `SMTP_HOST` là `localhost`, `127.0.0.1` hoặc `::1`, entrypoint chuyển thành `mailpit`; cấu hình Mailpit dùng cổng `1025`, `SMTP_SECURE=false`, user/password để trống. Mailpit chỉ nhận email khi ứng dụng được cấu hình gửi đến nó.
- Frontend trong Docker dùng `/api/v1` qua Vite proxy, gồm cả WebSocket. File `frontend/.env` vẫn dùng cho chạy Vite trực tiếp; không được đưa vào image.
- File `.env` và thư mục `node_modules` trên Windows không được đưa vào build context. Dependencies được cài riêng cho Linux.
- Tệp đính kèm dùng thư mục `backend/uploads` hiện có và tồn tại sau khi recreate container. Database dùng lại volume cũ. Không dùng `docker compose down -v` trừ khi chủ động muốn xóa database.
- Cấu hình này dùng HTTP local với `NODE_ENV=development` để cookie đăng nhập hoạt động. Khi triển khai Internet cần cấu hình riêng cho HTTPS, domain, secrets và cổng công khai.

### Chạy bản build cố định để demo

Nếu muốn chạy backend đã biên dịch và frontend Nginx, không tự cập nhật theo source, dùng cấu hình gốc trong `backend` (không nạp override phát triển):

```bash
docker compose -f backend/compose.yaml up -d --build --wait
```

Để quay lại chế độ tự cập nhật, chạy `start-docker.cmd` hoặc `docker compose up -d --build --wait` từ thư mục gốc. Hai chế độ dùng cùng container và database, mỗi thời điểm chạy một chế độ.

### Database mới hoặc có migration mới

Khởi động container **không tự migrate hoặc seed**. Với database hiện tại đã hoàn thiện, không cần seed lại. Khi cài trên database trống hoặc cần cập nhật schema, chạy từ thư mục gốc:

```bash
docker compose build backend
docker compose up -d --wait postgres mailpit
docker compose run --rm --no-deps backend npm run db:migrate:status
# Sau khi kiểm tra các migration đang chờ:
docker compose run --rm --no-deps backend npm run db:migrate
# Chỉ cần bootstrap database mới; điền ADMIN_SEED_EMAIL/PASSWORD trong backend/.env:
docker compose run --rm --no-deps backend npm run db:seed
docker compose up -d --build --wait
```

### Kiểm tra và xử lý lỗi

```bash
docker compose ps
docker compose logs --tail=100 backend frontend
docker compose stop
```

Nếu backend không healthy, xem log để kiểm tra `.env`, database và migration. Nếu cổng đã được sử dụng, dừng tiến trình chạy local hoặc container khác đang giữ cổng đó. Không chạy đồng thời backend bằng terminal và Docker để tránh trùng worker xử lý nền.

Chạy Compose từ thư mục gốc để dùng chế độ tự cập nhật. Chạy trong thư mục `backend` dùng bản build cố định. Hướng dẫn phát triển bằng Node.js và các tính năng backend nằm trong [backend/README.md](backend/README.md).
