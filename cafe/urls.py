from django.contrib import admin
from django.urls import include, path
from cafe.action_resolver import error_page_renderer
from .index import home, red_home
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView
from cafe.schema import schema



urlpatterns = [
    path('admin/', admin.site.urls),
    path('', red_home, name='red_home'),
    path('anasayfa/', home, name='home'),
    path('error/', error_page_renderer, name='error_page'),
    path('graphql/', csrf_exempt(GraphQLView.as_view(schema=schema)), name='graphql'),
    path('', include('account.urls')),
    path('', include('settings.urls')),
    path('', include('dining.urls')),
    path('', include('menu.urls')),
    path('', include('orders.urls')),
    path('', include('waiter.urls')),
    path('', include('kitchen.urls')),
    path('', include('customer.urls')),
]

# sadece development ortamı için
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)