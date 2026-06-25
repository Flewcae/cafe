from datetime import datetime
from decimal import Decimal
import time
from typing import AsyncGenerator, List, Optional

import strawberry
from asgiref.sync import sync_to_async
from django.contrib.auth import authenticate
from django.db import transaction
from knox.models import AuthToken

from account.models import User
from authorizement.constants import Action, Perm
from cafe.action_resolver import UserGenException
from common.utils import get_auth_token_from_request, get_user_from_request
from dining.models import Room, Table
from menu.models import Category, Product
from orders.models import Order, OrderItem, Receipt
from settings.models import AppSettings


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def _request(info):
    return info.context["request"]


def _current_user(info):
    """Query/Mutation auth: resolve the user from the HTTP `Authorization` header."""
    user = get_user_from_request(_request(info))
    if user and getattr(user, "is_authenticated", False):
        return user
    return None


def _user_from_token(raw: Optional[str]):
    if not raw:
        return None
    raw = raw.replace("Token ", "").strip()
    try:
        return AuthToken.objects.select_related("user").get(token_key=raw[:15]).user
    except AuthToken.DoesNotExist:
        return None


def _ws_user(info):
    """Subscription auth: token is sent in graphql-ws connectionParams."""
    params = info.context.get("connection_params") or {}
    token = params.get("Authorization") or params.get("authorization")
    return _user_from_token(token)


def _require(info, perm: Optional[str] = None, action: Optional[str] = None):
    user = _current_user(info)
    if user is None:
        raise UserGenException("Oturum doğrulanamadı. Lütfen tekrar giriş yapın.")
    if perm and action and not user.has_ext_perm(perm, action):
        raise UserGenException("Bu işlem için yetkiniz yok.")
    return user


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
@strawberry.type
class UserType:
    id: strawberry.ID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: str
    phone: Optional[str]
    gender: Optional[str]
    is_staff: bool
    image_url: Optional[str]
    permissions: List[str]


@strawberry.type
class AuthPayload:
    success: bool
    message: str
    token: Optional[str]
    user: Optional[UserType]


@strawberry.type
class Result:
    success: bool
    message: str


@strawberry.type
class OrganizationSettingsType:
    name: str
    theme_color: str
    logo_light_url: Optional[str]
    logo_dark_url: Optional[str]
    logo_min_light_url: Optional[str]
    logo_min_dark_url: Optional[str]
    favicon_url: Optional[str]
    updated_at: datetime


@strawberry.type
class ProductType:
    id: strawberry.ID
    name: str
    description: Optional[str]
    price: Decimal
    image_url: Optional[str]
    preparation_time: Optional[int]
    is_active: bool
    is_available: bool
    status_color: str
    status_label: str


@strawberry.type
class CategoryType:
    id: strawberry.ID
    name: str
    description: Optional[str]
    products: List[ProductType]


@strawberry.type
class OrderItemType:
    id: strawberry.ID
    product_id: Optional[strawberry.ID]
    name: str
    unit_price: Decimal
    quantity: int
    note: Optional[str]
    status: str
    status_display: str
    status_color: str
    line_total: Decimal


@strawberry.type
class ReceiptType:
    id: strawberry.ID
    code: str
    method: str
    method_display: str
    amount: Decimal
    note: Optional[str]
    paid_at: datetime


@strawberry.type
class OrderType:
    id: strawberry.ID
    code: str
    order_type: str
    type_display: str
    status: str
    status_display: str
    status_color: str
    is_open: bool
    note: Optional[str]
    table_id: Optional[strawberry.ID]
    table_name: Optional[str]
    item_count: int
    subtotal: Decimal
    total: Decimal
    total_paid: Decimal
    balance: Decimal
    is_fully_paid: bool
    created_at: datetime
    items: List[OrderItemType]
    receipts: List[ReceiptType]


@strawberry.type
class TableType:
    id: strawberry.ID
    name: str
    capacity: int
    status: str
    status_display: str
    status_color: str
    shape: str
    shape_display: str
    is_active: bool
    pos_x: float
    pos_y: float
    width: int
    height: int
    rotation: int
    qr_token: str
    has_open_order: bool
    open_order_id: Optional[strawberry.ID]


@strawberry.type
class RoomType:
    id: strawberry.ID
    name: str
    description: Optional[str]
    is_active: bool
    canvas_width: int
    canvas_height: int
    table_count: int
    total_capacity: int
    tables: List[TableType]


@strawberry.type
class TableDetailType:
    table: TableType
    open_order: Optional[OrderType]
    menu: List[CategoryType]


# ---------------------------------------------------------------------------
# Builders (model -> type)  — all synchronous; wrap with sync_to_async in async ctx
# ---------------------------------------------------------------------------
def _safe_image_url(field) -> Optional[str]:
    try:
        return field.url if field else None
    except Exception:
        return None


def build_organization_settings() -> Optional[OrganizationSettingsType]:
    config = AppSettings.get_config()
    if not config or not config.organization:
        return None
    org = config.organization
    return OrganizationSettingsType(
        name=org.name,
        theme_color=org.theme_color,
        logo_light_url=_safe_image_url(org.logo_light),
        logo_dark_url=_safe_image_url(org.logo_dark),
        logo_min_light_url=_safe_image_url(org.logo_min_light),
        logo_min_dark_url=_safe_image_url(org.logo_min_dark),
        favicon_url=_safe_image_url(org.favicon),
        updated_at=org.updated_at,
    )


def build_user(user: User) -> UserType:
    perms = []
    for code, actions in user.get_permissions().items():
        perms.extend(f"{code}:{a}" for a in actions)
    return UserType(
        id=user.id, email=user.email, first_name=user.first_name,
        last_name=user.last_name, full_name=user.get_full_name(), phone=user.phone,
        gender=user.gender, is_staff=user.is_staff,
        image_url=_safe_image_url(user.image), permissions=perms,
    )


def build_product(p: Product) -> ProductType:
    return ProductType(
        id=p.id, name=p.name, description=p.description, price=p.price,
        image_url=_safe_image_url(p.image), preparation_time=p.preparation_time,
        is_active=p.is_active, is_available=p.is_available,
        status_color=p.status_color, status_label=p.status_label,
    )


def build_category(c: Category) -> CategoryType:
    return CategoryType(
        id=c.id, name=c.name, description=c.description,
        products=[build_product(p) for p in c.products.all() if p.is_active],
    )


def build_item(i: OrderItem) -> OrderItemType:
    return OrderItemType(
        id=i.id, product_id=i.product_id, name=i.name, unit_price=i.unit_price,
        quantity=i.quantity, note=i.note, status=i.status,
        status_display=i.get_status_display(), status_color=i.status_color,
        line_total=i.line_total,
    )


def build_receipt(r: Receipt) -> ReceiptType:
    return ReceiptType(
        id=r.id, code=r.code, method=r.method,
        method_display=r.get_method_display(), amount=r.amount,
        note=r.note, paid_at=r.paid_at,
    )


def build_order(o: Order) -> OrderType:
    return OrderType(
        id=o.id, code=o.code, order_type=o.order_type,
        type_display=o.get_order_type_display(), status=o.status,
        status_display=o.get_status_display(), status_color=o.status_color,
        is_open=o.is_open, note=o.note, table_id=o.table_id,
        table_name=(o.table.name if o.table_id else None),
        item_count=o.item_count, subtotal=o.subtotal, total=o.total,
        total_paid=o.total_paid, balance=o.balance, is_fully_paid=o.is_fully_paid,
        created_at=o.created_at,
        items=[build_item(i) for i in o.items.all()],
        receipts=[build_receipt(r) for r in o.receipts.all()],
    )


def build_table(t: Table, open_order: Optional[Order] = None) -> TableType:
    return TableType(
        id=t.id, name=t.name, capacity=t.capacity, status=t.status,
        status_display=t.get_status_display(), status_color=t.status_color,
        shape=t.shape, shape_display=t.get_shape_display(), is_active=t.is_active,
        pos_x=t.pos_x, pos_y=t.pos_y, width=t.width, height=t.height,
        rotation=t.rotation, qr_token=str(t.qr_token),
        has_open_order=open_order is not None,
        open_order_id=(open_order.id if open_order else None),
    )


def build_room(r: Room, open_by_table: dict) -> RoomType:
    return RoomType(
        id=r.id, name=r.name, description=r.description, is_active=r.is_active,
        canvas_width=r.canvas_width, canvas_height=r.canvas_height,
        table_count=r.table_count, total_capacity=r.total_capacity,
        tables=[build_table(t, open_by_table.get(t.id)) for t in r.tables.all()],
    )


# ---------------------------------------------------------------------------
# Fetchers (synchronous DB access)
# ---------------------------------------------------------------------------
def _open_orders_by_table() -> dict:
    return {
        o.table_id: o
        for o in (
            Order.objects.exclude(status__in=Order.CLOSED_STATUSES)
            .filter(table__isnull=False).order_by("created_at")
        )
    }


def _open_order_for_table(table: Table) -> Optional[Order]:
    return (
        Order.objects.exclude(status__in=Order.CLOSED_STATUSES)
        .filter(table=table).order_by("-created_at").first()
    )


def _active_menu() -> List[CategoryType]:
    categories = (
        Category.objects.filter(is_active=True)
        .prefetch_related("products").order_by("list_index", "name")
    )
    return [build_category(c) for c in categories]


def _fetch_order_payload(order_id) -> Optional[OrderType]:
    o = (
        Order.objects.select_related("table")
        .prefetch_related("items__product", "receipts").filter(pk=order_id).first()
    )
    return build_order(o) if o else None


def _fetch_room_payload(room_id) -> Optional[RoomType]:
    room = Room.objects.filter(pk=room_id).prefetch_related("tables").first()
    if not room:
        return None
    return build_room(room, _open_orders_by_table())


def _fetch_table_detail(table_id) -> Optional[TableDetailType]:
    table = Table.objects.filter(pk=table_id).select_related("room").first()
    if not table:
        return None
    order = _open_order_for_table(table)
    return TableDetailType(
        table=build_table(table, order),
        open_order=build_order(order) if order else None,
        menu=_active_menu(),
    )


def _fetch_active_orders() -> List[OrderType]:
    qs = (
        Order.objects.exclude(status__in=Order.CLOSED_STATUSES)
        .select_related("table").prefetch_related("items__product", "receipts")
        .order_by("created_at")
    )
    return [build_order(o) for o in qs]


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: strawberry.Info) -> Optional[UserType]:
        user = _current_user(info)
        return build_user(user) if user else None

    @strawberry.field
    def organization_settings(self, info: strawberry.Info) -> Optional[OrganizationSettingsType]:
        """Marka rengi/logo: oturum açmadan da (login ekranı) erişilebilir olmalı."""
        return build_organization_settings()

    @strawberry.field
    def rooms(self, info: strawberry.Info) -> List[RoomType]:
        _require(info, Perm.WAITER, Action.VIEW)
        open_map = _open_orders_by_table()
        rooms = (
            Room.objects.filter(is_active=True)
            .prefetch_related("tables").order_by("list_index", "name")
        )
        return [build_room(r, open_map) for r in rooms]

    @strawberry.field
    def room(self, info: strawberry.Info, id: strawberry.ID) -> Optional[RoomType]:
        _require(info, Perm.WAITER, Action.VIEW)
        room = Room.objects.filter(pk=id).prefetch_related("tables").first()
        return build_room(room, _open_orders_by_table()) if room else None

    @strawberry.field
    def table(self, info: strawberry.Info, id: strawberry.ID) -> Optional[TableType]:
        _require(info, Perm.WAITER, Action.VIEW)
        t = Table.objects.filter(pk=id).select_related("room").first()
        return build_table(t, _open_order_for_table(t)) if t else None

    @strawberry.field
    def table_detail(
        self, info: strawberry.Info, table_id: strawberry.ID
    ) -> Optional[TableDetailType]:
        _require(info, Perm.WAITER, Action.VIEW)
        return _fetch_table_detail(table_id)

    @strawberry.field
    def order(self, info: strawberry.Info, id: strawberry.ID) -> Optional[OrderType]:
        _require(info, Perm.WAITER, Action.VIEW)
        return _fetch_order_payload(id)

    @strawberry.field
    def active_orders(self, info: strawberry.Info) -> List[OrderType]:
        """Masaya bağlı ve paket/gel-al dahil tüm açık adisyonlar."""
        _require(info, Perm.WAITER, Action.VIEW)
        return _fetch_active_orders()

    @strawberry.field
    def menu(self, info: strawberry.Info) -> List[CategoryType]:
        _require(info, Perm.WAITER, Action.VIEW)
        return _active_menu()


# ---------------------------------------------------------------------------
# Mutation  (realtime broadcast happens automatically via orders/dining signals)
# ---------------------------------------------------------------------------
@strawberry.type
class Mutation:
    @strawberry.mutation
    def login(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        user = authenticate(_request(info), email=email, password=password)
        if user is None:
            return AuthPayload(
                success=False,
                message="E-posta veya şifre hatalı.",
                token=None,
                user=None,
            )
        if not user.is_active:
            return AuthPayload(
                success=False,
                message="Hesabınız aktif değil.",
                token=None,
                user=None,
            )
        token = AuthToken.objects.create(user)[1]
        return AuthPayload(
            success=True,
            message="Giriş başarılı.",
            token=token,
            user=build_user(user),
        )

    @strawberry.mutation
    def logout(self, info: strawberry.Info) -> Result:
        _require(info)
        try:
            get_auth_token_from_request(_request(info)).delete()
        except Exception:
            pass
        return Result(True, "Çıkış yapıldı.")

    @strawberry.mutation
    def open_table_order(self, info: strawberry.Info, table_id: strawberry.ID) -> OrderType:
        user = _require(info, Perm.WAITER, Action.ADD)
        table = Table.objects.filter(pk=table_id).first()
        if not table:
            raise UserGenException("Masa bulunamadı.")
        order = Order.get_or_create_open_for_table(table, user=user)
        return build_order(order)

    @strawberry.mutation
    def add_order_item(
        self, info: strawberry.Info, order_id: strawberry.ID,
        product_id: strawberry.ID, quantity: int = 1, note: Optional[str] = None,
    ) -> OrderType:
        _require(info, Perm.WAITER, Action.ADD)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        order.add_item_from_form({"product": product_id, "quantity": quantity, "note": note})
        return build_order(order)

    @strawberry.mutation
    def update_order_item(
        self, info: strawberry.Info, item_id: strawberry.ID,
        quantity: Optional[int] = None, status: Optional[str] = None,
        note: Optional[str] = None,
    ) -> OrderType:
        _require(info, Perm.WAITER, Action.CHANGE)
        item = OrderItem.objects.select_related("order").filter(pk=item_id).first()
        if not item:
            raise UserGenException("Kalem bulunamadı.")
        form: dict = {}
        if quantity is not None:
            form["quantity"] = quantity
        if status is not None:
            form["status"] = status
        if note is not None:
            form["note"] = note
        item.update_from_form(form)
        return build_order(item.order)

    @strawberry.mutation
    def delete_order_item(self, info: strawberry.Info, item_id: strawberry.ID) -> OrderType:
        _require(info, Perm.WAITER, Action.DELETE)
        item = OrderItem.objects.select_related("order").filter(pk=item_id).first()
        if not item:
            raise UserGenException("Kalem bulunamadı.")
        order = item.order
        if not order.is_open:
            raise UserGenException("Kapanmış bir adisyonun kalemi silinemez.")
        item.delete()
        return build_order(order)

    @strawberry.mutation
    def set_order_status(
        self, info: strawberry.Info, order_id: strawberry.ID, status: str
    ) -> OrderType:
        _require(info, Perm.WAITER, Action.CHANGE)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        order.set_status(status)
        return build_order(order)

    @strawberry.mutation
    def send_to_kitchen(self, info: strawberry.Info, order_id: strawberry.ID) -> OrderType:
        _require(info, Perm.WAITER, Action.CHANGE)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        if not order.is_open:
            raise UserGenException("Kapanmış bir adisyon güncellenemez.")
        with transaction.atomic():
            order.items.filter(status=OrderItem.STATUS_PENDING).update(
                status=OrderItem.STATUS_PREPARING
            )
            if order.status == Order.STATUS_OPEN:
                order.set_status(Order.STATUS_PREPARING)
                # set_status → Order.save() → post_save signal → broadcast
            else:
                # QuerySet.update() sinyal tetiklemez; manuel broadcast gerekli
                from cafe.realtime import broadcast_active_orders, broadcast_order
                transaction.on_commit(lambda o=order: broadcast_order(o))
                transaction.on_commit(broadcast_active_orders)
        return build_order(order)

    @strawberry.mutation
    def mark_served(self, info: strawberry.Info, order_id: strawberry.ID) -> OrderType:
        _require(info, Perm.WAITER, Action.CHANGE)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        if not order.is_open:
            raise UserGenException("Kapanmış bir adisyon güncellenemez.")
        if order.items.filter(
            status__in=[OrderItem.STATUS_PENDING, OrderItem.STATUS_PREPARING]
        ).exists():
            raise UserGenException(
                "Sipariş hâlâ hazırlanıyor. Mutfak hazır olarak işaretlemeden servis edilemez."
            )
        with transaction.atomic():
            order.items.exclude(status=OrderItem.STATUS_CANCELLED).update(
                status=OrderItem.STATUS_SERVED
            )
            order.set_status(Order.STATUS_SERVED)
        return build_order(order)

    @strawberry.mutation
    def add_payment(
        self, info: strawberry.Info, order_id: strawberry.ID, amount: Decimal,
        method: str = Receipt.METHOD_CASH, note: Optional[str] = None,
    ) -> OrderType:
        user = _require(info, Perm.ORDERS, Action.CHANGE)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        order.add_payment_from_form(
            {"amount": str(amount), "method": method, "note": note}, user=user
        )
        return build_order(order)

    @strawberry.mutation
    def cancel_order(self, info: strawberry.Info, order_id: strawberry.ID) -> OrderType:
        _require(info, Perm.WAITER, Action.CHANGE)
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            raise UserGenException("Adisyon bulunamadı.")
        order.cancel()
        return build_order(order)

    @strawberry.mutation
    def set_table_status(
        self, info: strawberry.Info, table_id: strawberry.ID, status: str
    ) -> TableType:
        _require(info, Perm.TABLES, Action.CHANGE)
        table = Table.objects.filter(pk=table_id).first()
        if not table:
            raise UserGenException("Masa bulunamadı.")
        table.set_status(status)
        return build_table(table, _open_order_for_table(table))


# ---------------------------------------------------------------------------
# Subscription  (realtime)
# ---------------------------------------------------------------------------
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def order_updates(
        self, info: strawberry.Info, order_id: strawberry.ID
    ) -> AsyncGenerator[OrderType, None]:
        """Live ticket: emits the full order on subscribe and on every change."""
        if await sync_to_async(_ws_user)(info) is None:
            raise UserGenException("Oturum doğrulanamadı.")
        ws = info.context["ws"]

        payload = await sync_to_async(_fetch_order_payload)(order_id)
        if payload is not None:
            yield payload

        async with ws.listen_to_channel("order.changed", groups=[f"order_{order_id}"]) as cm:
            async for _message in cm:
                payload = await sync_to_async(_fetch_order_payload)(order_id)
                if payload is not None:
                    yield payload

    @strawberry.subscription
    async def table_updates(
        self, info: strawberry.Info, table_id: strawberry.ID
    ) -> AsyncGenerator[TableDetailType, None]:
        """Masa ekranı: abone olunca ve masa/adisyon her değiştiğinde (yeni
        adisyon açılışı dahil) tam masa detayını yayınlar.

        `order_updates`'ten farkı: belirli bir order id'sine bağlı değil,
        masaya bağlı — bu yüzden masada henüz açık adisyon yokken de abone
        olunabilir ve müşteri QR'dan ilk siparişi verdiği an (ya da başka
        bir garson/mutfak/admin masada bir şey değiştirdiğinde) yakalanır.
        """
        if await sync_to_async(_ws_user)(info) is None:
            raise UserGenException("Oturum doğrulanamadı.")
        ws = info.context["ws"]

        payload = await sync_to_async(_fetch_table_detail)(table_id)
        if payload is not None:
            yield payload

        async with ws.listen_to_channel("table.changed", groups=[f"table_{table_id}"]) as cm:
            async for _message in cm:
                payload = await sync_to_async(_fetch_table_detail)(table_id)
                if payload is not None:
                    yield payload

    @strawberry.subscription
    async def room_updates(
        self, info: strawberry.Info, room_id: strawberry.ID
    ) -> AsyncGenerator[RoomType, None]:
        """Live floor map: emits the full room on subscribe and on every change."""
        if await sync_to_async(_ws_user)(info) is None:
            raise UserGenException("Oturum doğrulanamadı.")
        ws = info.context["ws"]

        payload = await sync_to_async(_fetch_room_payload)(room_id)
        if payload is not None:
            yield payload

        async with ws.listen_to_channel("room.changed", groups=[f"room_{room_id}"]) as cm:
            async for _message in cm:
                payload = await sync_to_async(_fetch_room_payload)(room_id)
                if payload is not None:
                    yield payload

    @strawberry.subscription
    async def active_orders_updates(
        self, info: strawberry.Info
    ) -> AsyncGenerator[List[OrderType], None]:
        """Mutfak/Adisyonlar ekranları: abone olunca ve her değişiklikte tüm açık adisyonları yayınlar."""
        if await sync_to_async(_ws_user)(info) is None:
            raise UserGenException("Oturum doğrulanamadı.")
        ws = info.context["ws"]

        yield await sync_to_async(_fetch_active_orders)()

        async with ws.listen_to_channel("active_orders.changed", groups=["active_orders"]) as cm:
            async for _message in cm:
                yield await sync_to_async(_fetch_active_orders)()

    @strawberry.subscription
    async def test(self) -> AsyncGenerator[str, None]:
        yield "connected"
        while True:
            await time.sleep(1)
            yield "tick"


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)