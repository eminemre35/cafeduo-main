#!/usr/bin/env bash
# Configure rclone for CafeDuo B2 backups on a VDS (run as root).
# Requires env: B2_KEY_ID, B2_APP_KEY
set -euo pipefail

: "${B2_KEY_ID:?Set B2_KEY_ID}"
: "${B2_APP_KEY:?Set B2_APP_KEY}"

curl -fsSL https://rclone.org/install.sh | bash
mkdir -p /root/.config/rclone

cat > /root/.config/rclone/rclone.conf <<EOF
[b2-cafeduo]
type = s3
provider = Other
access_key_id = ${B2_KEY_ID}
secret_access_key = ${B2_APP_KEY}
endpoint = https://s3.us-east-005.backblazeb2.com
region = us-east-005
no_check_bucket = true
force_path_style = true
EOF

chmod 600 /root/.config/rclone/rclone.conf
echo "rclone B2 config written. Test: rclone lsl b2-cafeduo:cafeduo-backups/daily/ | tail -3"
