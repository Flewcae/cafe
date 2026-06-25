"""
ASGI config for cafe — serves HTTP (Django) and websocket consumers
(Strawberry GraphQL subscriptions + the kitchen panel feed) from a single
ASGI process.

  HTTP  /graphql/    -> Django ASGI app -> csrf_exempt GraphQLView (token-header auth)
  WS    /graphql/    -> strawberry.channels.GraphQLWSConsumer (connectionParams auth)
  WS    /ws/mutfak/  -> ActiveOrdersConsumer (Django session auth, kitchen perm gated)

Run with an ASGI server, e.g.:
    daphne -b 0.0.0.0 -p 8000 cafe.asgi:application
    # or: uvicorn cafe.asgi:application --host 0.0.0.0 --port 8000
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cafe.settings")

# Initialise Django (loads apps) BEFORE importing the schema / consumers.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import re_path  # noqa: E402
from strawberry.channels import GraphQLWSConsumer  # noqa: E402

from cafe.consumers import ActiveOrdersConsumer  # noqa: E402
from cafe.schema import schema  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    re_path(r"^graphql/?$", GraphQLWSConsumer.as_asgi(schema=schema)),
                    re_path(r"^ws/mutfak/?$", ActiveOrdersConsumer.as_asgi()),
                ]
            )
        ),
    }
)