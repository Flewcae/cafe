from typing import Optional
import strawberry
from strawberry import auto
from strawberry_django import type

from common.models import FAQ


@strawberry.type
class PageInfo:
    has_next_page: bool
    end_cursor: Optional[str]


@strawberry.type
class Result:
    success: bool
    message: str


@type(FAQ)
class FaqType:
    id:auto
    question: str
    answer: str


