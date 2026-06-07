from django import template
register = template.Library()

@register.filter
def tl_format(value):
    try:
        # Eğer değer string ise sayıya çevir
        if isinstance(value, str):
            value = float(value.replace(',', '.'))  # Virgülü noktaya çevir, eğer varsa
        
        # Eğer tam sayıysa, float yap
        if isinstance(value, int):
            value = float(value)
        
        # Sayıyı iki ondalık basamakla formatla
        formatted_value = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        
        return f"{formatted_value} ₺"
    except (ValueError, TypeError):
        return value  # Geçersiz değer varsa olduğu gibi bırak
    
