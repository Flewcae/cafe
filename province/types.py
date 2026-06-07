from typing import Optional
import strawberry
from strawberry import auto
from strawberry_django import type

from province.models import Address, Center, City, Country, District



@strawberry.type
class Result:
    success: bool
    message: str

@type(Center)
class CenterType:
    id: auto
    latitude: auto
    longitude: auto

@type(Country)
class CountryType:
    id: auto
    name: auto
    center: Optional[CenterType]

@type(City)
class CityType:
    id: auto
    name: auto
    country: CountryType
    center: Optional[CenterType]



@type(District)
class DistrictType:
    id: auto
    name: auto
    country: CountryType
    city: CityType
    center: Optional[CenterType]


@type(Address)
class AddressType:
    id:auto
    center: Optional[CenterType]
    country :CountryType
    city: CityType
    district: DistrictType
    address_line: auto