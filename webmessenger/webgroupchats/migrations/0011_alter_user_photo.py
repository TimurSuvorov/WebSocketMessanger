# Generated by Django 4.1.7 on 2023-03-10 21:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webgroupchats', '0010_alter_room_label'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='photo',
            field=models.ImageField(blank=True, default='photo/default.jpeg', upload_to='photo'),
        ),
    ]
