from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/rooms/(?P<pk>\w+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r"ws/background/", consumers.BackgroundChatConsumer.as_asgi()),
]

