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

@anahtar_auth( perm="faq_couples", action="view")
def faq_list(request):

    if request.method == "POST":
        delete = request.POST.get('delete')
        question = request.POST.get('question')
        answer = request.POST.get('answer')
        if delete:
            try:
                if not request.user.has_ext_perm('faq_couples', 'delete'):
                    raise Exception("Bu işlemi gerçekleştirmek için yetkiniz yok.")
                faq = FAQ.objects.get(id=delete)
                faq.delete()
                messages.success(request, "Soru başarıyla silindi.")
                return redirect('faqs')
            except FAQ.DoesNotExist:
                messages.error(request, "Soru bulunamadı.")
                return redirect('faqs')
            except Exception as e:
                messages.error(request, f"Soru silinirken bir hata oluştu: {str(e)}.")
                return redirect('faqs')

        try:
            if not question or not answer:
                raise Exception("Soru ve cevap girmek zorunludur.")
            if not request.user.has_ext_perm('faq_couples', 'add'):
                raise Exception("Bu işlemi gerçekleştirmek için yetkiniz yok.")

            FAQ.objects.create(question=question, answer=answer)
            messages.success(request, "Soru başarıyla eklendi.")
        except Exception as e:
            messages.error(request, f"Soru Cevap oluşturulurken bir hata oluştu: {str(e)}.")
            return redirect('faqs')
        return redirect('faqs')
        
    faqs = FAQ.objects.all()
    return render(request, "faq/index.html", {
        "faqs": faqs,
    })

@anahtar_auth( perm="email", action="view")
def email_list(request):
    context = {}
    emails = Email.objects.all().order_by('-created_at')
    query = request.GET.get('q',None)
    page_number = request.GET.get('page',1)
    table_data= emails
    if query:
        table_data = table_data.filter(
            Q(created_by__first_name__icontains=query) |
            Q(created_by__last_name__icontains=query)
        )
        context['search'] = query
    

    paginator = Paginator(table_data, 10)
    paged = paginator.get_page(page_number)
    context['page_number'] = page_number

    context['emails'] = paged
    context['paginator'] = paginator
    
    return render(request, 'email/index.html',context)

@anahtar_auth( perm="sms", action="view")
def sms_list(request):
    context = {}
    smss = SMS.objects.all().order_by('-created_at')
    query = request.GET.get('q',None)
    page_number = request.GET.get('page',1)
    table_data= smss
    if query:
        table_data = table_data.filter(
            Q(created_by__first_name__icontains=query) |
            Q(created_by__last_name__icontains=query) 
        )
        context['search'] = query
    

    paginator = Paginator(table_data, 10)
    paged = paginator.get_page(page_number)
    context['page_number'] = page_number

    context['smss'] = paged
    context['paginator'] = paginator
    
    return render(request, 'sms/index.html',context)

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

class SMSViewSet(viewsets.ModelViewSet):
    queryset = SMS.objects.all()
    serializer_class = SMSCreateSerializer

    @action(detail=False, methods=["post"])
    @method_decorator(anahtar_auth(perm="sms", action="add"))
    def create_sms(self, request):
        try:
            content = request.POST.get("content")
            user_ids = request.POST.getlist("selected_users")  # 👈 list olarak al

            if not content or not user_ids:
                raise "Başlık, içerik ve alıcılar zorunludur"

            users = User.objects.filter(id__in=user_ids)
            if not users.exists():
                raise "Kullanıcılar bulunamadı"

            with transaction.atomic():
                # 1️⃣ SMS oluştur
                sms = SMS.objects.create(
                    content=content,
                    recipients=list(users.values_list("id", flat=True)),
                    created_by=request.user,
                )


                # 3️⃣ SMSStatus (pending) oluştur
                SMSStatus.objects.bulk_create([
                    SMSStatus(
                        sms=sms,
                        user=user,
                        status=SMSStatus.STATUS_PENDING
                    )
                    for user in users
                ])

            SMS.send_async(sms.id)

            messages.success(request, "Yönetim Kurulu Üyesi başarıyla oluşturuldu.")
            return redirect_back_or_default(request, 'smss')
        except Exception as e:
            return error_page(request, e)

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

class FaqViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAuthenticated]

class EmailViewSet(viewsets.ModelViewSet):
    queryset = Email.objects.all()
    serializer_class = EmailCreateSerializer

    @action(detail=False, methods=["post"])
    @method_decorator(anahtar_auth(perm="email", action="add"))
    def create_email(self, request):
        try:
            subject = request.POST.get("subject")
            content = request.POST.get("content")
            user_ids = request.POST.getlist("selected_users")  # 👈 list olarak al
            files = request.FILES.getlist("attachments")

            if not subject or not content or not user_ids:
                raise "Başlık, içerik ve alıcılar zorunludur"

            users = User.objects.filter(id__in=user_ids)
            if not users.exists():
                raise "Kullanıcılar bulunamadı"

            with transaction.atomic():
                # 1️⃣ Email oluştur
                email = Email.objects.create(
                    subject=subject,
                    content=content,
                    recipients=list(users.values_list("id", flat=True)),
                    created_by=request.user,
                )

                # 2️⃣ Attachment'ları kaydet
                for f in files:
                    EmailAttachment.objects.create(
                        email=email,
                        file=f
                    )

                # 3️⃣ EmailStatus (pending) oluştur
                EmailStatus.objects.bulk_create([
                    EmailStatus(
                        email=email,
                        user=user,
                        status=EmailStatus.STATUS_PENDING
                    )
                    for user in users
                ])

            Email.send_async(email.id)

            messages.success(request, "Yönetim Kurulu Üyesi başarıyla oluşturuldu.")
            return redirect_back_or_default(request, 'emails')
        except Exception as e:
            return error_page(request, e)


