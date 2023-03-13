# WebSocketMessanger
### Общая информация о проекте  
Мини-проект "Мессенджер" в целях эксперимента по работе с протоколом WebSocket.

### Функционал: 
**Стек backend:** DRF + Django Channels. Redis в качестве брокера.

**Взаимодействие backend и fronend**: AJAX.

Система аутентификация на основе токенов с помощью библиотеки Djoser.

Реализованы функции:
-персональный чат (подобие "избранное" в Телеграмме);
-чат-комнаты по темам (создание, редактирование, удаление авторами);
-тет-а-тет чаты при прямом обращении к пользователю;
-редактирование профиля (фото, имя);

### Установка:
1. Для запуска проекта необходимо наличие установленного [Docker](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=dd-smartbutton&utm_location=module)

Убедитесь, что процесс Docker запущен:
```
docker info
```
2. Создайте временную папку и скопируте проект с удаленного репозитория:
```
mkdir WebmessTemp
cd WebmessTemp
git clone https://github.com/TimurSuvorov/WebSocketMessanger.git
cd .\WebSocketMessanger\webmessenger\
```
3. Запустите проект с помощью Docker-compose:
```
docker-compose up
```
4. Зайдите по адресу [http://127.0.0.1:8000/signin](http://127.0.0.1:8000/signin/)
