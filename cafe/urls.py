from django.contrib import admin
from django.urls import include, path

from cafe.action_resolver import error_page_renderer
from .index import home

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('anasayfa/', home, name='home'),
    path('error/', error_page_renderer, name='error_page'),
    path('', include('account.urls')),
    path('', include('settings.urls')),
    path('', include('dining.urls')),
    path('', include('menu.urls')),
    path('', include('orders.urls')),
    path('', include('waiter.urls')),
]

# sadece development ortamı için
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)