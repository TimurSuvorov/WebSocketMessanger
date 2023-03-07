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
                <a id="label_room-${name}" style="font-size: 22px">${name}</a>
                <div class="d_btns_room">
                    <button id="btn-ent-${name}" class="b_room btn_enter btn btn-success">Войти</button>
                    <button id="btn-ex-${name}" class="b_room btn_exit btn btn-success hidden">Выйти</button>
                    <button id="btn-rm-${name}" class="b_room btn_remove btn btn-success hidden">Удалить</button>
                </div>
            </span>
            <hr>
        `
            l_list_rooms.appendChild(elemRoom);
            const btn_enter = document.querySelector(`#btn-ent-${name}`)
            const btn_exit = document.querySelector(`#btn-ex-${name}`)
            const btn_remove = document.querySelector(`#btn-rm-${name}`)
            const label_room = document.querySelector(`#label_room-${name}`)
            //Добавление кнопок "Очистить" и "Удалить", если автор
            if (profileInfo.username === author) {
                btn_remove.classList.remove('hidden')
            }
            label_room.addEventListener('click', async () => {
                const members_json = await getMembers(room_url);
                sp_members.innerHTML = '';
                members_json.members.forEach((member) => {
                    sp_members.innerHTML += member + "; "
                })
            })

            btn_enter.addEventListener('click', () => {
                chatOpenWebSocket(btn_enter);
                btn_enter.classList.add('hidden')
                btn_exit.classList.remove('hidden')
            })

            btn_exit.addEventListener('click', () => {
                chatCloseWebSocket(btn_exit);
                btn_exit.classList.add('hidden')
                btn_enter.classList.remove('hidden')
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
        let opened_name = chatSocket.url.match(/.*rooms\/(.*)\//)[1]
        document.querySelector(`#btn-ex-${opened_name}`).classList.add('hidden')
        document.querySelector(`#btn-ent-${opened_name}`).classList.remove('hidden')
        chatSocket.close()
    }
    const roomName = btnNode.id.match(/^btn-[a-z]*-(.*)$/)[1]  // Get room name from button id
    chatSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/rooms/'
        + roomName
        + '/?token='
        + getToken()
    );

    chatSocket.onopen = function (e) {

        document.querySelector('#chat-log').value = ''
        document.querySelector('#membersSelector').innerHTML = '';
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
            document.querySelector('#chat-log').value += (`${data.username}: ${data.message}` + '\n');
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