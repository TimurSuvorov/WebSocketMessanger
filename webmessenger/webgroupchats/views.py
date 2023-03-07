from rest_framework import generics, status, viewsets, mixins
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from .serializer import *
from .permissions import IsAuthorOrReadOnlyObject, IsOwner


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

    @action(methods=['get'], detail=True)
    def members(self, request, pk=None):
        room_instance = Room.objects.get(pk=pk)
        members_list = room_instance.members.all().values_list('username', flat=True)
        return Response({"members": members_list})

    def get_permissions(self):
        if self.action == 'list' or self.action == 'create':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthorOrReadOnlyObject, IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        room_instance = serializer.save(author=self.request.user)
        room_instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {self.kwargs['pk']: "deleted",
             instance.name: "deleted"},
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


class MembersRoomAPIView(generics.RetrieveAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]


class MessegesRoomAPIView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_obj = Room.objects.get(pk=self.kwargs['pk'])
        queryset = room_obj.message_set.all()
        return queryset


