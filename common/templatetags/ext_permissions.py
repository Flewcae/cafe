from math import perm
from django import template

register = template.Library()

@register.filter
def has_perm(ext_permissions, arg):
    """
    usage:
    user.ext_permissions|has_perm:"access_visit-change"
    """
    try:
        perm, action = arg.split('-')
        return action in ext_permissions.get(perm, [])
    except Exception:
        return False

@register.filter
def get_item(dictionary, key):
    """
    usage:
    ext_permissions|get_item:"access_visit"
    """
    if not dictionary:
        return []
    return dictionary.get(key, [])



@register.simple_tag
def has_ext_perm(user, perm_code, action):
    try:
        return user.extended_permissions.filter(permission__code=perm_code, action=action).exists()
    except:
        return False

@register.simple_tag
def resolve_active_tab(*args):
    """
    args = cond1, name1, cond2, name2, ...
    """
    for i in range(0, len(args), 2):
        try:
            cond = args[i]
            name = args[i + 1]
        except IndexError:
            break

        if cond:
            return name

    return ""