import {
    insertToEndElement,
    getToken,
    logOut,
    requestUpdateOptionFile,
    getProfileInfo,
} from './utils.js'


const elem_username = document.querySelector('.inp_username');
const elem_photo = document.querySelector('.img_photo');
const block_photo = document.querySelector('.block_photo');
const input_upload = document.querySelector('.input_upload');
const btn_upload = document.querySelector('.btn_upload')
const href_logout = document.querySelector('.a_logout')

if (!getToken()) {
    window.location.replace('/signin')
}

let userProfileInfo = await getProfileInfo(); // http://127.0.0.1:8000/api/v1/auth/users/me/'
renderProfile(userProfileInfo)


// submit if the user presses the enter key
elem_username.onkeyup = function(e) {
    if (e.keyCode === 13) {  // enter key
        btn_upload.click();
    }
};

href_logout.addEventListener('click', () => logOut())

btn_upload.addEventListener('click', async () => {
    const fresh_elem_username = document.querySelector('.inp_username');
    if (input_upload.files.length || fresh_elem_username.value !== userProfileInfo.username ) {
        const response = await uploadUpdates(userProfileInfo.user_link, input_upload.files[0], fresh_elem_username.value)
        if (response.ok) {
           userProfileInfo = await getProfileInfo();
           renderProfile(userProfileInfo);
           insertToEndElement ('Данные успешно обновлены. Возрадуйтесь!', block_photo)
        }
        } else {
        insertToEndElement ('Изменения отсутствуют', block_photo)
    }
    })



async function uploadUpdates (url, file, username) {
    const formData = new FormData();
    if (file) {
        formData.append("photo", file);
    }
    formData.append("username", username)
    return await fetch(url, requestUpdateOptionFile('put', formData))
}

function renderProfile (userProfileInfo) {
            elem_username.value = userProfileInfo.username;
            elem_photo.src = userProfileInfo.photo_link;
}


