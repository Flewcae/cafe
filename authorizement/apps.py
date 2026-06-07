from django.apps import AppConfig


class AuthorizementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authorizement'

    def ready(self):
        import authorizement.signals