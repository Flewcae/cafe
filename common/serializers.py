from rest_framework import serializers
from common.models import FAQ
from account.models import User


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = "__all__"





class UserSelectorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'name',
            'email',
            'phone',
            'image',
        )

    def get_name(self, obj):
        return f"{getattr(obj, 'first_name', None)} {getattr(obj, 'last_name', None)}"

    def get_image(self, obj):
        return obj.image.url if obj.image else '/static/defaults/user.jpeg'
    


from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SMS, Email, EmailAttachment, Notification


User = get_user_model()


class EmailAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAttachment
        fields = ['id', 'file']


class EmailCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Email
        fields = "__all__"


class SMSCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMS
        fields = "__all__"

class NotificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"