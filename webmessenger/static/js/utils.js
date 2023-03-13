//Проверка наличия токена
export function getToken () {
    return window.localStorage.getItem('token')
}

//Удаление токена
export function delToken () {
    window.localStorage.removeItem('token')
    window.location.replace('/signin')
    }


//Функция выхода из системы
export async function logOut () {
    if (confirm('Вы точно решили выйти?')) {
        const response = await fetch('http://127.0.0.1:8000/auth/token/logout', requestUpdateOption('post', {}))
        if (response.ok) {
            delToken()
            alert('Вы успешно вышли. Спасибо за использование нашего ресурса!')
            window.location.replace('/signin')
        }
    }
}

//Генерация Headers для типа "Content-Type": "application/json"
export function myHeadersJSON () {
        return {
            "Content-Type": "application/json",
            "Authorization": "Token " + getToken()
        }
}

//Генерация Headers для отправки файлов
export function myHeadersFile () {
        return {
            "Authorization": "Token " + getToken()
        }
}

//Генерация опций для Fetch GET-запрос
export function requestGetOption () {
    return {
        method: 'get',
        headers: myHeadersJSON(),
    }
}

//Генерация опций для Fetch PUT/POST-запрос
export function requestUpdateOption (method_, body_) {
    return {
        method: method_,
        headers: myHeadersJSON(),
        body: body_
    }
}

//Генерация опций для Fetch PUT/POST-запрос для файлов
export function requestUpdateOptionFile (method_, body_) {
    return {
        method: method_,
        headers: myHeadersFile(),
        body: body_
    }
}

export async function getProfileInfo () {
    return fetch('http://127.0.0.1:8000/api/v1/auth/users/me/', requestGetOption())
            .then((response) => {
                if (response.status === 401) {
                    return delToken()
                }

                return response.json()
            })
            .then((profile_info) => profile_info)
}

//Добавление жирного текста в конец узла
export function insertToEndElement (text, element) {
    let status_el = document.querySelector('#status');
    if (status_el) {status_el.remove()}
    element.insertAdjacentHTML('beforeend',`<div id="status"><strong>${text}</strong></div>`)
    }


// Формирование текста и добавление в конец узла подробного текста из ответа JSON
export function badResponseProc (response, element) {
    response.json().then((bad_status) => {
    let ext_status = ''
    for (let key in bad_status) {
        ext_status += bad_status[key]
    }
    insertToEndElement (ext_status, element)
        })
    }