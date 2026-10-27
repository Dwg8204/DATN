#!/bin/sh
set -eu

# A local SMTP server is the Mailpit service in Docker. Preserve external SMTP.
case "${SMTP_HOST:-}" in
  localhost|127.0.0.1|::1) export SMTP_HOST=mailpit ;;
esac

exec "$@"
