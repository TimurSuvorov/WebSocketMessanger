from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import redirect
from djoser import permissions
from rest_framework import generics, status, viewsets, mixins
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from .serializer import *
from .permissions import IsAuthorOrReadOnlyObject, IsOwner, DependOnRoomTypeIsOwnerObject


class ProfileHTML(APIView):
    renderer_classes = [TemplateHTMLRenderer]

    def get(self, request, *args, **kwargs):
        return Response({}, template_name='profile.html')


class RoomsHTML(APIView):
    renderer_classes = [TemplateHTMLRenderer]

    def get(self, request, *args, **kwargs):
        return Response({}, template_name='rooms.html')


class SignUpHTML(APIView):
    renderer_classes = [TemplateHTMLRenderer]

    def get(self, request, *args, **kwargs):
        return Response({}, template_name='signup.html')


class SignInHTML(APIView):
    renderer_classes = [TemplateHTMLRenderer]

    def get(self, request, *args, **kwargs):
        return Response({}, template_name='signin.html')


class ProfileViewSet(mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin,
                     GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsOwner]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_queryset(self):
        type_param = self.request.GET.get('type', '')
        if type_param == "private" or type_param == "tetatet":  # Этого типа можно только свои смотреть
            token = self.request.META.get('HTTP_AUTHORIZATION', '')[6:]
            user = Token.objects.get(pk=token).user
            queryset = Room.objects.filter(author=user, type=type_param)
        else:
            queryset = Room.objects.filter(type="common")
        return queryset

    @action(methods=['get'], detail=True)
    def members(self, request, pk=None):
        try:
            room_obj = Room.objects.get(pk=pk)
            if room_obj.type in ["private", "tetatet"] and \
                    not (self.request.user in room_obj.author.all()):
                raise PermissionDenied
            members_list = room_obj.members.all().values_list('username', flat=True)
            response_json = {"members": members_list}
            status_ = status.HTTP_200_OK
        except ObjectDoesNotExist:
            response_json = {"detail": "Not found."}
            status_ = status.HTTP_404_NOT_FOUND
        return Response(response_json, status_)

    def get_permissions(self):
        if self.action == 'list' or self.action == 'create':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthorOrReadOnlyObject, IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        room_instance = serializer.save()
        room_instance.author.add(self.request.user)
        room_instance.label = room_instance.name
        room_instance.save()

    def perform_update(self, serializer):
        room_instance = serializer.save()
        room_instance.label = room_instance.name
        room_instance.save()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = Room.objects.get(pk=self.kwargs['pk'])
            self.perform_destroy(instance)
        except ObjectDoesNotExist:
            pass
        return Response(
            {self.kwargs['pk']: "deleted"},
            status=status.HTTP_204_NO_CONTENT)


class JoinRoomAPIView(generics.UpdateAPIView):
    queryset = Room.objects.all()
    serializer_class = ActionsRoomSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        instance.members.add(self.request.user)
        instance.save()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)


class LeaveRoomAPIView(generics.UpdateAPIView):
    queryset = Room.objects.all()
    serializer_class = ActionsRoomSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        instance.members.remove(self.request.user)
        instance.save()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)


# class MembersRoomAPIView(generics.RetrieveAPIView):
#     queryset = Room.objects.all()
#     serializer_class = RoomSerializer
#     permission_classes = [IsAuthenticated]


class MessagesRoomAPIView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_obj = Room.objects.get(pk=self.kwargs['pk'])
        if room_obj.type in ["private", "tetatet"] and \
                not (self.request.user in room_obj.author.all()):
            raise PermissionDenied
        queryset = room_obj.message_set.all()
        return queryset


def redirect_view(request):
    return redirect('/rooms/')
