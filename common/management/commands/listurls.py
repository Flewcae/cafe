from django.core.management.base import BaseCommand
from django.urls import get_resolver, reverse, NoReverseMatch
from django.urls.resolvers import URLPattern, URLResolver

          
class Command(BaseCommand):
    help = "Tüm URL'leri pattern + name + reverse haliyle listeler"

    def handle(self, *args, **options):
        resolver = get_resolver()
        self.stdout.write(
            self.style.SUCCESS("NAME                                                                   | PATTERN                                                                         | REVERSE")
        )
        self.stdout.write("-" * 180)
        self.list_urls(resolver)

    def list_urls(self, resolver, prefix=""):
        for pattern in resolver.url_patterns:
            if isinstance(pattern, URLPattern):
                name = pattern.name or ""
                pattern_str = prefix + str(pattern.pattern)
                try:
                    reverse_url = reverse(name) if name else ""
                except NoReverseMatch:
                    reverse_url = "NoReverseMatch"
                self.stdout.write(
                    f"{name:<70} | {pattern_str:<80} | {reverse_url}"
                )
            elif isinstance(pattern, URLResolver):
                self.list_urls(pattern, prefix + str(pattern.pattern))    
