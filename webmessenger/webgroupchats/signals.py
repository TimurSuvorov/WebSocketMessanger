from django.conf import settings
from django.dispatch import receiver
from djoser.signals import user_registered

from webgroupchats.models import Room


@receiver(user_registered)
def create_private_room(user, **kwargs):
    room_obj, create = Room.objects.get_or_create(name=f'private_{user.id}',
                                                  type="private",
                                                  label="Personal",
                                                  )
    room_obj.author.add(user)
