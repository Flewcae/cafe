from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from knox.models import AuthToken
from account.models import User
from account.serializers import UserSerializer
from authorizement.models import UserExtendedPermission
from cafe.action_resolver import action_resolver, UserGenException
from rest_framework import viewsets
from rest_framework.decorators import action
from django.utils.decorators import method_decorator


# Create your views here.
@action_resolver(
    auth=False,
    redirect_default=True,
    fallback_url='error_page',
)
def login_page(request):

    if request.user.is_authenticated:
        return redirect('home')

    if request.method == "POST":
        data = request.POST
        email = data.get('email')
        password = data.get('password')
        user = authenticate(request, email = email, password = password)
        if user is not None:
            login(request, user)

            token = AuthToken.objects.create(user)[1]
            request.session['auth_token'] = token
            request.session.save()
            return redirect('home') 
        else:
            return render(request, 'account/login.html', {'error': 'Hatalı şifre!'})
        
    return render(request, 'account/login.html')

@action_resolver(
    redirect_default=True,
    fallback_url='login_page',
)
def logout_view(request):
    if request.user.is_authenticated:
        logout(request)  # Oturumunu kapat
    return redirect('login_page')



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


    @action(detail=False, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Kullanıcı başarıyla oluşturuldu!"
        )
    )
    def create_user(self, request, *args, **kwargs):
        user = User.create_from_form(request.data, request.FILES)
    
    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Kullanıcı başarıyla düzenlendi!"
        )
    )
    def update_auth_user(self, request, pk=None, *args, **kwargs):
        instance = self.get_object()
        user = User.update_from_form(instance, request.data, request.FILES)
        return user
    
    
    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Kullanıcı başarıyla silindi!"
        )
    )
    def delete_auth_user(self, request, pk=None, *args, **kwargs):
        instance: User = self.get_object()
        instance.delete()


    
    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Şifre başarıyla değiştirildi. Yeni şifreyi kullanıcıya bildirmeyi unutmayın!"
        )
    )
    def force_password(self, request, pk=None, *args, **kwargs):
        instance = self.get_object()
        new_password = request.data.get('force_password', None)
        if not new_password:
            raise UserGenException("Yeni şifre sağlanmadı.")
        
        instance.set_password(new_password)
        instance.save()

    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Şifre başarıyla değiştirildi. Yeni şifre kullanıcıya email ile gönderildi!"
        )
    )
    def send_new_password_email(self, request, pk=None, *args, **kwargs):
        instance: User = self.get_object()
        instance.reset_password(via= 'email')

    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Şifre başarıyla değiştirildi. Yeni şifre kullanıcıya sms ile gönderildi!"
        )
    )
    def send_new_password_phone(self, request, pk=None, *args, **kwargs):
        instance: User = self.get_object()
        instance.reset_password(via= 'phone')

    @action(detail=True, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Yetkiler başarıyla güncellendi!"
        )
    )
    def toggle_permission(self, request, pk=None):
        user = self.get_object()

        existing = set(
            UserExtendedPermission.objects.filter(user=user)
            .values_list('permission_id', 'action')
        )

        posted = set()

        for key in request.POST.keys():
            if key.startswith('perm_'):
                # perm_12_change
                _, perm_id, action = key.split('_', 2)
                posted.add((int(perm_id), action))

        # Silinecekler
        for perm_id, action in existing - posted:
            UserExtendedPermission.objects.filter(
                user=user,
                permission_id=perm_id,
                action=action
            ).exclude(permission__code="authorizement").delete()

        # Eklenecekler
        for perm_id, action in posted - existing:
            UserExtendedPermission.objects.create(
                user=user,
                permission_id=perm_id,
                action=action
            )

   