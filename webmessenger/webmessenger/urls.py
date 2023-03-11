"""webmessenger URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import path, include, re_path
from django.views.static import serve
from rest_framework import routers

from webgroupchats.views import *

router = routers.DefaultRouter()
print(router)

router.register(r'room', RoomViewSet)
router.register(r'userprofile', ProfileViewSet)
print(router)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', redirect_view),
    path('api/v1/auth/', include('djoser.urls')),
    path('signup/', SignUpHTML.as_view()),
    path('signin/', SignInHTML.as_view()),
    path('profile/', ProfileHTML.as_view()),
    path('rooms/', RoomsHTML.as_view()),
    path('api/v1/', include(router.urls)),
    path('api/v1/join_room/<int:pk>', JoinRoomAPIView.as_view()),
    path('api/v1/leave_room/<int:pk>', LeaveRoomAPIView.as_view()),
    path('api/v1/messeges_room/<int:pk>', MessagesRoomAPIView.as_view()),
    # path('api/v1/userprofile/<int:pk>', ProfileViewSet.as_view()),
    # path('api/v1/edit_userprofile/<int:pk>', ProfileViewSet.as_view()),

    re_path(r'^auth/', include('djoser.urls.authtoken')),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    ]