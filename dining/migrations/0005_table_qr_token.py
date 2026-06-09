import uuid
from django.db import migrations, models


def gen_tokens(apps, schema_editor):
    Table = apps.get_model('dining', 'Table')
    for t in Table.objects.all():
        t.qr_token = uuid.uuid4()
        t.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('dining', '0004_alter_table_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='table',
            name='qr_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(gen_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='table',
            name='qr_token',
            field=models.UUIDField(
                default=uuid.uuid4, editable=False, unique=True,
                verbose_name='QR Anahtarı',
            ),
        ),
    ]