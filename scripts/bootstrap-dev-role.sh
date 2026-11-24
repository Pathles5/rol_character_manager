#!/usr/bin/env bash
# ============================================================================
# FichaSS — scripts/bootstrap-dev-role.sh (Fase 19, T-02 / D-70a)
# Crea/converge en CI el rol OIDC dedicado de dev. Idempotente.
# Lo ejecuta el job bootstrap-dev-role asumiendo el rol ACTUAL
# (fichass-github-actions-rol_character_manager), que tiene
# iam:CreateRole/PutRolePolicy/PassRole sobre fichass-*. NO modifica
# el rol de producción.
# ============================================================================
set -euo pipefail

ROLE_NAME="fichass-github-actions-dev"
POLICY_NAME="fichass-deploy-dev"
TAGS=(Key=project,Value=FichaSS Key=cost-policy,Value=free-tier-only)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRUST_FILE="$REPO_ROOT/infra/trust-dev.json"
POLICY_FILE="$REPO_ROOT/infra/role-policy-dev.json"

for f in "$TRUST_FILE" "$POLICY_FILE"; do
  [ -f "$f" ] || { echo "Falta el fichero requerido: $f"; exit 1; }
done

echo "== Bootstrap del rol dev (idempotente, D-70a) =="
EXISTS=yes
GET_OUT=""
if GET_OUT=$(aws iam get-role --role-name "$ROLE_NAME" 2>&1); then
  EXISTS=yes
elif printf '%s' "$GET_OUT" | grep -q "NoSuchEntity"; then
  EXISTS=no
else
  echo "Error inesperado consultando el rol:"; echo "$GET_OUT"; exit 1
fi

if [ "$EXISTS" = "no" ]; then
  echo "Rol ausente -> create-role con trust-dev.json + tags"
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_FILE" \
    --max-session-duration 3600 \
    --tags "${TAGS[@]}"
else
  echo "Rol ya existe -> no-op de creacion (el trust NO se toca)"
fi

# Converge la policy inline en cada corrida (idempotente).
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE"
echo "Policy inline convergida: $POLICY_NAME"

aws iam tag-role --role-name "$ROLE_NAME" --tags "${TAGS[@]}" >/dev/null
echo "Tags convergidas: project=FichaSS / cost-policy=free-tier-only"

ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "== OK: $ARN =="
