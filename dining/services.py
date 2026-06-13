from dining.models import Room


def build_room_payload(room_id: int):
    room = Room.objects.get(id=room_id)

    return {
        "id": str(room.id),
        "status": room.status,
        "updated_at": room.updated_at.isoformat(),
    }