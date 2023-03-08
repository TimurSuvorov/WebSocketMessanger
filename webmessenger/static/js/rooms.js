import {
    requestGetOption,
    getToken,
    requestUpdateOption,
    getProfileInfo,
    logOut
} from './utils.js'

let chatSocket;

const l_list_rooms = document.querySelector('.l_list_rooms');
const btn_create_room = document.querySelector('.btn_create_room')
const href_logout = document.querySelector('.a_logout')
const sp_members = document.querySelector('.sp_members')

if (!getToken()) {
    window.location.replace('/signin')
}

btn_create_room.focus()

await renderListRoom()

href_logout.addEventListener('click', () => logOut())
btn_create_room.addEventListener('click', () => createRoom())




async function renderListRoom () {
    const response = await fetch('http://127.0.0.1:8000/api/v1/room/', requestGetOption())
    const profileInfo = await getProfileInfo();
    if (response.ok) {
        const rooms_json = await response.json()
        l_list_rooms.innerHTML = ''
        rooms_json.forEach((room_json) => {
            let id = room_json.id;
            let name = room_json.name;
            let author = room_json.author;
            let room_url = room_json.room_url;
            const elemRoom = document.createElement('li');
            elemRoom.innerHTML = `
            <span>
                <a id="label_room-${id}" style="font-size: 22px">${name}</a>
                <div class="d_btns_room">
                    <button id="btn-ent-${id}" class="btn_enter btn-sm btn-success">Войти</button>
                    <button id="btn-ex-${id}" class="btn_exit btn-sm btn-success hidden">Выйти</button>
                    <button id="btn-rm-${id}" class="btn_remove btn-sm btn-success hidden">Удалить</button>
                </div>
            </span>
            <hr>
        `
            l_list_rooms.appendChild(elemRoom);
            const btn_enter = document.querySelector(`#btn-ent-${id}`)
            const btn_exit = document.querySelector(`#btn-ex-${id}`)
            const btn_remove = document.querySelector(`#btn-rm-${id}`)
            //Добавление кнопок "Очистить" и "Удалить", если автор
            if (profileInfo.username === author) {
                btn_remove.classList.remove('hidden')
            }

            btn_enter.addEventListener('click', async () => {
                chatOpenWebSocket(btn_enter);
                document.querySelector('#title_room').innerHTML = 'Комната ' + name;
                btn_enter.classList.add('hidden');
                btn_exit.classList.remove('hidden');
            })

            btn_exit.addEventListener('click', () => {
                chatCloseWebSocket(btn_exit);
                btn_exit.classList.add('hidden');
                btn_enter.classList.remove('hidden');
                document.querySelector('#title_room').innerHTML = 'Войдите в чат';
                document.querySelector('#chat-log').value = 'Вы вышли из чатов';
                document.querySelector('#membersSelector').innerHTML = '';
            })

            btn_remove.addEventListener('click', async () => {
                chatCloseWebSocket(btn_remove);
                await removeRoomRenderList(room_url);
            })
        })
    }
}

// Opening WebSocket
function chatOpenWebSocket(btnNode) {
    if (chatSocket) {
        let id = chatSocket.url.match(/.*rooms\/(.*)\//)[1]
        document.querySelector(`#btn-ex-${id}`).classList.add('hidden')
        document.querySelector(`#btn-ent-${id}`).classList.remove('hidden')
        chatSocket.close()
    }
    const roomId = btnNode.id.match(/^btn-[a-z]*-(.*)$/)[1]  // Get room name from button id
    chatSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/rooms/'
        + roomId
        + '/?token='
        + getToken()
    );

    chatSocket.onopen = async function (e) {
        document.querySelector('#chat-log').value = '';  // Очищаем окно сообщений
        document.querySelector('#membersSelector').innerHTML = '';  // Очищаем окно пользователей
        let chat_log = document.querySelector('#chat-log');
        const room_url = `http://127.0.0.1:8000/api/v1/messeges_room/${roomId}`;  // Формируем URL комнаты для запроса сообщений
        const messages_log = await getMessages(room_url);
        messages_log.forEach((message_log) => {
            let data_time = new Date (message_log.create_time);
            const data_time_format = `${('0' + data_time.getDate()).slice(-2)}.${('0' + (data_time.getMonth() + 1)).slice(-2)} ${('0' + data_time.getHours()).slice(-2)}:${('0' + data_time.getMinutes()).slice(-2)}`;
            let username = message_log.author;
            let message = message_log.content;
            chat_log.value += (`${data_time_format}  ${username}:\n  ${message}` + '\n');
            });
        if (messages_log.length) {
            chat_log.value += '^^^^^^^^^^ История сообщений ^^^^^^^^^^' + '\n';
            chat_log.scrollTop = chat_log.scrollHeight;
            }
        console.log('Socker has been opened')
    }

    chatSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);
        console.log(data.type)
    switch (data.type) {
        case 'only_for_user': // личное сообщение из группы
            document.querySelector('#chat-log').value += (data.message + '\n');
            document.querySelector('#membersSelector').innerHTML = '';
            const list_members = data.members;
            list_members.forEach((member) => {
                memberOptionAdd(member);
            })
            break;
        case "user_join_members":
            memberOptionAdd(data.username);
            break;
        case "chat_message":
            let chat_log = document.querySelector('#chat-log');
            chat_log.value += (`${data.time}  ${data.username}:\n  ${data.message}` + '\n');
            chat_log.scrollTop = chat_log.scrollHeight;
            break;
        case "user_leave_members":
            memberOptionRemove(data.username);
            break;
            }
    };

    chatSocket.onclose = function(e) {
        if (e.wasClean) {
            console.log('Chat socket closed clearly')
        } else {
            console.error('Chat socket closed unexpectedly')
        }
    };

    document.querySelector('#chat-message-input').focus();
        document.querySelector('#chat-message-input').onkeyup = function(e) {
            if (e.keyCode === 13) {  // enter, return
                document.querySelector('#chat-message-submit').click();
            }
        };

    document.querySelector('#chat-message-submit').onclick = function(e) {
        const messageInput = document.querySelector('#chat-message-input');
        const message = messageInput.value;
        if (message.length) {
            chatSocket.send(JSON.stringify({
            'message': message
                })
            )
        }
        messageInput.value = '';
    };
}

document.querySelector('#chat-message-clear').onclick = function (e) {
    document.querySelector('#chat-log').value = '';
}


// Closing WebSocket
function chatCloseWebSocket(btnNode) {
    if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
    }
}

async function createRoom() {
    const new_name = prompt('Введите имя нового чат-комнаты');
    if (new_name) {
        const new_room_body = JSON.stringify({name: new_name})
        const response = await fetch('http://127.0.0.1:8000/api/v1/room/', requestUpdateOption('post', new_room_body))
        if (response.ok) {
            await renderListRoom()
        }
    }
}

async function removeRoomRenderList(room_url) {
    const response = await fetch(room_url, requestUpdateOption('delete', {}))
    if (response.ok) {
        await renderListRoom()
    }
}

async function getMembers(room_url) {
    const members_url = room_url + 'members/'
    const response = await fetch(members_url, requestGetOption())
    if (response.ok) {
        return await response.json()
    }
}

async function getMessages(room_url) {
    const response = await fetch(room_url, requestGetOption())
    if (response.ok) {
        return await response.json()
    }
}

function memberOptionAdd (member) {
        if (document.querySelector(`option[id=${member}]`)) return;
        const opt_member = document.createElement('option');
        opt_member.id = member;
        opt_member.innerHTML = member;
        document.querySelector('#membersSelector').appendChild(opt_member);
}

function memberOptionRemove (member) {
        const opt_member = document.querySelector(`option[id=${member}]`)
        if (!opt_member) return;
        document.querySelector('#membersSelector').removeChild(opt_member)
}