import datetime
import json
from pprint import pprint

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from webgroupchats.models import Room, Message


class ChatConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.pk = None
        self.room_name = None
        self.room_group_pk = None
        self.room = None
        self.user = None

    @database_sync_to_async
    def get_room(self):
        return Room.objects.get(pk=self.pk)

    @database_sync_to_async
    def get_room_name(self):
        return Room.objects.get(pk=self.pk).name

    @database_sync_to_async
    def remove_room(self):
        Room.objects.get(pk=self.pk).delete()

    @database_sync_to_async
    def add_to_room(self):
        self.room.members.add(self.user)

    @database_sync_to_async
    def remove_from_room(self):
        self.room.members.remove(self.user)

    @database_sync_to_async
    def get_members(self):
        return list(self.room.members.values_list('username', flat=True))

    @database_sync_to_async
    def save_messages(self, message):
        user = self.user
        room = self.room
        Message.objects.create(content=message,
                               author=user,
                               room=room
                               )

    async def connect(self):
        # Define attributes
        self.pk = self.scope["url_route"]["kwargs"]["pk"]  # берем имя комнаты из URL
        self.room_name = await self.get_room_name()
        self.room_group_pk = f"chat_{self.pk}"  # Создаем имя группы на основе pk комнаты
        self.user = self.scope['user']
        self.room = await self.get_room()

        if self.user.is_authenticated:
            # Add channel to group
            await self.channel_layer.group_add(  # В channel_layer добавляем в группу соединение с именем channel_name
                self.room_group_pk,
                self.channel_name
            )
            await self.accept()

            # Add user to Room model
            await self.add_to_room()

            # Send welcome message only to user
            await self.send(text_data=json.dumps({
                "type": "only_for_user",
                "message": f'>Здравствуйте! {self.user.username}. Добро пожаловать в чат "{self.room_name}"<',
                "members": await self.get_members()
                })
            )

            # Send service message with members of room
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "user_join_members",
                    "username": self.scope['user'].username,
                    "members": await self.get_members()
                }
            )

    async def disconnect(self, code):

        if self.user.is_authenticated:
            # Remove user from Room model
            await self.remove_from_room()
            # Send service message with members of room
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "user_leave_members",
                    "username": self.scope['user'].username,
                    "members": await self.get_members()
                }
            )
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_pk,
                self.channel_name
            )

    async def receive(self, text_data=None, bytes_data=None):

        text_data_json = json.loads(text_data)

        message = text_data_json.get('message', None)
        await self.channel_layer.group_send(
            self.room_group_pk, {
                "type": "chat_message",
                "time": datetime.datetime.utcnow().strftime('%d.%m %H:%M'),
                "username": self.scope['user'].username,
                "message": message
            }
        )

        await self.save_messages(message)

        if not self.user.is_authenticated:
            return

    # Methods for message's types

    # When receive message from room group
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    # When user join
    async def user_join_members(self, event):
        await self.send(text_data=json.dumps(event))

    # When user leaved
    async def user_leave_members(self, event):
        await self.send(text_data=json.dumps(event))
