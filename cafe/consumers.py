# cafe/consumers.py
#
# Mutfak web ekranı (templates/kitchen/queue.html) için hafif WS uçbirimi.
# GraphQL subscription'ların aksine burada payload taşınmaz — sadece "bir şey
# değişti" sinyali gönderilir, istemci ilgili parçayı (kitchen_queue_partial)
# normal bir fetch ile yeniden çeker.

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from authorizement.constants import Action, Perm


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
