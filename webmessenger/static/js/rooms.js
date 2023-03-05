import {
    requestGetOption,
    getToken,
    myHeadersJSON,
    myHeadersFile,
    requestUpdateOption,
    getProfileInfo,
    logOut
} from './utils.js'

const l_list_rooms = document.querySelector('.l_list_rooms');
const btn_create_room = document.querySelector('.btn_create_room')
const href_logout = document.querySelector('.a_logout')
const sp_members = document.querySelector('.sp_members')

if (!getToken()) {
    window.location.replace('/signin')
}

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
            let members = room_json.members;
            const elemRoom = document.createElement('li');
            elemRoom.innerHTML = `
            <span>
                <a id="href-room-${id}" style="font-size: 22px">${name} <sub style="font-size: small;">(участники)</sub></a>
                <div class="d_btns_room">
                    <button id="btn-ent-${id}" class="b_room btn_enter">Войти</button>
                    <button id="btn-ex-${id}" class="b_room btn_exit">Выйти</button>
                    <button id="btn-cl-${id}" class="b_room btn_clear hidden">Очистить</button>
                    <button id="btn-rm-${id}" class="b_room btn_remove hidden">Удалить</button>
                </div>
            </span>
            <hr>
        `
            l_list_rooms.appendChild(elemRoom);
            const btn_enter = document.querySelector(`#btn-ent-${id}`)
            const btn_exit = document.querySelector(`#btn-ex-${id}`)
            const btn_clear = document.querySelector(`#btn-cl-${id}`)
            const btn_remove = document.querySelector(`#btn-rm-${id}`)
            const href_room = document.querySelector(`#href-room-${id}`)
            //Добавление кнопок "Очистить" и "Удалить", если автор
            if (profileInfo.username === author) {
                btn_clear.classList.remove('hidden')
                btn_remove.classList.remove('hidden')
            }

            btn_remove.addEventListener('click', async () => {
                await removeRoom(room_url)
            })
            href_room.addEventListener('click', async () => {
                const members_json = await getMembers(room_url);
                sp_members.innerHTML = '';
                members_json.members.forEach((member) => {
                    sp_members.innerHTML += member + "; "
                })
            })
        })
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

async function removeRoom(room_url) {
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