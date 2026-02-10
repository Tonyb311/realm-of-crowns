# Prompt — Azure Infrastructure Setup
# Dependencies: Bootstrap + Prompt 00 complete
# This sets up Azure PostgreSQL + Redis in a completely separate
# resource group, configures the project, runs migrations, and
# verifies the full stack works end-to-end.
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You need to set up Azure cloud infrastructure for the Realm of Crowns
project. This MUST be completely separate from any existing Azure
resources. Different resource group, different server, different
credentials.

Do this step by step — NOT with agent teams. Each step depends on
the previous one.

IMPORTANT: Before starting, verify Azure CLI is installed and logged in:
```
az --version
az account show
```
If `az` is not found, install it first:
```
winget install Microsoft.AzureCLI
```
Then login:
```
az login
```

If already logged in, confirm the subscription and proceed.

---

## STEP 1 — Create a Dedicated Resource Group

Create a brand new resource group ONLY for this project. Do not reuse
any existing resource groups.

```
az group create --name rg-realm-of-crowns --location eastus
```

Verify it was created:
```
az group show --name rg-realm-of-crowns
```

---

## STEP 2 — Create Azure PostgreSQL Flexible Server

Create a new PostgreSQL Flexible Server inside the new resource group.
Use the Burstable B1ms tier (cheapest option, fine for development).

```
az postgres flexible-server create \
  --resource-group rg-realm-of-crowns \
  --name roc-db-server \
  --location eastus \
  --admin-user rocadmin \
  --admin-password RoC-Dev-2026! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --yes
```

NOTE: If the server name `roc-db-server` is taken (they're globally
unique), append random numbers like `roc-db-server-7291`. Update all
subsequent commands to use the actual server name.

Wait for this to complete — it can take 3-5 minutes.

Verify the server was created:
```
az postgres flexible-server show \
  --resource-group rg-realm-of-crowns \
  --name roc-db-server
```

---

## STEP 3 — Configure Firewall Rules

Allow your current machine to connect to the database:

```
az postgres flexible-server firewall-rule create \
  --resource-group rg-realm-of-crowns \
  --name roc-db-server \
  --rule-name AllowMyIP \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

NOTE: The 0.0.0.0-255.255.255.255 range is permissive (allows all IPs)
and is fine for development. For production, restrict to your actual IP.

Also enable Azure service access:
```
az postgres flexible-server parameter set \
  --resource-group rg-realm-of-crowns \
  --server-name roc-db-server \
  --name require_secure_transport \
  --value off
```

This disables SSL requirement for local dev. Can re-enable for production.

---

## STEP 4 — Create the Game Database

Create the `realm_of_crowns` database on the server:

```
az postgres flexible-server db create \
  --resource-group rg-realm-of-crowns \
  --server-name roc-db-server \
  --database-name realm_of_crowns
```

Verify:
```
az postgres flexible-server db show \
  --resource-group rg-realm-of-crowns \
  --server-name roc-db-server \
  --database-name realm_of_crowns
```

---

## STEP 5 — Create Azure Cache for Redis

Create a Redis instance in the same resource group.
Use the Basic C0 tier (cheapest, fine for dev).

```
az redis create \
  --resource-group rg-realm-of-crowns \
  --name roc-redis-cache \
  --location eastus \
  --sku Basic \
  --vm-size c0 \
  --redis-version 6
```

NOTE: If the name `roc-redis-cache` is taken, append random numbers.
This can take 5-15 minutes to provision.

After it's created, get the connection info:
```
az redis show \
  --resource-group rg-realm-of-crowns \
  --name roc-redis-cache \
  --query "{hostName:hostName,port:sslPort,enableNonSslPort:enableNonSslPort}"

az redis list-keys \
  --resource-group rg-realm-of-crowns \
  --name roc-redis-cache
```

Save the hostname and primary key — you'll need them for the .env file.

---

## STEP 6 — Update Project Configuration

Now update the project's .env file with the Azure connection strings.

Get the PostgreSQL server hostname:
```
az postgres flexible-server show \
  --resource-group rg-realm-of-crowns \
  --name roc-db-server \
  --query "fullyQualifiedDomainName" -o tsv
```

The DATABASE_URL format for Azure PostgreSQL is:
```
postgresql://rocadmin:RoC-Dev-2026!@<SERVER_HOSTNAME>:5432/realm_of_crowns?sslmode=prefer
```

The REDIS_URL format for Azure Redis is:
```
rediss://:<PRIMARY_KEY>@<REDIS_HOSTNAME>:6380
```
(Note: `rediss://` with double-s for SSL)

Update the .env file in the project root (D:\realm_of_crowns\.env)
with the ACTUAL values from the commands above:

```
# Database — Azure PostgreSQL Flexible Server
DATABASE_URL="postgresql://rocadmin:RoC-Dev-2026!@<ACTUAL_SERVER_HOSTNAME>:5432/realm_of_crowns?sslmode=prefer"

# Redis — Azure Cache for Redis
REDIS_URL="rediss://:<ACTUAL_PRIMARY_KEY>@<ACTUAL_REDIS_HOSTNAME>:6380"

# Auth
JWT_SECRET="realm-of-crowns-jwt-secret-change-in-production-2026"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development

# Client
CLIENT_URL="http://localhost:3000"
```

Replace ALL placeholder values with the actual Azure values.
Double-check the connection string is correct.

Also update .env.example with the same structure (but with placeholder
values, not real credentials).

---

## STEP 7 — Generate Prisma Client and Run Migrations

Now connect Prisma to the Azure database and create all tables:

```
cd D:\realm_of_crowns\database
npx prisma generate
npx prisma migrate dev --name init
```

If the migration succeeds, you should see:
"Your database is now in sync with your schema."

If it fails:
- Check the DATABASE_URL is correct in .env
- Check firewall rules allow your IP
- Check the server is running: `az postgres flexible-server show ...`
- Fix any schema issues and retry

After migration, verify tables were created:
```
npx prisma studio
```
This opens a browser UI showing all your database tables. Verify
you can see the User, Character, Region, Town, Item, etc. tables.
Close Prisma Studio when done.

---

## STEP 8 — Verify the Full Stack

Start both servers:
```
cd D:\realm_of_crowns
npm run dev
```

Test the health endpoint:
```
curl http://localhost:4000/api/health
```
Should return: `{"status":"ok","game":"Realm of Crowns",...}`

Test the auth flow:
```
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@realmofcrowns.com\",\"username\":\"TestHero\",\"password\":\"password123\"}"

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@realmofcrowns.com\",\"password\":\"password123\"}"
```

The login should return a JWT token. Use it to test:
```
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
```

If all three return valid responses, the Azure database is fully
connected and working.

Test the client too — open http://localhost:3000 in a browser and
verify the landing page loads. Try registering and logging in through
the UI.

---

## STEP 9 — Update Docker Compose (Optional, for reference)

Since we're using Azure instead of local Docker, update docker-compose.yml
to comment out the postgres and redis services and add a note:

```yaml
# Infrastructure runs on Azure — see .env for connection strings
# Azure PostgreSQL Flexible Server: rg-realm-of-crowns / roc-db-server
# Azure Cache for Redis: rg-realm-of-crowns / roc-redis-cache
#
# To use local Docker instead, uncomment below and update .env:
#
# services:
#   postgres:
#     image: postgres:15-alpine
#     container_name: roc-postgres
#     restart: unless-stopped
#     environment:
#       POSTGRES_USER: roc_user
#       POSTGRES_PASSWORD: roc_password
#       POSTGRES_DB: realm_of_crowns
#     ports:
#       - '5432:5432'
#     volumes:
#       - postgres_data:/var/lib/postgresql/data
#
#   redis:
#     image: redis:7-alpine
#     container_name: roc-redis
#     restart: unless-stopped
#     ports:
#       - '6379:6379'
#     volumes:
#       - redis_data:/data
#
# volumes:
#   postgres_data:
#   redis_data:
```

---

## STEP 10 — Final Status Report

Give me a summary:

1. ✅/❌ Resource group `rg-realm-of-crowns` created
2. ✅/❌ PostgreSQL Flexible Server created (server name: ?)
3. ✅/❌ Firewall rules configured
4. ✅/❌ Database `realm_of_crowns` created
5. ✅/❌ Azure Redis created (name: ?)
6. ✅/❌ .env updated with Azure connection strings
7. ✅/❌ Prisma migration successful (how many tables?)
8. ✅/❌ Health check passes
9. ✅/❌ Auth register/login works against Azure DB
10. ✅/❌ Client loads in browser

Also tell me:
- The Azure PostgreSQL server hostname
- The Azure Redis hostname
- Monthly estimated cost for both services
- Any issues or warnings
- Confirmation that Prompt 02 (World & Navigation) is ready to go
