import {getProfileInfo, getToken, logOut, requestGetOption, requestUpdateOption} from './utils.js'

let chatSocket;
let background_chatSocket;

const l_private_rooms = document.querySelector('.l_private_rooms');
const l_common_rooms = document.querySelector('.l_common_rooms');
const l_tetatet_rooms = document.querySelector('.l_tetatet_rooms');
const btn_create_room = document.querySelector('.btn_create_room');
const href_logout = document.querySelector('.a_logout');
const membersSelector = document.querySelector('#membersSelector');
const allmembersSelector = document.querySelector('#allmembersSelector');
const chat_message_input = document.querySelector('#chat-message-input');


if (!getToken()) {
    window.location.replace('/signin')
}

btn_create_room.focus();

await renderListRoom();
await backgroundChatOpenWebSocket();

href_logout.addEventListener('click', () => logOut());
btn_create_room.addEventListener('click', () => createRoom());
membersSelector.addEventListener('click', (e) => {
    chat_message_input.value = `/only_to ${e.target.value} `
});
allmembersSelector.addEventListener('click', (e) => {
    if (chatSocket) {
        chat_message_input.value = `/only_to ${e.target.value} `
    }
});

async function renderListRoom () {
    const common_rooms_response = await fetch('http://127.0.0.1:8000/api/v1/room/?type=common', requestGetOption());
    const common_rooms_json = await common_rooms_response.json();
    const private_rooms_response = await fetch('http://127.0.0.1:8000/api/v1/room/?type=private', requestGetOption());
    const private_rooms_json = await private_rooms_response.json();
    const tetatet_rooms_response = await fetch('http://127.0.0.1:8000/api/v1/room/?type=tetatet', requestGetOption());
    const tetatet_rooms_json = await tetatet_rooms_response.json();
    const all_rooms_json = [private_rooms_json, common_rooms_json, tetatet_rooms_json]; // Объединяем массивы разных типов чатов в один массив
    const all_rooms_nodes = [l_private_rooms, l_common_rooms, l_tetatet_rooms];
    const profileInfo = await getProfileInfo();
    l_private_rooms.innerHTML = '';
    l_common_rooms.innerHTML = '';
    l_tetatet_rooms.innerHTML = '';
    let i = 0;
    all_rooms_json.forEach((typed_rooms) => {
        const list_node = all_rooms_nodes[i];
        i++;
        typed_rooms.forEach((room_json) => {
            let id = room_json.id;
            let name = room_json.name;
            let author = room_json.author;
            let room_url = room_json.room_url;
            let label = room_json.label;
            createRoomNode(id, label, author, room_url, profileInfo, list_node, "room_options_fast")
        });
    });
}

// Opening background WebSocket for handling online users
async function backgroundChatOpenWebSocket() {

    background_chatSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/background'
    + '/?token='
    + getToken()
    );
    background_chatSocket.onopen = async function () {
        let interval_id = setInterval(() => {
            background_chatSocket.send(JSON.stringify({
            'echo_online': 'iamhere'
                })
            )
        }, 2000)
    }

    background_chatSocket.onmessage = async function (e) {
        const background_data = JSON.parse(e.data);
        switch (background_data.type) {
            case 'user_online':
                memberOptionAdd('allmembersSelector', background_data.username);
                break;
            case 'user_offline':
                memberOptionRemove('allmembersSelector', background_data.username);
                break;
            case "background_private_invite":
                const tetatet_room_response = await fetch(`http://127.0.0.1:8000/api/v1/room/${background_data.id}?type=tetatet`, requestGetOption());
                const tetatet_room_json = await tetatet_room_response.json();
                const id = tetatet_room_json.id;
                const label = tetatet_room_json.label;
                const author = tetatet_room_json.author;
                const room_url = tetatet_room_json.room_url;
                const profileInfo = await getProfileInfo()
                createRoomNode(id, label, author, room_url, profileInfo, l_tetatet_rooms, "room_options_blinked")
                if (background_data.subtype === "source_user") {
                    chat_log.value += `INFO: Перейдите в тет-а-тет чат с пользователем ${background_data.target_user} `
                } else if (data.subtype === "target_user") {
                    chat_log.value += `INFO: Личное сообщение от ${background_data.source_user}. Перейдите в тет-а-тет чат для общения`
                }
            break;
        }
    }

    background_chatSocket.onerror = function () {
        background_chatSocket.close();
    }

    background_chatSocket.onclose = async function (e) {
        if (e.wasClean) {
            console.log('Chat socket closed clearly')
        } else {
            console.error('Chat socket closed unexpectedly')
        }
        setTimeout(function() {
            backgroundChatOpenWebSocket();
            }, 1000);
    }
}

// Opening WebSocket
async function chatOpenWebSocket(btnNode) {
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
        let chat_log = document.querySelector('#chat-log')
        chat_log.value = ''  // Очищаем окно сообщений
        document.querySelector('#membersSelector').innerHTML = '';  // Очищаем окно пользователей
        const room_url = `http://127.0.0.1:8000/api/v1/messeges_room/${roomId}`;  // Формируем URL комнаты для запроса сообщений
        const messages_log = await getMessages(room_url);
        messages_log.forEach((message_log) => {
            const data_time_format = formatedDateTime(message_log.create_time)
            let username = message_log.author;
            let message = message_log.content;
            chat_log.value += (`${data_time_format}  ${username}:\n  ${message}` + '\n');
            });
        if (messages_log.length) {
            chat_log.value += '^^^^^^^^^^ История сообщений ^^^^^^^^^^' + '\n';
            chat_log.scrollTop = document.querySelector('#chat-log').scrollHeight;
            }
    }

    chatSocket.onmessage = async function (e) {
    const data = JSON.parse(e.data);
    let chat_log = document.querySelector('#chat-log');
    switch (data.type) {
        case 'only_for_user': // личное сообщение из группы
            document.querySelector('#membersSelector').innerHTML = '';
            data.members.forEach((member) => memberOptionAdd('membersSelector', member))
            break;
        case "chat_deleted_message":
            chat_log.value += data.message + "\n"
            break;
        case "user_join_members":
            memberOptionAdd('membersSelector', data.username);
            break;
        case "user_leave_members":
            memberOptionRemove('membersSelector', data.username);
            break;
        case "chat_message":
            const data_time_format = formatedDateTime(data.time);
            chat_log.value += (`${data_time_format}  ${data.username}:\n  ${data.message}` + '\n');
            chat_log.scrollTop = chat_log.scrollHeight;
            break;
        case "private_invite":
            const tetatet_room_response = await fetch(`http://127.0.0.1:8000/api/v1/room/${data.id}?type=tetatet`, requestGetOption());
            const tetatet_room_json = await tetatet_room_response.json();
            const id = tetatet_room_json.id;
            const label = tetatet_room_json.label;
            const author = tetatet_room_json.author;
            const room_url = tetatet_room_json.room_url;
            const profileInfo = await getProfileInfo()
            createRoomNode(id, label, author, room_url, profileInfo, l_tetatet_rooms, "room_options_blinked")
            if (data.subtype === "source_user") {
                chat_log.value += `INFO: Перейдите в тет-а-тет чат с пользователем ${data.target_user} `
            } else if (data.subtype === "target_user") {
                chat_log.value += `INFO: Личное сообщение от ${data.source_user}. Перейдите в тет-а-тет чат для общения`
            }
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
        if (!message.length) return;
        if (chatSocket) {
            chatSocket.send(JSON.stringify({
            'message': message
                })
            )
        } else {
            background_chatSocket.send(JSON.stringify({
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
function chatCloseWebSocket() {
    if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
    }
    document.querySelector('#title_room').innerHTML = 'Войдите в чат';
    document.querySelector('#chat-log').value = '';
    document.querySelector('#membersSelector').innerHTML = '';
}

async function createRoom() {
    const new_name = prompt('Введите имя нового чат-комнаты');
    if (new_name) {
        const new_room_body = JSON.stringify({name: new_name})
        const response = await fetch('http://127.0.0.1:8000/api/v1/room/', requestUpdateOption('post', new_room_body))
        if (response.ok) {
            await renderListRoom();
            const room_data = await response.json();
            document.querySelector(`#btn-ent-${room_data.id}`).click();  // Вход после создания комнаты
        }
    }
}

async function editNameRoom(id) {
    const new_name = prompt('Введите новое имя чата:');
    if (new_name) {
        const new_name_body = JSON.stringify({name: new_name})
        const response = await fetch(`http://127.0.0.1:8000/api/v1/room/${id}/`, requestUpdateOption('put', new_name_body))
        if (response.ok) {
            await renderListRoom();
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

function memberOptionAdd (selector, member) {
        if (document.querySelector(`#${selector} option[id=${member}]`)) return;
        const opt_member = document.createElement('option');
        opt_member.id = member;
        opt_member.innerHTML = member;
        document.querySelector(`#${selector}`).appendChild(opt_member);
}

function memberOptionRemove (selector, member) {
        const opt_member = document.querySelector(`#${selector} option[id=${member}]`)
        if (!opt_member) return;
        document.querySelector(`#${selector}`).removeChild(opt_member)
}

function createRoomNode(id, label, author,  room_url, profileInfo, list_node, class_animate) {
    const elemRoom = document.createElement('li');
            elemRoom.innerHTML = `
        <span class=${class_animate}>
            <a id="label_room-${id}" style="font-size: 17px">${label}
            <i id="icon_edit-${id}"class="bi-pencil-square hidden" style="font-size: medium;"></i>
            <i id="icon_remove-${id}"class="bi bi-trash3 hidden" style="font-size: medium;"></i>
            </a>
            <div class="d_btns_room">
                <button id="btn-ent-${id}" class="btn_enter btn-sm btn-success">Войти</button>
                <button id="btn-ex-${id}" class="btn_exit btn-sm btn-outline-warning hidden">Выйти</button>
            </div>
        </span>
    `
            list_node.appendChild(elemRoom);
            const icon_edit = document.querySelector(`#icon_edit-${id}`);
            const icon_remove = document.querySelector(`#icon_remove-${id}`);
            const btn_enter = document.querySelector(`#btn-ent-${id}`);
            const btn_exit = document.querySelector(`#btn-ex-${id}`);
            if (author.includes(profileInfo.username) && label !== 'Personal') {
                icon_remove.classList.remove('hidden')
                icon_edit.classList.remove('hidden')
            }

            icon_edit.addEventListener('click', async () => {
                const roomId = icon_edit.id.match(/^icon_edit-(.*)$/)[1]  // Get room name from button id
                await editNameRoom(roomId)
            })

            icon_remove.addEventListener('click', async () => {
                chatCloseWebSocket();
                await removeRoomRenderList(room_url);
            })

            btn_enter.addEventListener('click', async () => {
                chatOpenWebSocket(btn_enter);
                document.querySelector('#title_room').innerHTML = `Комната "${label}"`;
                btn_enter.classList.add('hidden');
                btn_exit.classList.remove('hidden');
            })

            btn_exit.addEventListener('click', () => {
                chatCloseWebSocket(btn_exit);
                btn_exit.classList.add('hidden');
                btn_enter.classList.remove('hidden');
            })
}


function formatedDateTime (datetime) {
    let data_time = new Date (datetime);
    return `${('0' + data_time.getDate()).slice(-2)}.${('0' + (data_time.getMonth() + 1)).slice(-2)} ${('0' + data_time.getHours()).slice(-2)}:${('0' + data_time.getMinutes()).slice(-2)}`
}

async function getAllMembersOnline () {
    const response = await fetch('http://127.0.0.1:8000/api/v1/room/allmembers', requestGetOption())
    if (response.ok) {
        return await response.json();
    }
}

