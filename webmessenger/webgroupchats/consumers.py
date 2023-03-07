import json
from pprint import pprint

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from webgroupchats.models import Room


class ChatConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.room_name = None
        self.room_group_name = None
        self.room = None
        self.user = None

    @database_sync_to_async
    def get_room(self):
        return Room.objects.get(name=self.room_name)

    @database_sync_to_async
    def remove_room(self):
        Room.objects.get(name=self.room_name).delete()

    @database_sync_to_async
    def add_to_room(self):
        self.room.members.add(self.user)

    @database_sync_to_async
    def remove_from_room(self):
        self.room.members.remove(self.user)

    @database_sync_to_async
    def get_members(self):
        return list(self.room.members.values_list('username', flat=True))

    async def connect(self):
        # Define attributes
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]  # берем имя комнаты из URL
        self.room_group_name = f"chat_{self.room_name}"  # Создаем имя группы на основе имени комнаты
        self.user = self.scope['user']
        self.room = await self.get_room()

        if self.user.is_authenticated:
            # Add channel to group
            await self.channel_layer.group_add(  # В channel_layer добавляем в группу соединение с именем channel_name
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            # Add user to Room model
            await self.add_to_room()

            # Send welcome message only to user
            await self.send(text_data=json.dumps({
                "type": "only_for_user",
                "message": f'Привет {self.user.username}. Добро пожаловать в чат "{self.room_name}".',
                "members": await self.get_members()
                })
            )

            # Send service message with members of room
            await self.channel_layer.group_send(
                self.room_group_name, {
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
                self.room_group_name, {
                    "type": "user_leave_members",
                    "username": self.scope['user'].username,
                    "members": await self.get_members()
                }
            )
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data=None, bytes_data=None):

        text_data_json = json.loads(text_data)

        # Команда на удаление комнаты
        if text_data_json.get('remove_room', None):
            await self.channel_layer.group_send(
                self.room_group_name, {
                    "type": "chat_message",
                    "username": 'INFO',
                    "message": 'Группа была удалена владельцем! Пожалуйста, обновите страницу!'
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        else:
            message = text_data_json.get('message', None)
            await self.channel_layer.group_send(
                self.room_group_name, {
                    "type": "chat_message",
                    "username": self.scope['user'].username,
                    "message": message
                }
            )

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
