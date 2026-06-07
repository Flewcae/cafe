from django.db import models
from django.conf import settings

from common.utils import snake_to_pascal_case

class ExtendedPermission(models.Model):
    code = models.SlugField(
        max_length=100,
        unique=True,
        help_text="access_visit"
    )
    name = models.CharField(
        max_length=150,
        help_text="Ziyaret Evrakları"
    )
    list_index = models.FloatField(default=0)

    visible = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class ExtendedPermissionAction(models.Model):
    ACTIONS = (
        ('add', 'Ekleme'),
        ('change', 'Düzenleme'),
        ('delete', 'Silme'),
        ('view', 'Görüntüleme'),
    )

    permission = models.ForeignKey(
        ExtendedPermission,
        related_name='actions',
        on_delete=models.CASCADE
    )
    action = models.CharField(max_length=10, choices=ACTIONS)

    class Meta:
        unique_together = ('permission', 'action')

    def __str__(self):
        return f"{self.permission.code}:{self.action}"

class UserExtendedPermission(models.Model):
    user = models.ForeignKey(
        'account.User',
        related_name='extended_permissions',
        on_delete=models.CASCADE
    )
    permission = models.ForeignKey(
        ExtendedPermission,
        on_delete=models.CASCADE
    )
    action = models.CharField(max_length=10)

    class Meta:
        unique_together = ('user', 'permission', 'action')

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.permission.code}:{self.action}"
    
    @property
    def key_name(self):
        
        return f"can{self.action.capitalize()}{snake_to_pascal_case(self.permission.code)}" 
