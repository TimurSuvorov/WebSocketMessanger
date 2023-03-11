from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    photo = models.ImageField(upload_to='photo',
                              blank=True,
                              default='photo/default.jpeg')

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
    ROOM_TYPE = [
        ('common', 'common'),
        ('private', 'private'),
        ('tetatet', 'tetatet')
    ]

    name = models.CharField(max_length=64,
                            blank=False,
                            null=False,
                            unique=True,
                            )
    author = models.ManyToManyField(settings.AUTH_USER_MODEL,
                                    through='AuthorRoom',
                                    blank=True,
                                    related_name='room_author',
                                    )
    members = models.ManyToManyField(settings.AUTH_USER_MODEL,
                                     through='UserRoom',
                                     blank=True,
                                     related_name='room_member',
                                     )
    type = models.CharField(max_length=16,
                            choices=ROOM_TYPE,
                            default='common',
                            )
    label = models.CharField(max_length=64,
                             )


    def __str__(self):
        return f'{self.name}'


class AuthorRoom(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.user}:{self.room}'


class UserRoom(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.user}:{self.room.name}'

