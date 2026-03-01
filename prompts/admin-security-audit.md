# Task: Admin Panel Security Audit — Dump Findings to File

Handle this directly as Team Lead. No team needed — this is a codebase investigation.

## Context

Read `CLAUDE.md` first: `cat CLAUDE.md`

We're hardening the admin panel security before building it out further. Before implementing anything, we need a full picture of the current security posture. Dump all findings to a file — do NOT attempt any fixes in this task.

## Investigation Steps

Search the codebase and document ALL of the following:

### 1. Authentication & Authorization
- Read `server/src/middleware/admin.ts` — how does adminGuard work?
- Read `server/src/middleware/auth.ts` — how does JWT validation work? What's in the token payload? How is the secret managed?
- How is the admin role assigned? Check `server/src/lib/ensure-admin.ts` and any seed files
- Is there ANY way to escalate to admin role through the API? Search for `role` updates in user routes
- Can admin tokens be revoked? Check Redis blacklist logic in auth middleware
- What's the JWT expiry time? Is it configurable?

### 2. Rate Limiting & Brute Force Protection
- Read `server/src/app.ts` — the rate limiter currently SKIPS admin routes entirely. Document exactly what the skip logic does
- Is there ANY rate limiting on `/api/auth/login`? Could someone brute-force the admin password?
- Are there account lockout mechanisms after failed login attempts?

### 3. Network & Transport Security
- What CORS origins are allowed? Check `cors()` config in app.ts
- Is there any IP-based restriction on admin routes?
- Check helmet() config — what security headers are set?
- Is HTTPS enforced? Check if there's any HTTP->HTTPS redirect

### 4. Frontend Security
- Read `client/src/components/ui/AdminRoute.tsx` — client-side guard logic
- Read `client/src/App.tsx` — are admin pages lazy-loaded (React.lazy) or bundled with the main app?
- Can a non-admin user access admin React components by modifying localStorage/JWT claims? (The backend blocks API calls, but can they SEE the admin UI?)
- Search for any hardcoded credentials, API keys, or secrets in client code: `grep -r "password\|secret\|api.key\|token" client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".d.ts"`

### 5. Admin API Surface
- List EVERY admin route in `server/src/routes/admin/` — document what each one does
- Which admin endpoints are read-only vs. mutating (POST/PUT/DELETE)?
- Are there any admin endpoints that could cause data loss or irreversible damage? (database resets, user deletion, simulation cleanup, etc.)
- Check `server/src/routes/admin/tools.ts` and `simulation.ts` specifically — these are the most dangerous

### 6. Audit Trail
- Is there any logging of admin actions? (Not just HTTP request logs — actual "admin did X" audit records)
- Check the error logs system — does it capture who triggered admin actions?
- Could an attacker with admin access cover their tracks?

### 7. Simulation Secret
- How is `SIMULATION_SECRET` generated? (Check app.ts — it falls back to a slice of JWT_SECRET)
- Could the simulation secret be guessed if JWT_SECRET is known?
- What can someone do with the simulation secret? (Bypasses rate limiting — anything else?)

## Output

Write ALL findings to `D:\realm_of_crowns\docs\admin-security-audit.md` with this structure:

```markdown
# Admin Panel Security Audit
Date: [today]

## Current Security Posture

### Authentication & Authorization
[findings]

### Rate Limiting & Brute Force
[findings]

### Network Security
[findings]

### Frontend Security
[findings]

### Admin API Surface
[complete list of admin endpoints with HTTP methods and risk level]

### Audit Trail
[findings]

### Simulation Secret
[findings]

## Vulnerabilities Found
[numbered list, severity: CRITICAL / HIGH / MEDIUM / LOW]

## Recommendations
[prioritized list of fixes]
```

## Rules
- DO NOT fix anything. Read-only investigation.
- DO NOT skip any section — even if you think it's fine, document what you found.
- Include exact file paths and line numbers for every finding.
- If you can't determine something, say so explicitly rather than guessing.
- Brief analysis, dump everything to the file. Don't flood chat with output.
