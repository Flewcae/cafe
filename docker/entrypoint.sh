#!/bin/sh
set -e

if [ -n "$POSTGRES_HOST" ]; then
  echo "Postgres'in hazır olması bekleniyor ($POSTGRES_HOST:${POSTGRES_PORT:-5432})..."
  until python -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect(('$POSTGRES_HOST', ${POSTGRES_PORT:-5432}))
except OSError:
    sys.exit(1)
"; do
    sleep 1
  done
fi

if [ -n "$RUN_MIGRATIONS" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
fi

exec "$@"
