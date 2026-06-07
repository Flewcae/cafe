from functools import wraps
from django.contrib.auth.decorators import login_required

from functools import wraps
from django.core.exceptions import PermissionDenied

def ext_perm_required(perm, action):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = request.user
            if perm and action:
                if not user.has_ext_perm(perm, action):
                    raise PermissionDenied
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator




def anahtar_auth(
    perm=None,
    action=None,
    with_kwargs_perm=None,
    with_kwargs_action=None,
):
    def decorator(view_func):

        # 🔁 önce permission’a karar verelim
        def permission_selector(view_func_inner):
            @wraps(view_func_inner)
            def _wrapped(request, *args, **kwargs):
                has_kwargs = any(v is not None for v in kwargs.values())

                if has_kwargs:
                    selected_perm = with_kwargs_perm or perm
                    selected_action = with_kwargs_action or action
                else:
                    selected_perm = perm
                    selected_action = action

                return ext_perm_required(selected_perm, selected_action)(view_func_inner)(
                    request, *args, **kwargs
                )
            return _wrapped

        @login_required(login_url="/anahtar/giris")
        @permission_selector
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            return view_func(request, *args, **kwargs)

        return _wrapped_view

    return decorator

