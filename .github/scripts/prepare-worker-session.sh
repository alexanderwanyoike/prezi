#!/usr/bin/env bash
set -euo pipefail
worker_uid=$(id -u)
worker_user=$(id -un)
sudo loginctl enable-linger "$worker_user"
sudo systemctl start "user@${worker_uid}.service"
echo "XDG_RUNTIME_DIR=/run/user/${worker_uid}" >> "$GITHUB_ENV"
echo "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/${worker_uid}/bus" >> "$GITHUB_ENV"
XDG_RUNTIME_DIR="/run/user/${worker_uid}" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${worker_uid}/bus" systemctl --user is-active default.target
