from pathlib import Path

from dynaconf import Dynaconf

BASE_DIR = Path(__file__).resolve().parent.parent

# Tüm production/ortam ayarları .env'den (veya gerçek ortam değişkenlerinden)
# okunur; .env yoksa (yerel geliştirme) aşağıdaki güvenli varsayılanlar
# kullanılır — `manage.py runserver` + sqlite akışı hiçbir kurulum
# gerektirmeden çalışmaya devam eder. Bkz. `.env.example`.
env = Dynaconf(envvar_prefix="DJANGO", load_dotenv=True)

SECRET_KEY = env.get(
    'SECRET_KEY',
    'django-insecure-s93molif%fu$+aors_!a(4yw*8pnp(%(psr(13^k4v@=i4-_o5',
)
DEBUG = env.get('DEBUG', default=True)
ALLOWED_HOSTS = [h.strip() for h in env.get('ALLOWED_HOSTS', '*').split(',') if h.strip()]
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in env.get(
        'CSRF_TRUSTED_ORIGINS',
        'https://infaktabirlik.com,https://www.infaktabirlik.com',
    ).split(',') if o.strip()
]
INSTALLED_APPS = [
    "admin_interface",
    "colorfield",
    'celery',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # 'django_components',
    "corsheaders",
    'rest_framework',
    'knox',
    'strawberry_django',
    "channels",
    'account',
    'authorizement',
    'province',
    'common',
    'dining',
    'menu',
    'orders',
    'waiter',
    'kitchen',
    'customer',
    'settings',
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'cafe.urls'
CORS_ALLOW_ALL_ORIGINS = env.get('CORS_ALLOW_ALL_ORIGINS', default=True)
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in env.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
]
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'settings.context_processors.organization_theme',
            ],
        },
    },
]
WSGI_APPLICATION = 'cafe.wsgi.application'
ASGI_APPLICATION = 'cafe.asgi.application'

REDIS_URL = env.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    },
}

# POSTGRES_DB set edilmişse (Docker/production) Postgres'e bağlan; aksi halde
# yerel geliştirme için sqlite kullanılır.
if env.get('POSTGRES_DB', None):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env.get('POSTGRES_DB'),
            'USER': env.get('POSTGRES_USER', 'cafe'),
            'PASSWORD': env.get('POSTGRES_PASSWORD', ''),
            'HOST': env.get('POSTGRES_HOST', 'localhost'),
            'PORT': env.get('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'account.User'
KNOX_TOKEN_MODEL = 'knox.AuthToken'
AUTHENTICATION_BACKENDS = [
    'account.backends.EmailBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / "static",
]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CELERY_TIMEZONE = 'Europe/Istanbul'
CELERY_ENABLE_UTC = False
CELERY_BROKER_URL = env.get('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/15')
