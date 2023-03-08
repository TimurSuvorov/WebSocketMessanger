from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    photo = models.ImageField(upload_to='photo',
                              blank=True)

    def __str__(self):
        return self.username


class Message(models.Model):
    content = models.CharField(max_length=1024)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room = models.ForeignKey('Room', on_delete=models.CASCADE)
    create_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('create_time',)

    def __str__(self):
        return self.content[:10]


class Room(models.Model):
    name = models.CharField(max_length=64,
                            blank=False,
                            null=False,
                            unique=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='room_author')
    members = models.ManyToManyField(User, through='UserRoom', blank=True)

    def __str__(self):
        return self.name




class UserRoom(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.user} in {self.room.name}'

