from rest_framework import permissions


class DependOnRoomTypeIsOwnerObject(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if obj.type in ["private", "tetatet"]:
            print(obj.type in ["private", "tetatet"])
            return request.user in obj.author.all()


class IsAuthorOrReadOnlyObject(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user in obj.author.all()


class IsOwnerObject(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return request.user in obj.author.all()


class IsOwner(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return obj == request.user


class IsAuthenticatedByToken(permissions.BasePermission):

    def has_permission(self, request, view):
        pass