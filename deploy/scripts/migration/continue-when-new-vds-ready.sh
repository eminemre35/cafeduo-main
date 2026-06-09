#!/usr/bin/env bash
# Run AFTER new VDS is purchased. Usage: ./continue-when-new-vds-ready.sh NEW_VDS_IP
set -euo pipefail

NEW_IP="${1:?Usage: $0 NEW_VDS_IP}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_cafeduo}"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MIGRATION_DIR="$(dirname "$0")"

echo "=== CafeDuo migration continue -> ${NEW_IP} ==="
echo "1) Copy bootstrap scripts to new VDS..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "$MIGRATION_DIR/new-vds-bootstrap.sh" \
  "$MIGRATION_DIR/restore-postgres-from-b2.sh" \
  "$MIGRATION_DIR/setup-rclone-b2.sh" \
  "$MIGRATION_DIR/post-cutover-smoke.sh" \
  "root@${NEW_IP}:/root/"

echo "2) Run Dokploy bootstrap on new VDS (Docker + Dokploy)..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "root@${NEW_IP}" \
  "sed -i 's/\\r$//' /root/*.sh && chmod +x /root/*.sh && bash /root/new-vds-bootstrap.sh"

echo ""
echo "3) MANUAL — Dokploy panel http://${NEW_IP}:3000"
echo "   - Create admin account"
echo "   - Create Compose: GitHub eminemrre/cafeduo-main, branch main"
echo "   - Compose path: deploy/docker-compose.dokploy.yml"
echo "   - Environment: copy from B2 dokploy-env/cafeduo-dokploy-env-20260608-181039.txt"
echo "   - Domains: cafeduotr.com + www (HTTPS)"
echo "   - Deploy once (empty DB OK)"
echo ""
echo "4) Pre-DNS smoke:"
echo "   curl --resolve cafeduotr.com:443:${NEW_IP} https://cafeduotr.com/health"
echo ""
echo "5) On new VDS after deploy — rclone (set B2_KEY_ID + B2_APP_KEY):"
echo "   ssh root@${NEW_IP} 'B2_KEY_ID=... B2_APP_KEY=... bash /root/setup-rclone-b2.sh'"
echo "   scp -r root@217.60.254.141:/opt/cafeduo-backup /opt/cafeduo-backup  # on new VDS"
echo ""
echo "6) Restore DB on new VDS:"
echo "   ssh root@${NEW_IP} 'bash /root/restore-postgres-from-b2.sh cafeduo-20260608-180824.dump'"
echo "   Restart api container in Dokploy"
echo ""
echo "7) DNS cutover: cafeduotr.com A -> ${NEW_IP} (TTL 300 first)"
echo "8) smoke: npm run smoke:live"
echo "9) After 48h stable: stop CafeDuo stack on 217.60.254.141 (leave FlowMind)"
echo ""
echo "State file: deploy/scripts/migration/migration-state.json"
