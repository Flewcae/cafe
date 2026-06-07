from django.contrib import admin

from province.models import *

# Register your models here.
@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    search_fields = ('address_line',)

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    search_fields = ('name',)
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    search_fields = ('name',)
@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    search_fields = ('name',)


admin.site.register(Center)
