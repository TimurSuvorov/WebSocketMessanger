from django.apps import AppConfig


class WebgroupchatsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'webgroupchats'

    def ready(self):
        import webgroupchats.signals
