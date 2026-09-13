# AptiMate Backend

Modular monolith backend for the AptiMate learning platform. The application uses NestJS, TypeScript, TypeORM and PostgreSQL.

## Requirements

- Node.js 20.19+ (or a newer active LTS release)
- npm
- Docker Desktop, or a PostgreSQL 17 server with `pgcrypto`, `citext` and `vector`

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm install`.
4. Apply migrations: `npm run db:migrate`.
5. Seed fixed roles: `npm run db:seed`.
6. Start the API: `npm run start:dev`.

The API is available at `http://localhost:3000/api/v1`. Swagger is available at `http://localhost:3000/api/docs`.

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
