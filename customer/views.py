import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from cafe.action_resolver import UserGenException
from dining.models import Table
from menu.models import Category
from orders.models import Order


def _get_table(token):
    # Yalnızca aktif masalar; token tahmin edilemez (UUID).
    return get_object_or_404(Table, qr_token=token, is_active=True)


@ensure_csrf_cookie
def customer_menu(request, token):
    """Müşterinin QR ile açtığı, mobil uyumlu sipariş ekranı."""
    table = _get_table(token)
    categories = (
        Category.objects
        .filter(is_active=True)
        .prefetch_related('products')
        .order_by('list_index', 'name')
    )
    open_order = (
        Order.objects
        .exclude(status__in=Order.CLOSED_STATUSES)
        .filter(table=table)
        .order_by('-created_at')
        .first()
    )
    return render(request, 'customer/menu.html', {
        'table': table,
        'categories': categories,
        'open_order': open_order,
        'submit_url': reverse('customer_submit_order', args=[token]),
        'status_url': reverse('customer_order_status', args=[token]),
    })


@require_POST
def customer_submit_order(request, token):
    table = _get_table(token)
    try:
        payload = json.loads(request.body or '{}')
    except (ValueError, TypeError):
        return JsonResponse({'success': False, 'message': 'Geçersiz veri.'}, status=400)

    items = payload.get('items') or []
    note = (payload.get('note') or '').strip() or None

    try:
        order = Order.place_customer_order(table, items, note=note)
    except UserGenException as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Sipariş oluşturulamadı.'}, status=400)

    return JsonResponse({
        'success': True,
        'message': 'Siparişiniz alındı!',
        'order_id': order.id,
        'status_url': reverse('customer_order_status', args=[token]),
    })


def customer_order_status(request, token):
    table = _get_table(token)
    order = (
        Order.objects
        .exclude(status__in=Order.CLOSED_STATUSES)
        .filter(table=table)
        .prefetch_related('items')
        .order_by('-created_at')
        .first()
    )
    return render(request, 'customer/status.html', {'table': table, 'order': order})