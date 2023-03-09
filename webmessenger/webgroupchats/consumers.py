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
        self.room = None
        self.user = None
        self.room_group_pk = None
        self.private_group = None

    @database_sync_to_async
    def get_room(self):
        return Room.objects.get(pk=self.pk)

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
    def save_messages(self, message, room):
        user = self.user
        Message.objects.create(content=message,
                               author=user,
                               room=room
                               )

    async def connect(self):
        # Define attributes
        self.pk = self.scope["url_route"]["kwargs"]["pk"]  # берем имя комнаты из URL
        self.room = await self.get_room()
        self.room_name = self.room.name
        self.user = self.scope['user']
        self.room_group_pk = f"chat_{self.pk}"  # Создаем имя группы на основе pk комнаты
        self.private_group = f"private_{self.user.username}"  # Создаем имя личной группы

        if self.user.is_authenticated:
            # Добавление канала в общую группу
            await self.channel_layer.group_add(  # В channel_layer добавляем в группу соединение с именем channel_name
                self.room_group_pk,
                self.channel_name
            )

            # Добавление канала в личную группу
            await self.channel_layer.group_add(  # В channel_layer добавляем в группу соединение с именем channel_name
                self.private_group,
                self.channel_name
            )

            await self.accept()

            # Добавление пользователя в Room model
            await self.add_to_room()

            # Отправка сообщения-оповещения "пользователь вошел" в общую группу
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "user_join_members",
                    "username": self.scope['user'].username,
                    "members": await self.get_members()
                }
            )

    async def disconnect(self, code):

        if self.user.is_authenticated:
            # Удаление пользователя из Room model
            await self.remove_from_room()
            # Отправка сообщения-оповещения "пользователь вышел" в общую группу
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "user_leave_members",
                    "username": self.scope['user'].username,
                    "members": await self.get_members()
                }
            )
            # Удаление канала из общей группу
            await self.channel_layer.group_discard(
                self.room_group_pk,
                self.channel_name
            )

            # Удаление канала из личной группы
            await self.channel_layer.group_discard(
                self.private_group,
                self.channel_name
            )

    async def receive(self, text_data=None, bytes_data=None):

        text_data_json: dict = json.loads(text_data)

        message: str = text_data_json.get('message', None)

        if message.startswith('/name'):
            message_splited = message.split(' ', 2)
            target_user = message_splited[1]
            target_message = message_splited[2]
            await self.channel_layer.group_send(
                f"private_{target_user}", {
                    "type": "private_invite",
                    "username": self.scope['user'].username,
                    "message": target_message
                }
            )

            await self.channel_layer.group_add (

            )

        else:
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "chat_message",
                    "time": datetime.datetime.utcnow().isoformat(),
                    "username": self.scope['user'].username,
                    "message": message
                }
            )

            await self.save_messages(message, self.room)

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
