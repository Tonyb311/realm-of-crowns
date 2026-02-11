# Database Backup & Restore Guide

## Overview

Realm of Crowns uses PostgreSQL 15. All player data (characters, items, gold,
buildings, political state) is stored in the database. Data loss would be
catastrophic, so regular backups are essential.

## Manual Backup

### Local / Docker

```bash
# Full backup (custom format — supports parallel restore)
pg_dump -Fc -h localhost -U roc_user -d realm_of_crowns -f backup_$(date +%Y%m%d_%H%M%S).dump

# SQL text backup (human-readable, larger)
pg_dump -h localhost -U roc_user -d realm_of_crowns > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Azure PostgreSQL Flexible Server

```bash
pg_dump -Fc \
  -h roc-db-server.postgres.database.azure.com \
  -U adminuser \
  -d realm_of_crowns \
  --no-owner --no-privileges \
  -f backup_$(date +%Y%m%d_%H%M%S).dump
```

Set `PGPASSWORD` or use a `.pgpass` file to avoid interactive password prompts.

## Automated Backup Schedule

Use the provided `scripts/backup-db.sh` script with cron:

```bash
# Daily at 02:00 UTC
0 2 * * * /path/to/realm_of_crowns/scripts/backup-db.sh >> /var/log/roc-backup.log 2>&1
```

### Recommended Schedule

| Frequency | Type | Retention |
|-----------|------|-----------|
| Daily | Full pg_dump | 7 days |
| Weekly | Full pg_dump | 4 weeks |
| Monthly | Full pg_dump | 12 months |

## Retention Policy

- Delete daily backups older than 7 days.
- Keep one weekly backup (Sunday) for 4 weeks.
- Keep one monthly backup (1st of month) for 12 months.
- The `backup-db.sh` script handles daily cleanup automatically.

## Restore Procedure

### Restore from custom format (.dump)

```bash
# 1. Create a fresh database (or drop and recreate)
dropdb -h localhost -U roc_user realm_of_crowns
createdb -h localhost -U roc_user realm_of_crowns

# 2. Restore
pg_restore -h localhost -U roc_user -d realm_of_crowns --no-owner backup.dump

# 3. Run any pending migrations
npx prisma migrate deploy --schema=database/prisma/schema.prisma
```

### Restore from SQL text (.sql)

```bash
psql -h localhost -U roc_user -d realm_of_crowns < backup.sql
```

### Point-in-time restore (Azure)

Azure PostgreSQL Flexible Server supports point-in-time restore (PITR):

1. Go to Azure Portal > roc-db-server > Overview > Restore.
2. Select a restore point (any time within the retention period, default 7 days).
3. Provide a new server name.
4. Azure creates a new server with data as of that timestamp.
5. Update `DATABASE_URL` in the application to point to the new server.

## Azure Backup Features

Azure PostgreSQL Flexible Server provides:

- **Automatic backups**: Full backup daily, WAL archiving continuous.
- **Retention**: Configurable 7-35 days (default 7). Set to at least 14 for production.
- **Geo-redundant backups**: Available if configured (recommended for DR).
- **PITR**: Restore to any second within the retention window.

### Enable geo-redundant backup (Azure CLI)

```bash
az postgres flexible-server update \
  --resource-group rg-realm-of-crowns \
  --name roc-db-server \
  --backup-retention 14 \
  --geo-redundant-backup Enabled
```

## Testing Backups

Periodically verify backups can be restored:

1. Restore to a test database: `createdb roc_backup_test && pg_restore -d roc_backup_test backup.dump`
2. Run a smoke test: `psql -d roc_backup_test -c "SELECT count(*) FROM \"Character\";"`
3. Drop the test database: `dropdb roc_backup_test`

Schedule this verification monthly.
