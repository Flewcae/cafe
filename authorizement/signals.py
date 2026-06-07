# accounts/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ExtendedPermission, ExtendedPermissionAction

@receiver(post_save, sender=ExtendedPermission)
def create_default_actions(sender, instance, created, **kwargs):
    if created:
        for action in ['add', 'change', 'delete', 'view']:
            ExtendedPermissionAction.objects.create(
                permission=instance,
                action=action
            )
