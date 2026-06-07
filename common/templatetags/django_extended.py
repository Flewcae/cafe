from django import template
register = template.Library()

@register.filter
def multiply(value, arg):
    return float(value) * float(arg)


@register.filter
def abs_val(value):
    try:
        return abs(int(value))
    except (ValueError, TypeError):
        return ''
    

@register.filter
def split(value, arg):
    if value is None:
        return []
    return [item.strip() for item in str(value).split(str(arg))]

@register.filter
def hex_to_rgb(value):
    value = value.lstrip('#')
    lv = len(value)
    rgb = [str(int(value[i:i + lv // 3], 16)) for i in range(0, lv, lv // 3)]
    return ",".join(rgb)

def clamp(x): 
    return max(0, min(x, 255))

def adjust_color(color, amount=0):
    color = color.lstrip('#')
    r, g, b = [int(color[i:i+2], 16) for i in (0, 2, 4)]

    r = clamp(int(r + (amount * 255)))
    g = clamp(int(g + (amount * 255)))
    b = clamp(int(b + (amount * 255)))

    return f"#{r:02x}{g:02x}{b:02x}"


@register.filter
def lighten(color, percent):
    return adjust_color(color, float(percent))


@register.filter
def darken(color, percent):
    return adjust_color(color, -float(percent))

@register.filter
def rgba(color, alpha):
    color = color.lstrip('#')
    r, g, b = [int(color[i:i+2], 16) for i in (0, 2, 4)]
    return f"rgba({r}, {g}, {b}, {alpha})"




