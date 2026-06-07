from django.db import models

from common.utils import tr_title

class Center(models.Model):
    latitude = models.CharField()
    longitude = models.CharField()

    def __str__(self):
        return self.latitude + " ||| " + self.longitude

class Country(models.Model):
    name = models.CharField(max_length=50)
    center = models.ForeignKey(Center, on_delete=models.SET_NULL, null=True, blank=True)

class City(models.Model):
    name = models.CharField(max_length=50)
    country = models.ForeignKey(Country, related_name="cities", on_delete=models.CASCADE)
    center = models.ForeignKey(Center, on_delete=models.SET_NULL, null=True, blank=True)

    @property
    def code(self):
        return f"#{self.id}"

    def __str__(self):
        return str(self.id) + " " + tr_title(self.name)

class District(models.Model):
    name = models.CharField(max_length=50)
    country = models.ForeignKey(Country, related_name="country_districts", on_delete=models.CASCADE)
    city = models.ForeignKey(City, related_name="districts", on_delete=models.CASCADE)
    center = models.ForeignKey(Center, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return str(self.city.__str__()) + " " + tr_title(self.name)
    
    @property
    def code(self):
        return f"#{self.city.id}{self.name[:3].upper()}"

class Address(models.Model):
    center = models.ForeignKey(Center, on_delete=models.SET_NULL, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True)
    address_line = models.TextField()


    def __str__(self):
        return f"{self.address_line}, {tr_title(self.district.name) if self.district else ''} {tr_title(self.city.name) if self.city else ''} {self.country.name if self.country else ''}"