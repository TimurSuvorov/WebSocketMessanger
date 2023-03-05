import {insertToEndElement, badResponseProc} from './utils.js'

const btn_signup = document.querySelector('.btn-signup');
const container  = document.querySelector('.main');


btn_signup.addEventListener('click', () => {
    const email = document.querySelector('#id_email');
    const username = document.querySelector('#id_username');
    const password = document.querySelector('#id_password');
    if (!email.checkValidity() && !username.checkValidity() && !password.checkValidity()) {
        insertToEndElement('Некорректный ввод', container)} else {
        fetch('http://127.0.0.1:8000/api/v1/auth/users/',{
            method: 'post',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                email: email.value,
                username: username.value,
                password: password.value
            }),
        })
        .then((response) => {
            // Проверяем результаты запроса
            if (response.status !== 201) {
                badResponseProc(response, container)
            } else {
                return response.json();
            }
        })
        .then((data) => {
            if (data) {
                let status_text = `Здравствуйте ${username.value}! Вы успешно зарегистрированы. 
                Сейчас вы направитесь на страницу входа`
                insertToEndElement (status_text, container)
                setTimeout(() => {
                    window.location.replace('/signin')
                }, 3000)
            }
        })
        .catch((error) => {
            insertToEndElement (error, container)
            }
            )
    }
})