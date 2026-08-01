# THOUGHTS — Kemnaker Design Decisions

## 1. Project Genesis

Started from a flat `RecordPresensi` schema with `employee_name` as a string field (baseline branch). Decided to normalize into 2 tables:

- **Karyawan** — employee identity (name, email, password, role)
- **Presensi** — attendance records (date, times, status, notes)

**Why normalize?**
1. JWT authentication needs a user entity — you can't log in as a raw string
2. Prevents name duplication (multiple "John Doe" entries would be indistinguishable)
3. Real-world attendance systems tie records to identities, not name strings
4. Separação de concerns — employee data vs attendance data are different domains
5. Enables future features: employee management, profiles, department assignments

---

## 2. Schema Deep Dive

### Karyawan
| Field | Type | Reason |
|---|---|---|
| `id` | `String @id @default(uuid())` | UUID over serial: no sequential guessing, distributed-safe |
| `name` | `String @db.VarChar(100)` | Length constraint prevents garbage data |
| `email` | `String @unique @db.VarChar(255)` | Unique identifier for login; VarChar(255) matches RFC 5321 |
| `password` | `String @db.VarChar(255)` | Bcrypt hashes fit in 60 chars, 255 for future-proofing |
| `role` | `Role @default(WORKER)` | Enables authorization — ADMIN vs WORKER access control |
| `presensi` | `Presensi[]` | One-to-many relation |
| `created_at` / `updated_at` | `DateTime` | Audit timestamps |

### Presensi
| Field | Type | Reason |
|---|---|---|
| `id` | `String @id @default(uuid())` | Same UUID rationale |
| `karyawan_id` | `String` | Foreign key to Karyawan |
| `attendance_date` | `DateTime @default(now()) @db.Date` | PostgreSQL native DATE type — stores date only, no time component |
| `check_in` | `DateTime? @db.Time` | PostgreSQL native TIME type — stores time only. Nullable: only PRESENT records have it. NO @default — server controls this |
| `check_out` | `DateTime? @db.Time` | Same as check_in. Nullable: records may be "still at work" |
| `status` | `StatusPresensi` | Required enum: PRESENT, SICK, LEAVE, ABSENT |
| `notes` | `String? @db.VarChar(500)` | Optional, length-capped |
| `deleted_at` | `DateTime?` | Soft delete: null = active, non-null = deleted |
| `created_at` / `updated_at` | `DateTime` | Audit timestamps (auto-managed) |

### Constraints & Indexes
- `@@unique([karyawan_id, attendance_date])` — prevents duplicate attendance per employee per day at DB level
- `@@index([attendance_date])` — speeds up date range queries (`start_date`–`end_date`)
- `@@index([status])` — speeds up status filtering
- `@@index([deleted_at])` — speeds up soft-delete filtering (every query has `WHERE deleted_at IS NULL`)

### Why `@db.Date` and `@db.Time` instead of `@default(now())`?
- Spec says "Tanggal Presensi" (date) and "Waktu Masuk" (time) — they're separate concepts
- PostgreSQL native types are more efficient and semantically correct
- Without `@db.Date`, `DateTime` maps to `timestamp(3)` which includes time
- `@default(now())` on `check_in` would auto-fill even for SICK/LEAVE/ABSENT — the server controls this

---

## 3. Prisma 7 Setup

Prisma 7 introduced significant changes from v6:

**Driver adapter required.** You cannot instantiate `PrismaClient()` without an adapter. PostgreSQL uses `@prisma/adapter-pg`:
```ts
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```

**Configuration moved to `prisma.config.ts`.** The `url` field is no longer in the `datasource` block of `schema.prisma`. Instead, it's configured in `prisma.config.ts`:
```ts
export default defineConfig({
  datasource: { url: process.env["DATABASE_URL"]! },
})
```

**Seed command lives in `prisma.config.ts`**, not `package.json`:
```ts
migrations: { seed: "tsx ./prisma/seed.ts" }
```

**Custom output.** Client generated to `../src/generated/prisma` (relative to schema file). Imports need to be from this custom path:
```ts
import { PrismaClient } from "../src/generated/prisma/client.js"
```
The `.js` extension is required by TypeScript's `module: "nodenext"`.

---

## 4. TypeScript Configuration

Key decisions and their impacts:

| Setting | Value | Why |
|---|---|---|
| `module` | `nodenext` | Full Node ESM support, correct resolution |
| `verbatimModuleSyntax` | `true` | Forces `import type` for type-only imports, prevents runtime errors |
| `exactOptionalPropertyTypes` | `true` | Distinguishes `undefined` from optional — prevents accidentally passing undefined |
| `types` | `["node"]` | Auto-includes Node types, excludes DOM |
| `strict` | `true` | Full type safety |
| `skipLibCheck` | `true` | Skips type checking node_modules (faster) |

**`package.json`:** `"type": "module"` — tells Node this is an ESM project. Required by `verbatimModuleSyntax`.

**`exactOptionalPropertyTypes` pain point:** Prisma's generated types don't accept `undefined` for optional fields (they expect `null`). Solution: conditional field inclusion using `...(condition ? { field: value } : {})` — only passes the field to Prisma when it's explicitly provided.

**`req.user` type:** Declaration merging in `src/types/express.d.ts` — augments Express's `Request` interface globally.

---

## 5. PrismaClient Singleton

`src/lib/prisma.ts` creates ONE PrismaClient instance. Every route file imports from this singleton. Why:
- Prevents multiple connection pools (connection exhaustion)
- Consistent adapter configuration
- Single source of truth for DATABASE_URL

---

## 6. Auth System

### Password Hashing
- `bcryptjs` — standard one-way hashing algorithm
- Salt rounds: 10 (good balance of security and speed)
- Passwords hashed in seeder, compared on login with `bcrypt.compare()`

### JWT (JSON Web Token)
- Library: `jsonwebtoken`
- Payload: `{ id, role }` — minimal, only what's needed for auth
- Secret: stored in `.env` as `JWT_SECRET`
- Expiry: 24 hours — short enough to limit damage if leaked
- Algorithm: HS256 (HMAC with SHA-256) — symmetric, single secret

### JWT Flow
1. Login: client sends `{ email, password }` → server verifies → returns signed token
2. Subsequent requests: client sends `Authorization: Bearer <token>` header
3. Server verifies signature with `jwt.verify(token, secret)` → extracts payload → attaches to `req.user`
4. No DB lookup needed per request — the token itself is the proof (stateless)

### Why JWT over sessions
- Stateless: no session store, no Redis, no DB lookups per request
- Scalable: any server instance with the same secret can verify
- Simpler: fewer moving parts for an intern project

### No Registration
- Users are pre-seeded — no signup endpoint
- All users share the same password: `"kemnaker"` (hashed)
- Intentional scope: this is an attendance API, not a user management system

### Middleware
- `authenticate`: verifies JWT → attaches `req.user`. Missing/invalid/expired token → 401
- `requireRole(...roles)`: checks `req.user.role` against allowed roles → 403 if disallowed

---

## 7. Validation Strategy

### Two middleware functions
- `validateAttendance` (POST create): all fields validated, status enum check, PRESENT→check_in required, check_out≥check_in
- `validateAttendanceUpdate` (PUT update): only validates fields present in body, status optional, same PRESENT check

### Rule enforcement tiers
| Tier | What | Where |
|---|---|---|
| Application | Required fields, enum values, conditional rules | Middleware |
| Database | Unique constraint (1 per day) | `@@unique` |
| Database | Null constraints | Schema field types |
| Database | Enum values | PostgreSQL enum type |

### Enum validation
Uses `Object.values(StatusPresensi)` imported from the generated Prisma client, not a hardcoded array. Schema changes automatically update validation.

---

## 8. Response Wrapper Pattern

Two helper functions in `src/utils/response.ts`:
- `success(res, message, data, status?)` → `{ success: true, message, data }`
- `fail(res, message, errors?, status?)` → `{ success: false, message, errors }`

Default status codes: success→200, fail→422. Override with 4th parameter.

Used everywhere — route handlers, middleware, auth — ensuring consistent response format across the entire API. Matches the spec's example responses.

---

## 9. Worker Routes (6 endpoints)

Mounted at `/` with `authenticate` middleware. All queries scoped to `req.user.id`.

| Endpoint | Purpose | Key Logic |
|---|---|---|
| `POST /check-in` | Clock in (PRESENT) | Creates record with check_in=now(). P2002→409 (already checked in) |
| `POST /attendance/:id/check-out` | Clock out | Verifies ownership, same-day check, not-yet-clocked-out guard. Sets check_out=now() |
| `POST /attendance` | Submit non-PRESENT | Body: {status, notes?}. Rejects PRESENT (use /check-in). Enum validation. P2002→409 |
| `PUT /attendance/:id` | Update own record | Ownership check, soft-delete guard, status transitions with timestamp logic |
| `GET /attendance` | List own records | Paginated, filterable (status, date range), sortable. Excludes deleted |
| `GET /attendance/:id` | Get one record | Ownership check, excludes deleted |

### Why `/check-in` is a separate endpoint
"Check in" and "submit sick leave" are different intents even though they both create records. Separating them:
- No ambiguity in the request body (no "is status PRESENT?" branching in a single POST)
- Cleaner validation (each endpoint validates what it needs)
- Better Swagger docs (two distinct operations, not one overloaded endpoint)
- Follows intent-based API design

---

## 10. Admin Routes (6 endpoints)

Mounted at `/admin` with `authenticate` + `requireRole("ADMIN")`. Sees ALL records.

| Endpoint | Key Differences from Worker |
|---|---|
| `GET /admin/attendance` | No karyawan_id filter. Includes karyawan relation. `show_deleted=true` flag. Search by karyawan name. Optional `karyawan_id` query param |
| `GET /admin/attendance/:id` | Sees deleted records. Includes karyawan |
| `POST /admin/attendance` | Accepts explicit `karyawan_id`, optional `attendance_date`/`check_in`/`check_out` — admin has full control |
| `PUT /admin/attendance/:id` | No ownership check. Same transition logic |
| `DELETE /admin/attendance/:id` | Soft delete any record. Rejects already-deleted |
| `POST /admin/attendance/:id/restore` | Restores any soft-deleted record. Rejects non-deleted |

### Why DELETE/restore are admin-only
Workers shouldn't delete attendance records — it undermines the purpose of attendance tracking. If a worker makes a mistake (wrong status), they can PUT to fix it. Admins have broader powers including deletion and restoration.

---

## 11. Date/Time Handling

### The Problem
Prisma rejects date-only strings like `"2026-07-31"` and time-only strings like `"08:00:00"` even when the field is mapped to `@db.Date` or `@db.Time`. Prisma expects full ISO-8601 DateTime strings.

### The Solution
Convert strings to `Date` objects before passing to Prisma:
```ts
// Date
attendance_date: new Date("2026-07-31")

// Time
check_in: new Date("1970-01-01T08:00:00")  // Prisma extracts time portion
```

Prisma's `@db.Time` then extracts only the time component from the Date object for storage.

### Server Timestamps
- `check_in` = `new Date()` — server's current time, not client-provided
- `check_out` = `new Date()` — same
- Rationale: single source of truth, no client clock skew, prevents fraud

### Admin Override
Admin POST accepts optional `attendance_date`, `check_in`, `check_out` strings — allows backdating, setting specific times, or correcting records.

---

## 12. Status Transition Logic (PUT)

When a PUT request changes `status`, the timestamps update according to these rules:

| Current → Requested | Action | Rationale |
|---|---|---|
| Non-PRESENT → PRESENT | Set check_in=now(), clear check_out | New clock-in moment |
| PRESENT → Non-PRESENT | Clear check_in, clear check_out | Timestamps no longer relevant |
| PRESENT → PRESENT | No timestamp change | Same state — keep existing times |
| Non-PRESENT → Non-PRESENT | Just change status | SICK↔LEAVE↔ABSENT — no time data |

This is deterministic: given the same current state and requested status, the outcome is always the same. The first PUT from SICK→PRESENT sets timestamps; the next PUT (same transition) does nothing because state is already PRESENT.

---

## 13. Soft Delete Pattern

`deleted_at DateTime?` — null = active, non-null = deleted (timestamp of deletion).

**All GET queries:** `WHERE deleted_at IS NULL` by default.

**DELETE handler:** sets `deleted_at = new Date()` — data is preserved, just hidden.

**Restore handler:** sets `deleted_at = null` — record is visible again.

**Admin override:** `?show_deleted=true` disables the default filter, showing soft-deleted records.

**Why `deleted_at` over `is_deleted Boolean`:** A timestamp records when deletion happened — useful for audit, compliance, and sorting. Boolean only tells you "yes/no" with no temporal context. No functional downside.

---

## 14. Pagination + Filtering + Search + Sorting

All four bonuses are implemented in the GET handlers for both worker and admin routes.

### Pagination
- `?page=1&limit=10`
- Default: page 1, 10 per page
- Max limit: 100
- Response includes `{ pagination: { page, limit, total, totalPages } }`
- Uses `Promise.all` for parallel `findMany` + `count` queries

### Filtering
- By status: `?status=PRESENT` → `WHERE status = 'PRESENT'`
- By date range: `?start_date=2026-07-01&end_date=2026-07-31` → `WHERE attendance_date BETWEEN ...`
- Admin only: `?karyawan_id=xxx` → filter to specific employee

### Search (Admin only)
- `?search=John` → `WHERE karyawan.name ILIKE '%John%'`
- Uses Prisma's `contains` with `mode: "insensitive"` — case-insensitive substring match
- Not available for workers (they only see their own records)

### Sorting
- `?sort_by=attendance_date&order=asc`
- Whitelist: `attendance_date`, `check_in`, `check_out`, `status`, `created_at`
- Default: `created_at desc`
- Unknown sort fields fall back to default — prevents SQL injection via ORDER BY

---

## 15. Error Handling Strategy

| Error | HTTP Status | Source | Handler |
|---|---|---|---|
| Duplicate attendance (same employee+date) | 409 | Prisma P2002 | Route handler catch blocks |
| Record not found (update/delete non-existent) | 404 | Prisma P2025 or manual check | Route handler catch blocks |
| Validation errors (missing fields, bad enum, time mismatch) | 422 | Middleware + inline checks | validate.ts / route handlers |
| Missing/invalid/expired token | 401 | JWT verify failure | authenticate middleware |
| Wrong role (worker accessing admin) | 403 | Role check | requireRole middleware |
| All other errors | 500 | Uncaught exceptions | Express default / future error middleware |

All errors use the `fail()` wrapper for consistent response format.

---

## 16. Swagger / OpenAPI

**Library:** `swagger-jsdoc` + `swagger-ui-express`

**Configuration:** `src/swagger.ts` — OpenAPI 3.0.0 spec, dynamic server URL from `PORT` env var, JWT security scheme.

**Annotations:** JSDoc `@openapi` comments above every route handler. Three tag groups:
- **Auth:** `POST /auth/login`
- **Worker:** all 6 worker endpoints
- **Admin:** all 6 admin endpoints

**Security:** All Worker and Admin routes have `security: [{ bearerAuth: [] }]`. Swagger UI shows a lock icon on protected endpoints. Users click "Authorize", paste the JWT token, and can test protected endpoints.

**File scanning:** `apis: ["./src/routes/*.ts"]` — reads all route files. Path is relative to project root (CWD where `tsx` runs).

**Mounted at:** `/api-docs`

---

## 17. Morgan Logging

**Library:** `morgan`

**Format:** `"combined"` — Apache combined log format

Output: `::1 - - [31/Jul/2026:13:45:22 +0000] "POST /check-in HTTP/1.1" 201 156 "-" "curl/8.0.1"`

One line per request. Added as middleware after `express.json()`. No file streams, no rotation — simple and sufficient for development.

---

## 18. Seeder

**Location:** `prisma/seed.ts`

**Data:** 10 karyawan — 1 ADMIN + 9 WORKER

| Name | Email | Role |
|---|---|---|
| Administrator | admin@example.com | ADMIN |
| John Doe | john@example.com | WORKER |
| Jane Smith | jane@example.com | WORKER |
| Alice Johnson | alice@example.com | WORKER |
| Bob Brown | bob@example.com | WORKER |
| Charlie Davis | charlie@example.com | WORKER |
| Diana Evans | diana@example.com | WORKER |
| Eve Wilson | eve@example.com | WORKER |
| Frank Martinez | frank@example.com | WORKER |
| Grace Lee | grace@example.com | WORKER |

**Password:** All users: `"kemnaker"` (hashed with bcrypt, 10 salt rounds)

**Idempotency:** Uses `deleteMany()` then `upsert()` — re-runnable without duplicates.

**No presensi records:** Starts clean. Attendance is created through the API.

---

## 19. Unit Tests (Vitest)

**Framework:** Vitest (faster than Jest, native ESM support, compatible with tsx)

**HTTP testing:** Supertest — creates test HTTP server from Express app

**Test structure:**
| File | Tests | What it covers |
|---|---|---|
| `utils/response.test.ts` | 4 | success/fail with default and custom status codes |
| `middleware/validate.test.ts` | 10 | Required fields, PRESENT check, time comparison, invalid status, update partials |
| `routes/auth.test.ts` | 3 | Invalid email, wrong password, valid login with token |
| `routes/worker.test.ts` | 8 | Check-in success/duplicate, attendance create, status validation, GET list, PUT ownership checks |
| `routes/admin.test.ts` | 10 | CRUD, filtering, show_deleted, duplicate P2002, delete, restore |

**Total:** 5 files, 35 tests, 100% passing

**Mocking strategy:** `vi.mock("../../lib/prisma.js")` replaces the Prisma client with mock functions. JWT is mocked in auth tests. Auth middleware is replaced with a mock that injects `req.user` directly.

**P2002 error testing:** Uses the real `PrismaClientKnownRequestError` class from `@prisma/client/runtime/client` — the `instanceof` check in route handlers passes because it's the actual class, not a mock.

---

## 20. Docker Setup

**`docker-compose.yml`:**
- PostgreSQL 16 image
- Port mapping: `5433:5432` (host 5432 already occupied by system PostgreSQL 17)
- Environment: user=postgres, password=postgres, database=kemnaker
- Volume: `pgdata` for persistent storage

**Commands:**
```bash
docker compose up -d db    # start
docker compose down        # stop
docker compose down -v     # stop + delete volume (fresh start)
```

---

## 21. Bugs Encountered & Fixed

1. **`exactOptionalPropertyTypes: true` vs Prisma nullable fields** — Prisma types reject `undefined` for nullable fields. Fixed by conditional field inclusion: `...(condition ? { field: value } : {})`

2. **Prisma 7 requires driver adapter** — `new PrismaClient()` without adapter throws. Fixed by adding `PrismaPg` adapter to every PrismaClient instantiation.

3. **`@db.Time` + `@default(now())` conflict** — `now()` on a TIME column fills all records including SICK/LEAVE/ABSENT. Fixed by removing `@default(now())` and making the field nullable. Server sets timestamps in route handlers.

4. **Swagger `apis` path resolution** — paths resolve from CWD (project root), not from the file's location. `./src/routes/*.ts` not `../src/routes/*.ts`.

5. **Status validation guard (`status &&`)** — on PUT, `!ALLOWED_STATUS.includes(status)` fails when status is undefined (partial update). Fixed: `status && !ALLOWED_STATUS.includes(status)`.

6. **PUT missing date/time transforms** — `req.body` passed raw to Prisma, which rejects date-only strings. Fixed: same conditional Date() conversion as POST.

7. **DELETE endpoint P2002 unreachable** — PUT handler doesn't modify unique-constraint fields. Removed dead P2002 handler.

8. **P2002 test failures** — mock `Error` with `.code = "P2002"` fails `instanceof PrismaClientKnownRequestError`. Fixed: use the actual Prisma error class from `@prisma/client/runtime/client` in tests.

9. **Swagger URL typo** — `http:` missing a slash. Fixed: `http://`.

10. **Swagger UI mount missing `.serve`** — without `swaggerUi.serve`, the CSS/JS assets don't load. Fixed: `swaggerUi.serve, swaggerUi.setup()`.

11. **Dotenv loading order** — `prisma.config.ts` loads dotenv, but `tsx --watch src/app.ts` runs independently. Fixed: `import "dotenv/config"` as first line in `app.ts`.

12. **`tsx --watch` not detecting changes** — Linux inotify watcher limit too low. Fixed: increase `fs.inotify.max_user_watches` or restart dev server.

---

## 22. Tradeoffs Made

| Decision | Tradeoff |
|---|---|
| Normalized 2-table schema vs flat | Cleaner design, but diverges from spec's example (recruiter approved) |
| Singular `/attendance` vs `/attendances` | Personal preference, both valid REST. Can rename if needed |
| Worker DELETE removed | Workers can't delete — admin-only. PUT fixes mistakes instead |
| Status transitions in PUT | Deterministic based on existing state. Not purely idempotent, but predictable |
| No email validation on login | bcrypt.compare handles wrong creds. Simpler, error message is generic |
| No refresh tokens | 24h JWT only. Caller re-logs in. Within scope of test |
| Server timestamps only | Client can't provide times (except admin override). Prevents fraud |
| No rate limiting | Not in scope. Would add for production |
| Morgan `combined` over file output | Simple, sufficient for dev. Production would rotate + ship to log aggregator |

---

## 23. Bonus Features — All 9 Completed

| # | Bonus | Implementation |
|---|---|---|
| 1 | Pagination | `page`/`limit`/`total`/`totalPages` on GET endpoints |
| 2 | Filtering | `status`, `start_date`/`end_date` query params |
| 3 | Search | `search` → `karyawan.name contains` (admin only) |
| 4 | Sorting | `sort_by`/`order` on whitelisted fields |
| 5 | JWT Auth | Login, authenticate middleware, requireRole middleware |
| 6 | Swagger | 3 tag groups, JWT security, "Try it out" buttons |
| 7 | Unit Tests | 35 tests, 5 files, Vitest + Supertest |
| 8 | Soft Delete | `deleted_at` column, DELETE sets it, restore clears it |
| 9 | Logging | Morgan `combined` format |

---

## 24. Remaining / Future Work

- [ ] **README.md** — Soal 3, 10 pts required
- [ ] Clean git history for submission
- [ ] Integration tests with test database
- [ ] Rate limiting (express-rate-limit)
- [ ] Refresh token system
- [ ] Email verification
- [ ] Docker Compose for app + DB (2 containers)
- [ ] CI/CD pipeline (GitHub Actions)
