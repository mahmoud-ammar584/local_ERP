from django.urls import path
from .views import login_view, logout_view, logout_all_view, me_view

urlpatterns = [
    path('login/', login_view),
    path('logout/', logout_view),
    path('logout-all/', logout_all_view),
    path('me/', me_view),
]
