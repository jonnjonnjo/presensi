# Kemnaker — Attendance API

## Tech Stack
- Express 5, TypeScript, Prisma 7, PostgreSQL 16, Docker, JWT, Swagger

## Schema
- `Karyawan` — employees (pre-seeded, no registration)
- `Presensi` — attendance records
- Enums: `Role` (ADMIN, WORKER), `StatusPresensi` (PRESENT, SICK, LEAVE, ABSENT)
- Soft delete via `deleted_at DateTime?`

## API Endpoints

### Auth
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/auth/login` | No | `{ email, password }` | `{ token }` |

### Worker
| Method | Endpoint | Auth | Body | Action |
|--------|----------|------|------|--------|
| POST | `/check-in` | Yes | (none) | Creates PRESENT record, check_in=now() |
| POST | `/attendance/:id/check-out` | Yes | (none) | Sets check_out=now() |
| POST | `/attendance` | Yes | `{ status, notes? }` | Creates SICK/LEAVE/ABSENT record |
| PUT | `/attendance/:id` | Yes | `{ status?, notes? }` | Updates own record |
| GET | `/attendance` | Yes | query params | Paginated, filterable, searchable |
| GET | `/attendance/:id` | Yes | — | Get own record |

### Admin
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/admin/attendance` | ADMIN | query params |
| POST | `/admin/attendance` | ADMIN | `{ karyawan_id, status, ... }` |
| GET | `/admin/attendance/:id` | ADMIN | — |
| PUT | `/admin/attendance/:id` | ADMIN | `{ status?, notes? }` |
| DELETE | `/admin/attendance/:id` | ADMIN | — |
| POST | `/admin/attendance/:id/restore` | ADMIN | — |

### Filtering (GET /attendance, GET /admin/attendance)
```
?page=1&limit=10&status=PRESENT&start_date=2026-07-01&end_date=2026-07-31&search=John&sort_by=attendance_date&order=asc
```

## Status Transitions (PUT)
| Current → Requested | Behavior |
|----------------------|----------|
| Any → PRESENT | Set check_in=now(), clear check_out |
| PRESENT → Non-PRESENT | Clear check_in and check_out |
| PRESENT → PRESENT | No timestamp change |
| Non-PRESENT → Non-PRESENT | Just change status |

## Folder Structure
```
src/
  middleware/
    auth.ts          — JWT verification
    roles.ts         — requireRole(ADMIN)
    validate.ts      — input validation (legacy, unused)
  routes/
    auth.ts          — POST /auth/login
    worker.ts        — worker endpoints
    admin.ts         — admin endpoints
  utils/
    response.ts      — success() / fail() helpers
  lib/
    prisma.ts        — PrismaClient singleton
  types/
    express.d.ts     — req.user type augmentation
  app.ts             — Express entry point
  swagger.ts         — OpenAPI spec
prisma/
  schema.prisma
  seed.ts
prisma.config.ts
```

## Execution Order
1. [x] MVP — flat schema (baseline branch)
2. [x] Schema — normalize to Karyawan + Presensi → migrate → seed
3. [x] Auth — login, JWT middleware, role middleware
4. [x] Worker routes — check-in, check-out, attendance CRUD
5. [x] Admin routes — full CRUD on all records
6. [x] GET attendance — pagination, filtering, search, sorting
7. [x] Soft delete — deleted_at + restore endpoint
8. [ ] Morgan logging
9. [x] Swagger annotations
10. [ ] Unit tests (Vitest)
