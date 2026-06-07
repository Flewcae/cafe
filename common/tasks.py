from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.utils import timezone
from django.db.models import Q
from .models import Email, EmailStatus, Notification, NotificationStatus, NotificationToken
from .utils import get_email_backend, send_expo_notification

User = get_user_model()


def send_sms_task():
    pass

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=30, retry_kwargs={'max_retries': 3})
def send_notification_task(self, id):
    notification = Notification.objects.get(id=id)
    statuses = NotificationStatus.objects.filter(
        notification=notification,
        status=NotificationStatus.STATUS_PENDING
    )
    print('statuses',statuses)
    for status_obj in statuses:
        try:
            send_expo_notification(
                token=status_obj.token.token,
                title=notification.title,
                body=notification.content
            )

            status_obj.status = NotificationStatus.STATUS_SUCCESS
            status_obj.sent_at = timezone.now()
            status_obj.error_message = None

        except Exception as e:
            status_obj.status = NotificationStatus.STATUS_FAILED
            status_obj.error_message = str(e)

            # 🔥 eğer retry istiyorsan bunu açabilirsin
            # raise self.retry(exc=e)

        status_obj.save()

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=30, retry_kwargs={'max_retries': 3})
def send_email_task(self, email_id):
    email_obj = Email.objects.select_related("created_by").get(id=email_id)
    users = User.objects.filter(id__in=email_obj.recipients)

    sender = email_obj.created_by
    if not sender or not sender.email:
        raise Exception("Mail gönderen kullanıcı tanımlı değil")

    backend = get_email_backend(sender.email)

    for user in users:
        status_obj= EmailStatus.objects.get(
            email=email_obj,
            user=user,
            status= EmailStatus.STATUS_PENDING
        )

        try:
            msg = EmailMessage(
                subject=email_obj.subject,
                body=email_obj.content,
                from_email=sender.email,
                to=[user.email],
                connection=backend
            )

            for attachment in email_obj.attachments.all():
                msg.attach_file(attachment.file.path)

            msg.send()

            status_obj.status = EmailStatus.STATUS_SUCCESS
            status_obj.sent_at = timezone.now()
            status_obj.error_message = None
            status_obj.save()

        except Exception as e:
            status_obj.status = EmailStatus.STATUS_FAILED
            status_obj.error_message = str(e)
            status_obj.save()
