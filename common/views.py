from django.shortcuts import redirect, render
from django.contrib import messages
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from common.decorators import anahtar_auth
from common.models import *
from common.serializers import *
from account.models import User
from common.utils import error_page, redirect_back_or_default
from django.db.models import Q
from django.utils.decorators import method_decorator
from rest_framework.decorators import action
from django.db.models import Q
from django.core.paginator import Paginator
from django.db import transaction




@anahtar_auth( perm="notification", action="view")
def notification_list(request):
    context = {}
    notifications = Notification.objects.all().order_by('-created_at')
    query = request.GET.get('q',None)
    page_number = request.GET.get('page',1)
    table_data= notifications
    if query:
        table_data = table_data.filter(
            Q(created_by__first_name__icontains=query) |
            Q(created_by__last_name__icontains=query)
        )
        context['search'] = query
    

    paginator = Paginator(table_data, 10)
    paged = paginator.get_page(page_number)
    context['page_number'] = page_number

    context['notifications'] = paged
    context['paginator'] = paginator
    
    return render(request, 'notification/index.html',context)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationCreateSerializer

    @action(detail=False, methods=["post"])
    @method_decorator(anahtar_auth(perm="notification", action="add"))
    def create_notification(self, request):
        try:
            title = request.POST.get("title")
            content = request.POST.get("content")
            selected_users = request.POST.get("selected_users")  # 👈 string olarak al

            if not title or not content or not selected_users:
                raise ValueError("Başlık, içerik ve alıcılar zorunludur")

            users = User.objects.none()
            if selected_users.lower() == "all":
                users = User.objects.all()
            else:
                # Virgülle ayrılmış stringi integer listesine çevir
                try:
                    user_ids = [int(uid.strip()) for uid in selected_users.split(",") if uid.strip()]
                except ValueError:
                    raise ValueError("Alıcı kullanıcı ID'leri geçersiz")
                users = User.objects.filter(id__in=user_ids)
            
            tokens = NotificationToken.objects.filter(
                user__id__in=users.values_list("id", flat=True)
            ).select_related("user").distinct()

            with transaction.atomic():
                notification = Notification.objects.create(
                    title=title,
                    content=content,
                    recipients=list(users.values_list("id", flat=True)),
                    created_by=request.user,
                )




                # 3️⃣ SMSStatus (pending) oluştur
                NotificationStatus.objects.bulk_create([
                    NotificationStatus(
                        notification=notification,
                        user=token.user,
                        token=token,
                        status=NotificationStatus.STATUS_PENDING
                    )
                    for token in tokens
                ])

            Notification.send_async(notification.id)

            messages.success(request, "Bildirimler başarıyla gönderildi.")
            return redirect_back_or_default(request, 'smss')
        except Exception as e:
            return error_page(request, e)


