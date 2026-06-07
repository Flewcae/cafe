import strawberry
from account.models import User
from strawberry import auto
from strawberry_django import type, field, filter
from typing import Optional, List

from common.types import PageInfo
from province.types import AddressType

@strawberry.input
class EditAccountForm:
    firstName: str
    lastName: str
    phone: Optional[str]
    email: Optional[str]
    gender: Optional[str]
    city: Optional[str]
    district: Optional[str]
    address: Optional[str]

@strawberry.input
class EditPersonalForm:
    resume: Optional[str]
    facebook: Optional[str]
    twitter: Optional[str]
    instagram: Optional[str]
    youtube: Optional[str]
    university: Optional[str]

@strawberry.input
class ContactsPaginationInput:
    first: int = 20
    after: Optional[str] = None
    search: Optional[str] = None


@strawberry.type
class UserEdge:
    node: "UserType"
    cursor: str


@strawberry.type
class UserConnection:
    edges: List[UserEdge]
    page_info: PageInfo


@type(User)
class UserType:
    id: auto
    email: auto
    first_name: auto
    last_name: auto
    phone: auto
    image: auto
    address: Optional[AddressType]
    university: auto
    resume: auto
    gender: auto
    facebook: auto
    twitter: auto
    instagram: auto
    youtube: auto

    @strawberry.field
    def permissions(self, info) -> List[str]:
        return [p.key_name for p in self.extended_permissions.all()]
   
    @strawberry.field
    def user_position(self, info) -> str:
        return self.position



@strawberry.type
class AuthResult:
    success: bool
    message: str
    token: Optional[str]
    user: Optional[UserType]

@strawberry.type
class CheckEmailResult:
    valid: bool
    has_phone: str