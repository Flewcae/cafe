import strawberry
from typing import List
from strawberry.types import Info
from common.permissions import IsAuthenticated
from .types import CityType, DistrictType
from province.models import City, District

@strawberry.type
class Query:
    @strawberry.field(permission_classes=[IsAuthenticated])
    def cities(self, info: Info) -> List[CityType]:
        qs = City.objects.all()
        return qs

    @strawberry.field(permission_classes=[IsAuthenticated])
    def districts(self, info: Info) -> List[DistrictType]:
        qs = District.objects.all()
        return qs