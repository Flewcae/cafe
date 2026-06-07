from datetime import date, datetime, timezone, timedelta

import re
from typing import Optional
from django.shortcuts import redirect, render
from django.core.mail.backends.smtp import EmailBackend
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
import requests
from settings.models import AppSettings, EmailConfig
from strawberry.file_uploads import Upload


def get_email_backend(from_email):
    config = AppSettings.get_config()
    if not config.email_config:
        raise ImproperlyConfigured("Mail server ayarları tanımlı değil")
    email_config = config.email_config
    return EmailBackend(
        host=email_config.host,
        port=email_config.port,
        username=from_email,              # GÖNDEREN KİŞİ
        password=email_config.default_password, # ŞİMDİLİK ORTAK
        use_tls=email_config.use_tls,
        use_ssl=email_config.use_ssl,
        timeout=email_config.timeout,
        fail_silently=False
    )


TR_LOWER_MAP = {
    'I': 'ı',
    'İ': 'i',
    'Ç': 'ç',
    'Ğ': 'ğ',
    'Ö': 'ö',
    'Ş': 'ş',
    'Ü': 'ü',
}

def tr_lower(text: str) -> str:
    return ''.join(TR_LOWER_MAP.get(c, c.lower()) for c in text)

def tr_title(text: str) -> str:
    return ' '.join(
        word[:1].upper() + tr_lower(word[1:])
        if word else ''
        for word in text.split()
    )

def redirect_back_or_default(request, default_url_name, kwargs=None):
    referer = request.META.get("HTTP_REFERER")

    if referer:
        return redirect(referer)

    if kwargs:
        url = reverse(default_url_name, kwargs=kwargs)
        return redirect(url)

    return redirect(default_url_name)

def remove_escape_sequences(text: str) -> str:
    try:
        text = text.encode('utf-8').decode('unicode_escape')
    except Exception:
        pass
    cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]+', ' ', text)
    address_line = re.sub(r'\s+', ' ', cleaned).strip()
    return address_line

def camel_case(text):
    # Türkçe karakterleri ve özel karakterleri kontrol et
    words = text.split('-')  # Kelimeleri '-' ile ayır
    words = [words[0].lower()]  # İlk kelimenin ilk harfini küçük yap
    for word in words[1:]:
        words.append(word.capitalize())  # Diğer kelimelerin ilk harfini büyük yap
    return ''.join(words)

def error_page(request, e):

    exception_map = {
        KeyError: "İstenen veri bulunamadı.",
        ValueError: "Geçersiz bir değer gönderildi.",
        PermissionError: "Bu işlem için yetkiniz yok.",
        FileNotFoundError: "İstenen dosya bulunamadı.",
        TypeError: "Yanlış veri tipi kullanıldı.",
        Exception: "Beklenmeyen bir hata oluştu."
    }

    hata_mesaji = None

    if isinstance(e, Exception):
        for exc_type, tr_msg in exception_map.items():
            if isinstance(e, exc_type):
                hata_mesaji = tr_msg
                break
    else:
        hata_mesaji = "Bilinmeyen bir hata oluştu."

    return render(request, "404.html", {
        "hata": hata_mesaji,
        "e": e,
    })


def is_digit(value):
    try:
        int(value)
        return True
    except (ValueError, TypeError):
        return False



def get_user_from_request(request):
    from django.contrib.auth.models import AnonymousUser
    from knox.models import AuthToken
    token = request.META.get("HTTP_AUTHORIZATION")

    # Eğer user zaten login değilse ve header'da token varsa
    if isinstance(request.user, AnonymousUser) and token:
        try:
            # Header: "Token <token_value>"
            raw_token = token.replace("Token ", "").strip()
            # Knox token sorgula
            auth_token = AuthToken.objects.select_related("user").get(token_key=raw_token[:15])
            user = auth_token.user
            return user

        except AuthToken.DoesNotExist:
            # token bulunamadı
            return None

    # yoksa request.user dön
    return request.user

def get_auth_token_from_request(request):
    from django.contrib.auth.models import AnonymousUser
    from knox.models import AuthToken
    token = request.META.get("HTTP_AUTHORIZATION")

    # Eğer user zaten login değilse ve header'da token varsa
    if isinstance(request.user, AnonymousUser) and token:
        try:
            # Header: "Token <token_value>"
            raw_token = token.replace("Token ", "").strip()
            # Knox token sorgula
            auth_token = AuthToken.objects.select_related("user").get(token_key=raw_token[:15])
            return auth_token

        except AuthToken.DoesNotExist:
            # token bulunamadı
            return None

    # yoksa request.user dön
    return request.user


def snake_to_camel_case(text):
    parts = text.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

def snake_to_pascal_case(text):
    return ''.join(word.capitalize() for word in text.split('_'))


TR_TZ = timezone(timedelta(hours=3))

def format_iso_date(iso_date):
    dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
    dt = dt.astimezone(TR_TZ)
    return dt.strftime("%Y-%m-%d")

def format_iso_time(iso_date):
    dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
    dt = dt.astimezone(TR_TZ)
    return dt.strftime("%H:%M")

def iso_string_to_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        parsed_date = date.fromisoformat(date_str[:10])
        return parsed_date + timedelta(days=1)
    except ValueError:
        return None

def iso_string_to_datetime(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        # Z'yi UTC offset formatına çevir
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"

        parsed_datetime = datetime.fromisoformat(date_str)
        return parsed_datetime 

    except ValueError:
        return None

class UnsupportedFileTypeError(Exception):
    pass


def detect_file_type(file: Upload) -> str:
    if not file.content_type:
        raise UnsupportedFileTypeError("Content type bulunamadı.")
    content_type = file.content_type.lower()
    if content_type.startswith("video/"):
        return "video"
    elif content_type.startswith("image/"):
        return "image"
    else:
        raise UnsupportedFileTypeError(
            f"Desteklenmeyen dosya tipi: {file.content_type}"
        )
    

def send_expo_notification(token, title, body, data=None):
    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {}
    }
    response = requests.post(url, json=payload, headers=headers)
    print(response.status_code, response.json())
    return response.status_code, response.json()
