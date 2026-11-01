#!/usr/bin/env bash
set -euo pipefail
worker_uid=$(id -u)
worker_user=$(id -un)
trap 'sudo systemctl status "user@${worker_uid}.service" --no-pager || true; sudo journalctl -u "user@${worker_uid}.service" -n 60 --no-pager; exit 1' ERR
sudo mkdir -p /etc/systemd/system/user@.service.d
printf '[Service]\nDelegate=cpu memory pids\n' | sudo tee /etc/systemd/system/user@.service.d/prezi-controllers.conf >/dev/null
sudo systemctl daemon-reload
sudo loginctl enable-linger "$worker_user"
sudo systemctl restart "user@${worker_uid}.service"
echo "XDG_RUNTIME_DIR=/run/user/${worker_uid}" >> "$GITHUB_ENV"
echo "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/${worker_uid}/bus" >> "$GITHUB_ENV"
XDG_RUNTIME_DIR="/run/user/${worker_uid}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${worker_uid}/bus" systemctl --user is-active default.target
sudo systemctl show "user@${worker_uid}.service" --property=DelegateControllers
