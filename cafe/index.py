from django.shortcuts import render
from cafe.action_resolver import action_resolver


@action_resolver()
def home(request):
    return render(request, 'profile.html')