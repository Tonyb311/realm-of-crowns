#!/usr/bin/env bash
#
# Realm of Crowns — Database Backup Script
#
# Usage:
#   PGPASSWORD=<password> ./scripts/backup-db.sh
#
# Environment variables:
#   DB_HOST     — PostgreSQL host (default: localhost)
#   DB_PORT     — PostgreSQL port (default: 5432)
#   DB_USER     — PostgreSQL user (default: roc_user)
#   DB_NAME     — Database name  (default: realm_of_crowns)
#   BACKUP_DIR  — Directory to store backups (default: ./backups)
#   RETENTION_DAYS — Days to keep daily backups (default: 7)

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-roc_user}"
DB_NAME="${DB_NAME:-realm_of_crowns}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup of ${DB_NAME}..."

pg_dump -Fc \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  -f "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE} (${FILE_SIZE})"

# Clean up old daily backups
echo "[$(date -Iseconds)] Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -delete

REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" | wc -l)
echo "[$(date -Iseconds)] Done. ${REMAINING} backup(s) retained."
