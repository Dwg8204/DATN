# AptiMate Backend

Modular monolith backend for the AptiMate learning platform. The application uses NestJS, TypeScript, TypeORM and PostgreSQL.

## Requirements

- Node.js 20.19+ (or a newer active LTS release)
- npm
- Docker Desktop, or a PostgreSQL 17 server with `pgcrypto`, `citext` and `vector`

## Chạy dự án lần đầu

Mọi lệnh bên dưới được chạy trong thư mục `backend`.

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Tạo file môi trường từ file mẫu:

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

3. Kiểm tra và thay các secret phát triển trong `.env`. Điền `ADMIN_SEED_EMAIL` và `ADMIN_SEED_PASSWORD` để tạo tài khoản Admin khởi tạo. Không commit file `.env`.
4. Khởi động PostgreSQL theo một trong hai cách ở phần tiếp theo.
5. Tạo schema và dữ liệu nền:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. Chạy API ở chế độ phát triển:

   ```bash
   npm run start:dev
   ```

API: `http://localhost:3000/api/v1`

Swagger: `http://localhost:3000/api/docs`

### Chạy PostgreSQL bằng Docker (khuyến nghị cho local)

Docker sử dụng image PostgreSQL 17 có sẵn extension `pgvector`. Cổng máy host là `5433` để không xung đột với PostgreSQL mặc định ở cổng `5432`.

```bash
# Tạo và chạy PostgreSQL cùng SMTP local ở background
docker compose up -d postgres mailpit

# Kiểm tra trạng thái; chờ đến khi container báo healthy
docker compose ps

# Xem log database
docker compose logs -f postgres

# Dừng container nhưng vẫn giữ dữ liệu
docker compose stop postgres

# Chạy lại container đã dừng
docker compose start postgres

# Dừng và gỡ container/network, vẫn giữ volume dữ liệu
docker compose down
```

Không chạy `docker compose down -v` nếu chưa chủ động muốn xóa toàn bộ database local.

Thông tin kết nối Docker, cũng là thông tin dùng để đăng ký server trong pgAdmin 4:

| Thuộc tính | Giá trị |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5433` |
| Maintenance database | `aptimate` |
| Username | `aptimate` |
| Password | `aptimate` |
| SSL mode | `Prefer` hoặc `Disable` |

Sau khi kết nối bằng pgAdmin 4, các bảng nằm tại `Databases > aptimate > Schemas > public > Tables`.

### Kiểm thử email OTP bằng SMTP local

Compose có dịch vụ Mailpit chạy SMTP ở `127.0.0.1:1025`. Với cấu hình mặc định trong `.env.example`, email quên mật khẩu được gửi tới Mailpit và có thể xem tại:

`http://localhost:8025`

Mailpit chỉ dùng cho phát triển, không gửi email ra Internet. Khi deploy, thay `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` và `SMTP_FROM` bằng thông tin SMTP thật. Với Gmail cần dùng App Password, không dùng trực tiếp mật khẩu tài khoản.

### Dùng PostgreSQL cài trực tiếp trên máy

PostgreSQL phải hỗ trợ các extension `pgcrypto`, `citext` và `vector`. Tạo database/user, sau đó sửa `DATABASE_URL` trong `.env`, ví dụ:

```dotenv
DATABASE_URL=postgresql://aptimate:your_password@localhost:5432/aptimate
DB_SSL=false
```

Migration sẽ tự bật ba extension. Tài khoản kết nối cần quyền `CREATE EXTENSION` và quyền tạo schema/table trong database.

## Migration và seed

```bash
# Xem migration nào đã/chưa chạy
npm run db:migrate:status

# Chạy toàn bộ migration còn thiếu
npm run db:migrate

# Hoàn tác migration gần nhất (cẩn thận vì có thể mất dữ liệu)
npm run db:migrate:revert

# Tạo migration mới sau khi thay đổi entity/schema
npm run db:migrate:generate -- src/database/migrations/TenMigration

# Tạo/cập nhật role và tạo duy nhất một tài khoản Admin khởi tạo
npm run db:seed
```

Lệnh seed yêu cầu `ADMIN_SEED_EMAIL` và `ADMIN_SEED_PASSWORD` trong `.env`; hệ thống không cung cấp thông tin đăng nhập mặc định. Mật khẩu chỉ được dùng khi tạo Admin lần đầu, được băm bằng bcrypt và không được ghi ra log. `ADMIN_SEED_FIRST_NAME` và `ADMIN_SEED_LAST_NAME` có giá trị mặc định lần lượt là `System` và `Administrator`.

Seed có thể chạy lại an toàn với cùng email Admin và sẽ không tạo bản ghi trùng hoặc đặt lại mật khẩu. Nếu database đã có Admin dùng email khác, có nhiều hơn một Admin, hoặc email cấu hình đang thuộc về Student/Teacher, seed sẽ dừng mà không tự nâng/hạ quyền hay sửa dữ liệu tài khoản. Việc tạo Admin là thao tác bootstrap trực tiếp vào database; API quản lý người dùng không được dùng để tạo Admin.

Quy trình khi thêm thay đổi database:

1. Không sửa migration đã được chia sẻ cho thành viên khác.
2. Tạo migration mới và đặt tên mô tả đúng nghiệp vụ.
3. Chạy `db:migrate:status`, `db:migrate`, rồi kiểm tra schema trên pgAdmin 4.
4. Chạy `npm run typecheck`, `npm test` và `npm run build` trước khi commit.

Để tạo lại database local hoàn toàn từ đầu, chỉ thực hiện khi chắc chắn không cần dữ liệu hiện có:

```bash
docker compose down -v
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

## Chạy và kiểm tra ứng dụng

```bash
npm run start:dev     # watch mode
npm run build         # build production
npm run start:prod    # chạy bản đã build trong dist
npm run lint
npm run typecheck
npm test
npm run test:e2e  # yêu cầu TEST_DATABASE_URL trỏ tới database riêng, tên kết thúc bằng _test, đã migrate và seed
```

## Xác thực JWT và mật khẩu

Module nằm tại `src/features/auth` và được chia thành `controllers`, `services`, `repositories`, `dto`, `guards`, `decorators`, `strategies` và `types`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản học viên |
| `POST` | `/api/v1/auth/login` | Đăng nhập và đặt access/refresh cookie `HttpOnly` |
| `POST` | `/api/v1/auth/refresh` | Rotation refresh token và thay access cookie mới |
| `POST` | `/api/v1/auth/logout` | Thu hồi phiên hiện tại |
| `POST` | `/api/v1/auth/logout-all` | Thu hồi toàn bộ phiên của tài khoản |
| `GET` | `/api/v1/auth/me` | Đọc người dùng hiện tại |
| `POST` | `/api/v1/auth/forgot-password/request-otp` | Gửi OTP qua SMTP |
| `POST` | `/api/v1/auth/forgot-password/verify-otp` | Xác minh OTP và cấp reset token ngắn hạn |
| `POST` | `/api/v1/auth/forgot-password/reset` | Đặt lại mật khẩu bằng reset token |
| `PATCH` | `/api/v1/auth/change-password` | Đổi mật khẩu khi đã đăng nhập |

Access token, refresh token và reset token đều nằm trong cookie `HttpOnly`; frontend không lưu token trong `localStorage` và phải bật `withCredentials`. Access cookie chỉ được gửi tới API, refresh cookie chỉ được gửi tới nhóm endpoint auth, còn reset cookie chỉ được gửi tới luồng quên mật khẩu. Đăng xuất thu hồi cả phiên; đặt lại hoặc đổi mật khẩu thu hồi toàn bộ phiên, kể cả access token đã cấp. Migration `TrackAuthSessions` thêm phiên bản xác thực nên người dùng có token tạo trước khi migrate cần đăng nhập lại.

Tên cookie xác thực là `aptimate_access_token` và `aptimate_refresh_token`. Do có cờ `HttpOnly`, chúng không xuất hiện qua `document.cookie`; kiểm tra tại DevTools > Application > Cookies > `http://localhost:3000`, hoặc xem header `Set-Cookie` của request đăng nhập. Khi phát triển local, hãy mở frontend bằng `http://localhost:5173` thay vì trộn `localhost` với `127.0.0.1`, đồng thời giữ `VITE_API_BASE_URL=http://localhost:3000/api/v1` và `FRONTEND_ORIGIN=http://localhost:5173` để trình duyệt chấp nhận cookie.

Các endpoint gửi/kiểm tra OTP và đăng nhập có rate limit. OTP có thời hạn, giới hạn số lần nhập sai và chỉ được lưu dạng HMAC; refresh/reset token trong database cũng chỉ lưu dạng hash.

### Phân quyền theo vai trò

Role lấy từ access token chỉ dùng để định danh nhanh; `JwtStrategy` luôn đọc lại tài khoản trong database trước khi gắn `request.user`. Frontend cũng chờ `/api/v1/auth/me` hoàn tất trước khi mở khu vực quản trị, nên role sửa thủ công trong `localStorage` không được dùng làm căn cứ cấp quyền.

Ma trận quyền hiện tại:

| Khu vực | STUDENT | TEACHER | ADMIN |
| --- | --- | --- | --- |
| Trang luyện thi và hồ sơ | Có | Có | Có |
| Test Management | Không | Có | Có |
| Admin Dashboard | Không | Không | Có |
| User Management | Không | Không | Có |
| Notification Management | Không | Không | Có |

Mọi controller nghiệp vụ mới phải bảo vệ ở backend, không chỉ ẩn giao diện. Ví dụ:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@Post('tests')
createTest() {}
```

Các API quản lý người dùng chỉ khai báo `@Roles('ADMIN')`. `RolesGuard` trả `403 FORBIDDEN` khi tài khoản đã đăng nhập nhưng không đủ quyền; `JwtAuthGuard` trả `401` khi chưa có phiên hợp lệ.

### Quản lý người dùng

Các endpoint sau chỉ dành cho tài khoản `ADMIN`:

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/api/v1/admin/users` | Tìm kiếm, lọc theo role/status và phân trang trên server |
| `GET` | `/api/v1/admin/users/:id` | Xem chi tiết tài khoản |
| `POST` | `/api/v1/admin/users` | Tạo duy nhất tài khoản Teacher |
| `PATCH` | `/api/v1/admin/users/:id/role` | Chỉ nâng `STUDENT` thành `TEACHER` |
| `DELETE` | `/api/v1/admin/users/:id` | Xóa mềm Student/Teacher và thu hồi phiên |

API không có luồng tạo Admin hoặc nâng Teacher thành Admin. Tài khoản Admin khởi tạo chỉ được tạo trực tiếp bằng seed; tài khoản Admin không thể bị sửa role hoặc xóa qua API. Khi tạo Teacher, backend tự gán role `TEACHER` và trạng thái `ACTIVE`, đồng thời từ chối các trường `role`/`status` do client chèn thêm.

SMTP dùng connection pool để tái sử dụng kết nối và có timeout cấu hình qua `SMTP_CONNECTION_TIMEOUT_MS`, `SMTP_GREETING_TIMEOUT_MS`, `SMTP_SOCKET_TIMEOUT_MS`. API chỉ xác nhận gửi OTP sau khi SMTP chấp nhận email; frontend hiển thị trạng thái loading trong thời gian này.

Frontend mặc định kết nối `http://localhost:3000/api/v1`. Khi dùng URL khác, cấu hình:

```dotenv
VITE_API_BASE_URL=https://your-api.example.com/api/v1
```

### Upload ảnh cover bằng Cloudinary

Backend upload ảnh cover lên Cloudinary và chỉ lưu URL HTTPS trong trường `tests.cover`; dữ liệu ảnh base64 không được lưu vào PostgreSQL. Tạo tài khoản/Media Library trên Cloudinary rồi tự điền khóa thật vào `backend/.env`:

```dotenv
CLOUDINARY_ENABLED=true
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=aptimate/test-covers
```

Không commit `CLOUDINARY_API_SECRET`. Khi `CLOUDINARY_ENABLED=false`, các chức năng khác vẫn chạy nhưng API upload cover sẽ trả lỗi cấu hình rõ ràng. Endpoint `POST /api/v1/admin/media/test-covers` nhận trường multipart `file`, giới hạn 10 MB và chỉ chấp nhận JPEG, PNG, WebP hoặc GIF hợp lệ. Cloudinary tự giới hạn ảnh về tối đa 1600 × 1200 và tối ưu định dạng/chất lượng trước khi trả URL.

### Admin Dashboard

`GET /api/v1/admin/dashboard?period=12-months` chỉ dành cho Admin và trả hai chỉ số `activeLearners`, `newUsers` cùng chuỗi dữ liệu `testsCreated`, `testActivity` theo năm kỹ năng. Các giá trị `period` hợp lệ gồm `this-year`, `12-months`, `6-months`, `30-days`, `week` và `24-hours`. Dữ liệu được phân nhóm theo múi giờ `Asia/Bangkok` và cache 30 giây để giảm truy vấn tổng hợp lặp lại.

Sau khi cập nhật code Dashboard, chạy `npm run db:migrate` để thêm các index thời gian phục vụ truy vấn thống kê.

### CRUD Grammar & Vocabulary

Admin và Teacher sử dụng `/api/v1/admin/grammar-tests`; Teacher chỉ quản lý đề do mình tạo. Đề được lưu theo một aggregate gồm thông tin đề và toàn bộ câu hỏi của Part 1, Part 2 hoặc Full test. Lưu nháp cho phép nội dung chưa hoàn chỉnh; thao tác publish mới kiểm tra đủ 25 câu Grammar và 5 nhóm × 5 câu Vocabulary rồi tạo snapshot bất biến.

Các API `/api/v1/grammar-tests` chỉ trả đề đã xuất bản. API chi tiết dành cho học viên loại bỏ hoàn toàn đáp án đúng và phần giải thích; các dữ liệu này chỉ được trả sau khi có luồng nộp/chấm bài được phân quyền riêng.

Health endpoints:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

## Database rules

- `synchronize` stays disabled in every environment.
- Every schema change is represented by a new migration.
- Do not edit a migration after teammates have applied it; add another migration.
- Run `npm run db:migrate:status` before and after applying changes.
- Production deployments run migrations as a separate release step.
- Roles are seeded idempotently with `npm run db:seed`.

The current baseline contains 33 business tables. It keeps `questions`, uses `tests.part_contents`, and omits `delivery_rules`, `response_rules`, `evaluation_guidance`, `attempt_question_results` and the removed attempt fields agreed by the team.

## Module convention

Each business module lives under `src/features/<module-name>` and owns its controllers, services, DTOs, repositories and types. Shared HTTP concerns live under `src/common`; migrations stay centralized under `src/database/migrations` so the team has one ordered schema history.

Controllers translate HTTP requests. Services own business rules and transaction boundaries. Repositories hold non-trivial persistence queries. DTOs validate untrusted input. Avoid adding empty directories until a module actually needs them.

## Shared API contract

Validation removes no unknown fields silently: unknown input returns HTTP 400. Errors follow this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email must be an email",
    "fieldErrors": [
      { "field": "email", "code": "INVALID_VALUE", "message": "email must be an email" }
    ]
  },
  "requestId": "f31771ab-184f-4fba-a637-2d47280be219",
  "timestamp": "2026-09-13T12:00:00.000Z"
}
```

List endpoints use `page` and `pageSize` (`1..100`) and return:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 }
}
```

Every response includes `x-request-id`; request logs contain the same ID, method, route, status and duration. Secrets, access tokens, passwords and full student submissions must not be logged.
