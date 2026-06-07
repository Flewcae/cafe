from settings.models import AppSettings


def organization_theme(request):
    organization = AppSettings.objects.first().organization

    return {
        'organization': organization
    }

