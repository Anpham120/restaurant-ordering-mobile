#!/usr/bin/env bash
# Forced command of the GitHub Actions deploy key. Installed on the server as
# /home/coder/ordering-secrets/ci-ssh-gate.sh and bound in ~/.ssh/authorized_keys:
#   command="/home/coder/ordering-secrets/ci-ssh-gate.sh",restrict ssh-ed25519 AAAA... github-actions-ordering
# Whatever the client asks for, sshd runs this script; it only accepts
#   deploy <40-hex commit>   check out that commit (it must be on main) and run scripts/deploy.sh
#   backup                   run scripts/backup-db.sh nightly
# The production .env stays on the server: it is copied in for the run and removed afterwards.
set -euo pipefail

REPO_URL=https://github.com/Anpham120/restaurant-ordering-mobile.git
DEPLOY_DIR=/home/coder/ordering-deploy
ENV_FILE=/home/coder/ordering-secrets/prod.env
LOCK=/home/coder/ordering-secrets/.deploy.lock
export BACKUP_DIR=/home/coder/ordering-backups

usage() { echo "usage: deploy <commit sha> | backup" >&2; exit 2; }
read -r cmd arg extra <<<"${SSH_ORIGINAL_COMMAND:-}" || true
[ -z "${extra:-}" ] || usage

# one deploy or backup at a time
exec 9>"$LOCK"
flock -w 1800 9

cd "$DEPLOY_DIR"
trap 'rm -f .env' EXIT
write_env() { (umask 077; cp "$ENV_FILE" .env); }

case "${cmd:-}" in
  deploy)
    [[ "${arg:-}" =~ ^[0-9a-f]{40}$ ]] || usage
    git fetch -q "$REPO_URL" main
    git merge-base --is-ancestor "$arg" FETCH_HEAD || { echo "[gate] $arg is not on main" >&2; exit 3; }
    git reset -q --hard "$arg"
    write_env
    scripts/deploy.sh
    ;;
  backup)
    [ -z "${arg:-}" ] || usage
    write_env
    scripts/backup-db.sh nightly
    ;;
  *) usage ;;
esac
