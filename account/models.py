import os
import random
import string
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.core.files import File
from django.apps import apps

from cafe.action_resolver import UserGenException

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email zorunludur")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    GENDER_CHOICES = [
        ('E', 'Erkek'),
        ('K', 'Kadın'),
    ]



    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=10, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(auto_now_add=True)
    notes = models.ManyToManyField("common.Note", blank=True, related_name='account_notes')
    image = models.ImageField(
        upload_to='users/',
        null=True,
        blank=True
    )
    address = models.ForeignKey('province.Address',on_delete=models.SET_NULL,null=True,blank=True,related_name='users')    

    gender = models.CharField(max_length=1, null=True, blank=True, choices=GENDER_CHOICES)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
            return self.get_full_name()
    def get_full_name(self):
        return self.first_name + ' ' + self.last_name if self.first_name and self.last_name else "İsim Soyisim"
    



    def save(self, *args, **kwargs):
        if not self.image:
            self.image.name = 'defaults/user.jpeg'
        super().save(*args, **kwargs)


    @classmethod
    def create_from_form(cls, form_data, files=None):
        email = form_data.get('email', None)
        first_name = form_data.get('first_name', None)
        last_name = form_data.get('last_name', None)
        phone = form_data.get('phone', None)

        if any(field == "" or field == None for field in [email, first_name, last_name, phone]):
            raise ValueError("Form bilgileri eksik.")
        
        if cls.objects.filter(email = email):
            raise ValueError("Email adresi zaten başka bir hesap tarafından kullanılıyor")
        if cls.objects.filter(phone = phone):
            raise ValueError("Telefon Numarası zaten başka bir hesap tarafından kullanılıyor")

        # Image kontrolü
        image = None
        if files:
            image = files.get('image', None)
        
        # Image-clear kontrolü
        image_clear = form_data.get('image-clear', None)
        if image_clear == 'on':
            image = None
        
        # User oluştur
        user = User.objects.create(
            email=email,
            first_name=first_name or '',
            last_name=last_name or '',
            phone= phone
        )
        
        # Image varsa kaydet
        if image:
            user.image = image
            user.save()
        
        return user
    

    @classmethod
    def update_from_form(cls, instance, form_data, files=None):
        print('form_data', form_data)
        print('files', files)
        email = form_data.get('email', None)
        first_name = form_data.get('first_name', None)
        last_name = form_data.get('last_name', None)
        phone = form_data.get('phone', None)

        if any(field == "" or field == None for field in [email, first_name, last_name, phone]):
            raise UserGenException("Form bilgileri eksik.")
        
        if email != instance.email and cls.objects.filter(email = email):
            raise UserGenException("Email adresi zaten başka bir hesap tarafından kullanılıyor")
        if phone != instance.phone and cls.objects.filter(phone = phone):
            raise UserGenException("Telefon Numarası zaten başka bir hesap tarafından kullanılıyor")

        # Image kontrolü
        image = None
        if files:
            image = files.get('image', None)
        
        # Image-clear kontrolü
        image_clear = form_data.get('image-clear', None)
        if image_clear == 'on':
            image = None
        
        # User oluştur
        instance.email = email
        instance.first_name = first_name or ''
        instance.last_name = last_name or ''
        instance.phone = phone
        instance.save()

        # Image varsa kaydet
        if image:
            instance.image = image
            instance.save()
        else:
            if form_data.get("image_removed") == "1":
                instance.image = None
                instance.save()
        
        return instance
    

    def get_permissions(self):
        perms = {}
        qs = self.extended_permissions.select_related('permission')

        for p in qs:
            key = p.permission.code
            perms.setdefault(key, []).append(p.action)
        return perms

    def has_ext_perm(self, perm, action):
        return self.extended_permissions.filter(permission__code=perm, action=action).exists()
    
    def reset_password(self, via="email"):
        chars = string.ascii_letters + string.digits  # büyük-küçük harf + rakam
        new_password = ''.join(random.choice(chars) for _ in range(10))  # 10 karakter
        new_password = "2028"
        self.set_password(new_password)
        self.save()

        match via:
            case "email":
                Email = apps.get_model('common', 'Email')
                EmailStatus = apps.get_model('common', 'EmailStatus')

                email = Email.objects.create(
                    subject="Anahtar Portal Şifre Değişikliği",
                    content=f"Anahtar Portal şifreniz sıfırlanmıştır; Yeni şifreniz: {new_password}",
                    recipients=[self.id],
                    created_by=self,
                )
                EmailStatus.objects.create(
                    email=email,
                    user=self,
                    status=EmailStatus.STATUS_PENDING
                )
                Email.send_async(email.id)
            case "phone":
                SMS = apps.get_model('common', 'SMS')
                SMSStatus = apps.get_model('common', 'SMSStatus')
                sms = SMS.objects.create(
                    content=f"Anahtar Portal şifreniz sıfırlanmıştır; Yeni şifreniz: {new_password}",
                    recipients=[self.id],
                    created_by=self,
                )
                SMSStatus.objects.create(
                        sms=sms,
                        user=self,
                        status=SMSStatus.STATUS_PENDING
                    )
                SMS.send_async(sms.id)

        return