import strawberry
from typing import List
from strawberry.types import Info
from common.models import FAQ
from common.permissions import IsAuthenticated
from common.types import FaqType

@strawberry.type
class Query:
    @strawberry.field(permission_classes=[IsAuthenticated])
    def faqs(self, info: Info) -> List[FaqType]:
        qs = FAQ.objects.all()
        return qs