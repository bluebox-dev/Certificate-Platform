#!/bin/bash
# E-Certificate Platform Backup Script
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "=== Starting Backup: $TIMESTAMP ==="

# 1. Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
docker exec ecert_postgres pg_dump -U app ecert > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
if [ $? -eq 0 ]; then
    echo "PostgreSQL backup completed successfully."
else
    echo "ERROR: PostgreSQL backup failed."
fi

# 2. Backup MinIO media storage (must run as root/sudo since docker volumes are restricted)
echo "Backing up MinIO storage..."
sudo tar -czf "$BACKUP_DIR/minio_backup_$TIMESTAMP.tar.gz" -C /var/lib/docker/volumes/e-certificate-platform_minio_data/_data .
if [ $? -eq 0 ]; then
    echo "MinIO backup completed successfully."
else
    echo "ERROR: MinIO backup failed."
fi

# 3. Keep only last 7 days of backups
echo "Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "=== Backup Process Finished ==="
