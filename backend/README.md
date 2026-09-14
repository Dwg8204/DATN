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

3. Kiểm tra và thay các secret phát triển trong `.env`. Không commit file `.env`.
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
# Tạo và chạy PostgreSQL ở background
docker compose up -d postgres

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

# Tạo/cập nhật idempotent các role ADMIN, TEACHER, STUDENT
npm run db:seed
```

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
```

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

Each business module lives under `src/modules/<module-name>` and owns its controllers, services, DTOs, repositories and entities. Shared HTTP concerns live under `src/common`; migrations stay centralized under `src/database/migrations` so the team has one ordered schema history.

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
