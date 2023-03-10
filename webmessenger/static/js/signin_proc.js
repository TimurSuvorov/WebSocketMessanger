import {insertToEndElement, badResponseProc, getToken} from './utils.js'

if (getToken()) {
    window.location.replace('/rooms')
}

const btn_signin = document.querySelector('.btn-signin');
const container = document.querySelector('.main');


btn_signin.addEventListener('click', function () {
    const username = document.querySelector('#id_username');
    const password = document.querySelector('#id_password');
    if (!username.checkValidity() && !password.checkValidity()) {
        insertToEndElement('Некорректный ввод', container)} else {
        const token = fetch('http://127.0.0.1:8000/auth/token/login', {
            method: 'post',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                username: username.value,
                password: password.value
            })
        })
            .then((response) => {
                // Проверяем результаты запроса
                if (response.status !== 200) {
                    badResponseProc(response, container)
                } else {
                    return response.json();
                }
            })
            .then((data) => {
                let token = data.auth_token
                window.localStorage.setItem("token", token)
                window.location.replace('/profile')
                return token
            })
    }
})

