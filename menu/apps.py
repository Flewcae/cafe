from django.apps import AppConfig


class MenuConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'menu'
    verbose_name = 'Ürün & Menü Yönetimi'

    def ready(self):
        import menu.signals  # noqa: F401