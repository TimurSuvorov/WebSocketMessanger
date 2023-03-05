from django.contrib import admin

from .models import Message, Room, User, UserRoom

# Register your models here.

admin.site.register(Message)
admin.site.register(Room)
admin.site.register(User)
admin.site.register(UserRoom)
