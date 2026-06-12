from functools import wraps
from pyexpat.errors import messages
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import redirect, render
from django.urls import reverse
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied

def redirect_back_or_default(request, redirect_default= False, default_url_name = "home" , kwargs={}):
    referer = request.META.get("HTTP_REFERER")
    url = reverse(default_url_name, kwargs=kwargs)

    if redirect_default:
        return redirect(url)
    else:
        if referer:
            return redirect(referer)
        else:
            if kwargs:
                return redirect(url)
            return redirect(default_url_name)
        

def error_page(request, e):

    exception_map = {
        KeyError: "İstenen veri bulunamadı.",
        ValueError: "Geçersiz bir değer gönderildi.",
        PermissionError: "Bu işlem için yetkiniz yok.",
        FileNotFoundError: "İstenen dosya bulunamadı.",
        TypeError: "Yanlış veri tipi kullanıldı.",
        Exception: "Beklenmeyen bir hata oluştu.",
        ObjectDoesNotExist: "İstenen nesne bulunamadı.",
    }

    hata_mesaji = None


    if isinstance(e, Exception):
        for exc_type, tr_msg in exception_map.items():
            if isinstance(e, exc_type):
                hata_mesaji = tr_msg
                break
    else:
        hata_mesaji = "Bilinmeyen bir hata oluştu."

    return render(request, "404.html", {
        "hata": hata_mesaji,
        "e": e,
    })


class UserGenException(Exception):
    pass

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




def action_resolver(auth = True, perm = None, action = None, redirect_url=None, redirect_default=False, redirect_kwargs=None, success_message="İşlem başarılı!", fallback_url=None, fallback_kwargs={}):
    def decorator(view_func):
        if perm and action:
            view_func = ext_perm_required(perm=perm, action=action, view_func=view_func)
        if auth:
            view_func = login_required(view_func, login_url='/giris/')
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):

            resolved_kwargs = {}

            if callable(redirect_kwargs):
                resolved_kwargs = redirect_kwargs(request, *args, **kwargs)
            elif isinstance(redirect_kwargs, dict):
                resolved_kwargs = redirect_kwargs

            try:
                response = view_func(request, *args, **kwargs)

                if type(response) == HttpResponse:
                    return response

                if type(response) == HttpResponseRedirect:
                    return response

                messages.success(request, success_message)
                return redirect_back_or_default(
                    request,
                    default_url_name=redirect_url,
                    redirect_default=redirect_default,
                    kwargs=resolved_kwargs
                )

            except UserGenException as e:
                messages.error(request, f"{e}!")
                return redirect_back_or_default(
                    request,
                    default_url_name=redirect_url,
                    redirect_default=redirect_default,
                    kwargs=resolved_kwargs
                )

            except Exception as e:
                if fallback_url:

                    exception_map = {
                        KeyError: "İstenen veri bulunamadı.",
                        ValueError: "Geçersiz bir değer gönderildi.",
                        PermissionError: "Bu işlem için yetkiniz yok.",
                        FileNotFoundError: "İstenen dosya bulunamadı.",
                        ObjectDoesNotExist: "İstenen kayıt bulunamadı.",
                        TypeError: "Yanlış veri tipi kullanıldı.",
                        Exception: "Beklenmeyen bir hata oluştu.",
                    }

                    hata_mesaji = None
                    print("ERRRRRRORRRR", type(e))
                    if isinstance(e, Exception):
                        for exc_type, tr_msg in exception_map.items():
                            if isinstance(e, exc_type):
                                hata_mesaji = tr_msg
                                break
                    else:
                        hata_mesaji = "Bilinmeyen bir hata oluştu."

                    resolved_fallback_kwargs = {}

                    if callable(fallback_kwargs):
                        resolved_fallback_kwargs = fallback_kwargs(request, *args, **kwargs)
                    elif isinstance(fallback_kwargs, dict):
                        resolved_fallback_kwargs = fallback_kwargs



                    messages.error(request, f"{hata_mesaji}!")
                    return redirect(fallback_url, **resolved_fallback_kwargs)
                request.session['error'] = {
                    "type": e.__class__.__name__,
                    "message": str(e),
                }
                return redirect('error_page')
                # return error_page(request, e)

        return wrapper
    return decorator



def error_page_renderer(request):
    err = request.session.pop('error', None)

    if not err:
        return error_page(request, Exception("Bilinmeyen hata"))

    exc_type_name = err.get("type")
    message = err.get("message")

    # Exception map
    exception_classes = {
        "KeyError": KeyError,
        "ValueError": ValueError,
        "PermissionError": PermissionError,
        "FileNotFoundError": FileNotFoundError,
        "TypeError": TypeError,
        "Exception": Exception,
        "ObjectDoesNotExist": ObjectDoesNotExist,

    }

    exc_class = exception_classes.get(exc_type_name, Exception)
    e = exc_class(message)

    return error_page(request, e)