from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from .models import *
from province.models import District
from province.serializers import AddressSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.contrib import messages
from common.utils import redirect_back_or_default, remove_escape_sequences
from django.db.models.functions import Lower

class AddressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.all()
    serializer_class = AddressSerializer()
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def update_address(self, request, pk=None):
        instance = self.get_object()
        data = request.data
        try:
            latitude = data.get('latitude', None)
            longitude = data.get('longitude', None)
            city = data.get('city', None)
            district = data.get('district', None)
            address_line = remove_escape_sequences(data.get('address_line', ''))

            print('city',city)
            print('district',district)
            print('address_line',address_line)

            if latitude is None or latitude == "" or longitude is None or longitude == "":
                raise ValueError("Konum bilgisine erişilemedi")
            if city is None or district is None or address_line is None:
                raise ValueError("Form bilgileri eksik")
            
            instance.country = Country.objects.first()
            instance.city = City.objects.get(id=city)
            instance.district = District.objects.get(id=district)
            if instance.center is None:
                center = Center.objects.create(latitude=latitude, longitude=longitude)
                instance.center = center
            else:
                instance.center.latitude = latitude
                instance.center.longitude = longitude
                instance.center.save()
            instance.address_line = address_line
            instance.save()
            
            messages.success(request, "Adres bilgileri başarıyla güncellendi.")
            return redirect_back_or_default(request, 'presidency')
        except Exception as e:
            messages.error(request, f"Adres bilgileri güncellenirken bir hata oluştu: {str(e)}.")
            return redirect_back_or_default(request, 'presidency')


# Create your views here.
def district_by_city(request):
    city_id = request.GET.get("city")
    districts = District.objects.filter(city_id=city_id)
    return render(request, "htmx/selects/district.html", {
        "districts": districts
    })

def dist_id(request):
    district_name = request.GET.get("name")
    try:
        if not district_name:
            raise "İlçe adı gönderilmedi."
        print('district_name',district_name)
        district = (
            District.objects
            .annotate(name_lower=Lower("name"))
            .filter(name_lower__contains=district_name.lower())
            .first()
        )
        return JsonResponse({
            "id": district.id,
        })
    except Exception as e:
        return JsonResponse({
            "error": str(e),
        })
