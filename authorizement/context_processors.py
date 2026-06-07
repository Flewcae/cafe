def extended_permissions(request):
    if not request.user.is_authenticated:
        return {}

    perms = {}
    qs = request.user.extended_permissions.select_related('permission')

    for p in qs:
        key = p.permission.code
        perms.setdefault(key, []).append(p.action)

    return {
        'permissions': perms
    }
