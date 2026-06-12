from django.shortcuts import redirect, render
from cafe.action_resolver import action_resolver


@action_resolver()
def red_home(request):
    return redirect('home')

@action_resolver()
def home(request):
    return render(request, 'profile.html')