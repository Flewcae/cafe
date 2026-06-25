# cafe/consumers.py
#
# WebSocket consumer'ları — her biri ilgili channel group'a katılır,
# realtime.py'dan gelen event'i JSON payload olarak istemciye iletir.
#
# Mutfak (ActiveOrdersConsumer): payload yok, sadece "changed" sinyali.
#   Client eski HTTP-fetch+innerHTML pattern'ini korur.
#
# Garson floor (FloorConsumer), Adisyon listesi (OrderListConsumer): tam
#   snapshot JSON gönderir; client DOM'u element-element günceller.
#
# Tek adisyon (OrderDetailConsumer): adisyon + kalemler JSON gönderir.

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from authorizement.constants import Action, Perm
from cafe.snapshots import floor_snapshot, active_orders_snapshot, order_snapshot, tables_status_snapshot


# ---------------------------------------------------------------------------
# Mutfak — mevcut davranış aynen korunuyor
# ---------------------------------------------------------------------------
class ActiveOrdersConsumer(AsyncJsonWebsocketConsumer):
    GROUP = "active_orders"

    async def connect(self):
        user = self.scope.get("user")
        allowed = bool(
            user and user.is_authenticated
            and await sync_to_async(user.has_ext_perm)(Perm.KITCHEN, Action.VIEW)
        )
        if not allowed:
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def active_orders_changed(self, event):
        await self.send_json({"event": "active_orders.changed"})


# ---------------------------------------------------------------------------
# Garson floor  /ws/garson/
# ---------------------------------------------------------------------------
class FloorConsumer(AsyncJsonWebsocketConsumer):
    GROUP = "active_orders"

    async def connect(self):
        user = self.scope.get("user")
        allowed = bool(
            user and user.is_authenticated
            and await sync_to_async(user.has_ext_perm)(Perm.WAITER, Action.VIEW)
        )
        if not allowed:
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def active_orders_changed(self, event):
        data = await database_sync_to_async(floor_snapshot)()
        await self.send_json({"event": "active_orders.changed", **data})


# ---------------------------------------------------------------------------
# Adisyon listesi  /ws/siparisler/
# ---------------------------------------------------------------------------
class OrderListConsumer(AsyncJsonWebsocketConsumer):
    GROUP = "active_orders"

    async def connect(self):
        user = self.scope.get("user")
        allowed = bool(
            user and user.is_authenticated
            and await sync_to_async(user.has_ext_perm)(Perm.ORDERS, Action.VIEW)
        )
        if not allowed:
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def active_orders_changed(self, event):
        orders = await database_sync_to_async(active_orders_snapshot)()
        await self.send_json({"event": "active_orders.changed", "orders": orders})


# ---------------------------------------------------------------------------
# Tek adisyon detayı  /ws/adisyon/<pk>/
# WAITER:VIEW veya ORDERS:VIEW yeterlî.
# ---------------------------------------------------------------------------
class OrderDetailConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.order_id = self.scope["url_route"]["kwargs"]["pk"]
        self.group = f"order_{self.order_id}"

        user = self.scope.get("user")
        if not (user and user.is_authenticated):
            await self.close()
            return

        has_waiter = await sync_to_async(user.has_ext_perm)(Perm.WAITER, Action.VIEW)
        has_orders = await sync_to_async(user.has_ext_perm)(Perm.ORDERS, Action.VIEW)
        if not (has_waiter or has_orders):
            await self.close()
            return

        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def order_changed(self, event):
        data = await database_sync_to_async(order_snapshot)(self.order_id)
        if data is None:
            return
        await self.send_json({"event": "order.changed", "order": data})


# ---------------------------------------------------------------------------
# Masa & Salon yönetim ekranı  /ws/masalar/
# ---------------------------------------------------------------------------
class TableAdminConsumer(AsyncJsonWebsocketConsumer):
    GROUP = "active_orders"

    async def connect(self):
        user = self.scope.get("user")
        allowed = bool(
            user and user.is_authenticated
            and await sync_to_async(user.has_ext_perm)(Perm.TABLES, Action.VIEW)
        )
        if not allowed:
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def active_orders_changed(self, event):
        tables = await database_sync_to_async(tables_status_snapshot)()
        await self.send_json({"event": "active_orders.changed", "tables": tables})
