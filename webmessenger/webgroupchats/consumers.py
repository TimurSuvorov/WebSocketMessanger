import datetime
import json
from pprint import pprint

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from webgroupchats.models import Room, Message, User


class ChatConsumer(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.pk = None
        self.room = None
        self.room_name = None
        self.room_label = None
        self.room_group_pk = None
        self.user = None
        self.private_group = None

    @database_sync_to_async
    def get_room(self):
        room_qs = Room.objects.filter(pk=self.pk)
        if room_qs.exists():
            return room_qs[0]

    @database_sync_to_async
    def create_tetatet_room(self, room, author1, author2):
        tetatet_group_obj, created = Room.objects.get_or_create(name=room, type="tetatet")
        tetatet_group_obj.author.add(author1)
        tetatet_group_obj.author.add(author2)
        tetatet_group_obj.label = f"{author1.username}<->{author2.username}"
        tetatet_group_obj.save()
        return tetatet_group_obj

    @database_sync_to_async
    def get_user_by_username(self, username):
        return User.objects.get(username=username)

    @database_sync_to_async
    def get_authors(self):
        return list(self.room.author.values_list('username', flat=True))

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
        self.room_label = self.room.label
        self.room_group_pk = f"chat_{self.pk}"  # Создаем имя группы на основе pk комнаты
        self.user = self.scope['user']
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

            # Запись пользователя в Room model
            await self.add_to_room()

            # Активные пользователи в комнате
            members = await self.get_members()

            # Отправка сообщения-оповещения "пользователь вошел" в общую группу
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "user_join_members",
                    "username": self.scope['user'].username,
                    "members": members
                }
            )

            # Отправка сообщения для пользователя-инициатора (можно отправлять личное сообщение после входа)
            await self.send(json.dumps({
                "type": "only_for_user",
                "members": members,
                "message": ''
            }))

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

        # Проверка на случай, если комната уже удалена
        if not (await self.get_room()):
            await self.channel_layer.group_send(
                self.room_group_pk, {
                    "type": "chat_deleted_message",
                    "message": "Чат удален владельцем. Обновите страницу!"
                }
            )
            return

        # Если приходит сообщение личного характера, начинающееся на /name, то создается тет-а-тет группа
        if message.startswith('/only_to'):
            message_splited = message.split(' ', 2)
            target_user = message_splited[1]
            target_message = message_splited[2]
            if self.user.username == target_user and len(target_message) > 0:  # Если пишет самому себе или пустое сообщение, то ничего не происходит
                return
            # Формируем имя тет-а-тет комнаты tetatet_pk1_pk2, где pk1 и pk2 в порядке возрастания
            target_user_obj = await self.get_user_by_username(target_user)
            target_user_pk = target_user_obj.pk
            tetatet_group_name = f"tetatet_{min(self.user.pk, target_user_pk)}_{max(self.user.pk, target_user_pk)}"

            # Создаем тет-а-тет комнату в БД для записи сообщений
            tetatet_room_obj = await self.create_tetatet_room(room=tetatet_group_name,
                                                              author1=self.user,
                                                              author2=target_user_obj)
            # Отправляем приглашение в тет-а-тет комнату целевому пользователю
            await self.channel_layer.group_send(
                f"private_{target_user}", {
                    "type": "private_invite",
                    "subtype": "target_user",
                    "tetatet_group_name": tetatet_group_name,
                    "id": tetatet_room_obj.id,
                    "source_user": self.scope['user'].username,
                    "message": target_message
                }
            )
            # Отправляем оповещение об уведомлении инициатору
            await self.send(json.dumps({
                "type": "private_invite",
                "subtype": "source_user",
                "tetatet_group_name": tetatet_group_name,
                "id": tetatet_room_obj.id,
                "username": self.scope['user'].username,
                "target_user": target_user,
                "message": target_message
            })
            )
            await self.save_messages(target_message, tetatet_room_obj)
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

    # When chat deleted
    async def chat_deleted_message(self, event):
        await self.send(text_data=json.dumps(event))

    # When user join
    async def user_join_members(self, event):
        await self.send(text_data=json.dumps(event))

    # When user leaved
    async def user_leave_members(self, event):
        await self.send(text_data=json.dumps(event))

    # When user send private message
    async def private_invite(self, event):
        await self.send(text_data=json.dumps(event))
