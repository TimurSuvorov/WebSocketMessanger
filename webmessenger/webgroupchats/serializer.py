import djoser
from rest_framework import serializers
from djoser.serializers import UserSerializer
from djoser.conf import settings as settings_djoser
from .models import *


class CustomUserSerializer(UserSerializer):
    user_link = serializers.HyperlinkedIdentityField(view_name='user-detail')
    photo_link = serializers.ImageField(source='photo')

    class Meta:
        model = User
        fields = tuple(User.REQUIRED_FIELDS) + (
            settings_djoser.USER_ID_FIELD,
            settings_djoser.LOGIN_FIELD,
            'user_link',
            'photo_link'
        )
        read_only_fields = (settings_djoser.LOGIN_FIELD,)


class RoomSerializer(serializers.HyperlinkedModelSerializer):
    author = serializers.SlugRelatedField(read_only=True,
                                          slug_field='username')
    members = serializers.StringRelatedField(many=True,
                                             read_only=True)
    room_url = serializers.HyperlinkedIdentityField(view_name='room-detail')

    class Meta:
        model = Room
        fields = ('id', 'name', 'author', 'members', 'room_url',)
        read_only_fields = ('author', 'members', 'room_url',)


class MembersRoomSerializer(serializers.ModelSerializer):
    members = serializers.StringRelatedField(many=True,
                                             read_only=True)

    class Meta:
        model = Room
        fields = ('members',)


class ActionsRoomSerializer(serializers.ModelSerializer):
    author = serializers.SlugRelatedField(read_only=True,
                                          slug_field='username')
    members = serializers.SlugRelatedField(many=True,
                                           read_only=True,
                                           slug_field='username')

    class Meta:
        model = Room
        fields = ('id', 'name', 'author', 'members',)
        read_only_fields = ('id', 'name', 'author', 'members',)


class MessageSerializer(serializers.ModelSerializer):
    author = serializers.SlugRelatedField(read_only=True, slug_field='username')
    room = serializers.SlugRelatedField(read_only=True, slug_field='name')

    class Meta:
        model = Message
        fields = ('id', 'content', 'author', 'room', 'create_time',)


class UserProfileSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'photo',)
        read_only_fields = ('id',)
