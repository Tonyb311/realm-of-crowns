# Task: Harden Admin Panel Security

You are the Team Lead for Realm of Crowns. Read context first:
- `cat CLAUDE.md`
- `cat .claude/agents/backend-api.md`
- `cat docs/admin-security-audit.md` (the audit you're implementing fixes for)

## Background

The admin panel is web-based and will stay web-based. We're hardening it before expanding its capabilities. The audit file above documents every vulnerability. This prompt implements the fixes.

## Team

Assemble a 2-person team:
- **Backend Security Engineer** — Server middleware, auth hardening, audit logging
- **Frontend Security Engineer** — Admin bundle isolation, client-side hardening

---

## Work Items

### 1. Admin-Specific Rate Limiting (Backend Security Engineer)

**Problem:** Admin routes are completely EXEMPT from rate limiting in `server/src/app.ts`. This means unlimited brute-force attempts on admin endpoints.

**Fix:**
- REMOVE the admin exemption from the general rate limiter
- ADD a stricter rate limiter specifically for admin auth: 5 requests per 15 minutes on `/api/auth/login` when the email matches the admin account
- ADD a separate admin API rate limiter: 100 requests per 15 minutes on `/api/admin/*` routes (lower than the 500 for general API)
- Keep simulation bot exemption (they need it for testing)

### 2. Login Brute Force Protection (Backend Security Engineer)

**Problem:** No account lockout after failed login attempts.

**Fix in `server/src/routes/auth.ts`:**
- Track failed login attempts in Redis: key = `login_failures:{email}`, TTL = 30 minutes
- After 5 failed attempts, lock the account for 30 minutes (return 429 with "Too many login attempts, try again later")
- On successful login, clear the failure counter
- Log all failed login attempts with IP address and email via the existing pino logger
- This applies to ALL accounts, not just admin

### 3. IP Whitelist for Admin Routes (Backend Security Engineer)

**Problem:** Anyone on the internet can reach admin endpoints if they have valid credentials.

**Fix — create `server/src/middleware/admin-ip-whitelist.ts`:**
```typescript
// New middleware: checks request IP against ADMIN_ALLOWED_IPS env var
// ADMIN_ALLOWED_IPS is a comma-separated list of IPs, e.g., "73.x.x.x,10.0.0.1"
// If env var is not set or empty, skip IP check (dev mode / backwards compatible)
// If set, reject any request not from a whitelisted IP with 403
// Log rejected attempts with IP, path, and timestamp
// Apply BEFORE adminGuard in the admin route chain
```

Wire it into `server/src/routes/admin/index.ts`:
```typescript
router.use(adminIpWhitelist); // IP check first
router.use(adminGuard);       // Then auth check
```

### 4. Admin Action Audit Log (Backend Security Engineer)

**Problem:** No record of what admin actions are taken. Can't detect unauthorized access or track changes.

**Fix — create audit logging:**

a) Add a Prisma model:
```prisma
model AdminAuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // e.g., "simulation.start", "user.ban", "economy.reset"
  target    String?  // e.g., user ID, character ID affected
  details   Json?    // Request body or relevant params (sanitized — no passwords)
  ipAddress String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
  @@index([action])
}
```

b) Create `server/src/middleware/admin-audit.ts`:
```typescript
// Middleware that logs ALL mutating admin requests (POST, PUT, PATCH, DELETE)
// Captures: userId (from req.user), action (method + path), target (from params/body),
//           details (sanitized request body), ipAddress
// Runs AFTER adminGuard (so req.user is available)
// Non-blocking — audit write failures should log an error but NOT block the request
```

c) Wire into admin routes index AFTER adminGuard:
```typescript
router.use(adminIpWhitelist);
router.use(adminGuard);
router.use(adminAudit);  // Log all mutating admin requests
```

d) Create a simple admin endpoint to VIEW the audit log:
- `GET /api/admin/audit-log` — Returns paginated audit entries (newest first)
- Query params: `page`, `limit`, `action` (filter), `userId` (filter)

### 5. Admin Audit Log Page (Frontend Security Engineer)

**Problem:** No visibility into admin actions from the UI.

**Fix — create `client/src/pages/admin/AdminAuditLogPage.tsx`:**
- New admin page that displays the audit log
- Table format: Timestamp, User, Action, Target, IP, Details (expandable)
- Filters: action type dropdown, date range
- Paginated (25 per page)
- Add to `ADMIN_NAV` in AdminLayout.tsx with `Shield` icon from lucide-react
- Add route in App.tsx: `<Route path="audit-log" element={<AdminAuditLogPage />} />`
- Match existing admin page styling patterns exactly

### 6. Admin Session Security (Backend Security Engineer)

**Problem:** If admin credentials are compromised, there's no way to quickly revoke access.

**Fix:**
- Add `POST /api/admin/security/revoke-all-sessions` endpoint that:
  - Adds ALL current admin JWTs to the Redis blacklist
  - Forces re-authentication on next request
  - This is an emergency kill switch
- Add `POST /api/admin/security/rotate-password` endpoint that:
  - Accepts current password + new password
  - Validates current password
  - Updates password hash
  - Revokes all existing sessions (calls the above logic)
  - Returns success (admin must log in again with new password)
- Wire both into admin routes

### 7. Verify Frontend Bundle Isolation (Frontend Security Engineer)

**Problem:** Need to confirm admin components don't leak into the player bundle.

**Fix:**
- Verify all admin pages use `React.lazy()` in App.tsx (they currently do — confirm this is still true)
- Run `npx vite build` and check the output chunks — admin code should be in separate chunk files
- If admin code is NOT isolated, add manual chunk splitting in `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        admin: [
          './src/pages/admin/AdminDashboardPage',
          './src/pages/admin/AdminUsersPage',
          // ... all admin pages
        ]
      }
    }
  }
}
```
- Document the chunk verification results in the commit message

---

## Integration Checklist

Before committing, verify:
1. Admin login with correct credentials still works
2. Admin login with wrong password returns proper error (not 500)
3. After 5 failed logins, account locks for 30 minutes (test with curl)
4. Admin API requests without JWT return 401
5. Admin API requests with non-admin JWT return 403
6. Audit log captures a POST request to any admin endpoint
7. Audit log page loads and shows entries
8. `vite build` succeeds with no errors
9. All existing admin pages still work (quick smoke test — load each one)

## Deployment

```bash
git add -A
git commit -m "security: harden admin panel — IP whitelist, rate limiting, brute force protection, audit logging

- Add admin IP whitelist middleware (ADMIN_ALLOWED_IPS env var)
- Add login brute force protection (5 attempts / 30 min lockout)  
- Add admin-specific rate limiter (100 req / 15 min)
- Add AdminAuditLog model and middleware for all mutating admin requests
- Add admin audit log page with filtering and pagination
- Add emergency session revocation and password rotation endpoints
- Verify admin bundle isolation in Vite build"

git push
```

Deploy to Azure with a unique image tag. Run the Prisma migration in production to create the AdminAuditLog table.

**IMPORTANT:** After deploying, set the `ADMIN_ALLOWED_IPS` environment variable in Azure Container Apps to Tony's IP address. If you can't determine the IP, document that it needs to be set manually and provide the Azure CLI command:
```bash
az containerapp update --name realm-of-crowns --resource-group <rg> \
  --set-env-vars ADMIN_ALLOWED_IPS=<tony-ip>
```
