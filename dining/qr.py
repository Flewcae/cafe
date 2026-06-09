import io
import re

import qrcode


def safe_name(value):
    """Dosya/klasör adı için güvenli hale getirir (Türkçe karakterleri korur)."""
    value = (value or '').strip()
    value = re.sub(r'[\\/:*?"<>|]+', '_', value)
    return value or 'x'


def make_qr_png(url, box_size=10, border=4):
    """Verilen URL için PNG QR kodu üretir, bytes döndürür."""
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()