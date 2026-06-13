# core/consumers.py

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class BroadcastConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def listen_to_channel(self, event):
        # group_send buraya düşer
        await self.send_json({
            "event": event["event"],
            "data": event["payload"]
        })