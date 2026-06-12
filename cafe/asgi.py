"""
ASGI config for cafe — serves HTTP (Django) and GraphQL websocket subscriptions
(Strawberry channels consumer) from a single ASGI process.

  HTTP  /graphql/  -> Django ASGI app -> csrf_exempt GraphQLView (token-header auth)
  WS    /graphql/  -> strawberry.channels.GraphQLWSConsumer (connectionParams auth)

Run with an ASGI server, e.g.:
    uvicorn cafe.asgi:application --host 0.0.0.0 --port 8000
    # or: daphne -b 0.0.0.0 -p 8000 cafe.asgi:application
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cafe.settings")

# Initialise Django (loads apps) BEFORE importing the schema / consumers.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import re_path  # noqa: E402
from strawberry.channels import GraphQLWSConsumer  # noqa: E402

from cafe.schema import schema  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(
            [
                re_path(r"^graphql/?$", GraphQLWSConsumer.as_asgi(schema=schema)),
            ]
        ),
    }
)