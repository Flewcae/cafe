from django.db import models
import threading
from django.core.mail import EmailMessage
from django.contrib.auth import get_user_model
from django.conf import settings
from knox.models import AuthToken

User = get_user_model()

class Note(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey("account.User", on_delete=models.CASCADE)

class FAQ(models.Model):
    question = models.TextField()
    answer = models.TextField()

    def __str__(self):
        return self.question




class Email(models.Model):
    subject = models.CharField(max_length=255,verbose_name="Mail Başlığı")
    content = models.TextField(verbose_name="E-Posta İçeriği")
    recipients = models.JSONField(default=list,verbose_name="Alıcı Kullanıcı ID Listesi")
    created_by = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='sent_emails',verbose_name="Oluşturan")
    created_at = models.DateTimeField(auto_now_add=True,verbose_name="Oluşturulma Tarihi")

    def __str__(self):
        return self.subject
    

    @classmethod
    def send_async(cls, email_id):
        from .tasks import send_email_task
        send_email_task.delay(email_id)


    def success_count(self):
        return EmailStatus.objects.filter(
            email=self,
            status=EmailStatus.STATUS_SUCCESS
        ).count()

    def failed_count(self):
        return EmailStatus.objects.filter(
            email=self,
            status=EmailStatus.STATUS_FAILED
        ).count()

    def pending_count(self):
        return EmailStatus.objects.filter(
            email=self,
            status=EmailStatus.STATUS_PENDING
        ).count()

    def total_count(self):
        return EmailStatus.objects.filter(email=self).count()

class EmailAttachment(models.Model):
    email = models.ForeignKey(Email,on_delete=models.CASCADE,related_name='attachments')
    file = models.FileField(upload_to='email_attachments/',verbose_name="Dosya")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name

class EmailStatus(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = ((STATUS_PENDING, 'Pending'),(STATUS_SUCCESS, 'Success'),(STATUS_FAILED, 'Failed'),)

    email = models.ForeignKey('Email',on_delete=models.CASCADE,related_name='statuses')

    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='email_statuses')

    status = models.CharField(max_length=10,choices=STATUS_CHOICES,default=STATUS_PENDING)

    error_message = models.TextField(blank=True,null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('email', 'user')

    def __str__(self):
        return f"{self.email.subject} → {self.user} ({self.status})"



class SMS(models.Model):
    content = models.TextField(verbose_name="SMS İçeriği")
    recipients = models.JSONField(default=list,verbose_name="Alıcı Kullanıcı ID Listesi")
    created_by = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='sent_smss',verbose_name="Oluşturan")
    created_at = models.DateTimeField(auto_now_add=True,verbose_name="Oluşturulma Tarihi")

    def __str__(self):
        return self.content
    

    @classmethod
    def send_async(cls, sms_id):
        from .tasks import send_sms_task
        send_sms_task.delay(sms_id)


    def success_count(self):
        return SMSStatus.objects.filter(
            sms=self,
            status=SMSStatus.STATUS_SUCCESS
        ).count()

    def failed_count(self):
        return SMSStatus.objects.filter(
            sms=self,
            status=SMSStatus.STATUS_FAILED
        ).count()

    def pending_count(self):
        return SMSStatus.objects.filter(
            sms=self,
            status=SMSStatus.STATUS_PENDING
        ).count()

    def total_count(self):
        return SMSStatus.objects.filter(sms=self).count()

class SMSStatus(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = ((STATUS_PENDING, 'Pending'),(STATUS_SUCCESS, 'Success'),(STATUS_FAILED, 'Failed'),)

    sms = models.ForeignKey('SMS',on_delete=models.CASCADE,related_name='statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='sms_statuses')
    status = models.CharField(max_length=10,choices=STATUS_CHOICES,default=STATUS_PENDING)
    error_message = models.TextField(blank=True,null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('sms', 'user')

    def __str__(self):
        return f"{self.sms.content} → {self.user} ({self.status})"


class Notification(models.Model):
    title = models.CharField(max_length=255, verbose_name="Bildirim Başlığı")
    content = models.TextField(verbose_name="Bildirim İçeriği")
    recipients = models.JSONField(default=list,verbose_name="Alıcı Kullanıcı ID Listesi")
    created_by = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='sent_notifications',verbose_name="Oluşturan")
    created_at = models.DateTimeField(auto_now_add=True,verbose_name="Oluşturulma Tarihi")

    def __str__(self):
        return self.content
    

    @classmethod
    def send_async(cls, notification_id):
        from .tasks import send_notification_task
        send_notification_task.delay(notification_id)


    def success_count(self):
        return NotificationStatus.objects.filter(
            notification=self,
            status=NotificationStatus.STATUS_SUCCESS
        ).count()

    def failed_count(self):
        return NotificationStatus.objects.filter(
            notification=self,
            status=NotificationStatus.STATUS_FAILED
        ).count()

    def pending_count(self):
        return NotificationStatus.objects.filter(
            notification=self,
            status=NotificationStatus.STATUS_PENDING
        ).count()

    def total_count(self):
        return NotificationStatus.objects.filter(notification=self).count()

class NotificationToken(models.Model):
    user = models.ForeignKey("account.User", on_delete=models.CASCADE)
    # auth_token = models.ForeignKey(
    #     AuthToken,
    #     on_delete=models.CASCADE,
    #     related_name="notification_tokens"
    # )
    token = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class NotificationStatus(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = ((STATUS_PENDING, 'Pending'),(STATUS_SUCCESS, 'Success'),(STATUS_FAILED, 'Failed'),)

    notification = models.ForeignKey('Notification',on_delete=models.CASCADE,related_name='statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='notification_statuses')
    token = models.ForeignKey(NotificationToken,on_delete=models.CASCADE,related_name='notification_statuses')
    status = models.CharField(max_length=10,choices=STATUS_CHOICES,default=STATUS_PENDING)
    error_message = models.TextField(blank=True,null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('notification', 'user')

    def __str__(self):
        return f"{self.notification.title} → {self.user} ({self.status})"
