from django.db import models
from colorfield.fields import ColorField

class Organization(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    logo_light = models.ImageField(upload_to='organization_logos/', blank=True, null=True)
    logo_dark = models.ImageField(upload_to='organization_logos/', blank=True, null=True)
    logo_min_light = models.ImageField(upload_to='organization_logos/', blank=True, null=True)
    logo_min_dark = models.ImageField(upload_to='organization_logos/', blank=True, null=True)
    favicon = models.ImageField(upload_to='organization_logos/', blank=True, null=True)
    theme_color = ColorField(default='#FF0000')

    def __str__(self):
        return self.name
    
class EmailConfig(models.Model):
    host = models.CharField(max_length=255, verbose_name="SMTP Host")
    port = models.PositiveIntegerField(default=587, verbose_name="SMTP Port")
    use_tls = models.BooleanField(default=True, verbose_name="TLS Kullan")
    use_ssl = models.BooleanField(default=False, verbose_name="SSL Kullan")
    default_password = models.CharField(
        max_length=255,
        verbose_name="Varsayılan Mail Şifresi",
        help_text="Şimdilik tüm kullanıcılar için ortak"
    )
    timeout = models.PositiveIntegerField(default=10)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Mail Server Ayarı"
        verbose_name_plural = "Mail Server Ayarları"

    def __str__(self):
        return "Mail Server Konfigürasyonu"

    @classmethod
    def get_config(cls):
        return cls.objects.first()

    
class AppSettings(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE)
    email_config = models.OneToOneField(EmailConfig, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Settings for {self.organization.name}"
    
    @classmethod
    def get_config(cls):
        return cls.objects.first()

        
