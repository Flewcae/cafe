from django.db import migrations


def create_kitchen_permission(apps, schema_editor):
    # Historical models' signals are not connected to the live ExtendedPermission
    # post_save receiver, so the action rows are created explicitly here.
    ExtendedPermission = apps.get_model('authorizement', 'ExtendedPermission')
    ExtendedPermissionAction = apps.get_model('authorizement', 'ExtendedPermissionAction')

    perm, _ = ExtendedPermission.objects.get_or_create(
        code='kitchen',
        defaults={'name': 'Mutfak Paneli'},
    )
    for action in ['add', 'change', 'delete', 'view']:
        ExtendedPermissionAction.objects.get_or_create(permission=perm, action=action)


def remove_kitchen_permission(apps, schema_editor):
    ExtendedPermission = apps.get_model('authorizement', 'ExtendedPermission')
    ExtendedPermission.objects.filter(code='kitchen').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorizement', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_kitchen_permission, remove_kitchen_permission),
    ]
