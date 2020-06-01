alertify.set('notifier','position', 'top-right');


function loadPage(url){
    location.href = url;
}

function post(url, data){
    $.post(url, data)
    .then(response => {
        switch(response.type){
            case 'error':
                alertify.error(response.content);
            break;
            case 'sucess':
                alertify.success(response.content);
            break;
            case 'redirect':
                loadPage(response.content);
            break;
            case 'hidden':
                console.log(response.content);
            break;
        }
    })
    .catch(err => {
        console.error(err.getResponseHeader());
        alertify.error('Ocorreu um erro interno!');
    });
}

Object.size = obj => {
    let size = 0, key;
    for(key in obj) {
        if(obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function getFileType(url){
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url,
            success: (data, textStatus, request) => {
                const type = request.getResponseHeader('content-type').split(';')[0]
                return resolve(type);
            }
        });
    })
}

function getUser(id){
    return new Promise((resolve, reject) => {
        $.get('/app/user/name/'+id)
        .then(response => {
            if(!usersCache[id]){
                usersCache[id] = response;
                return resolve(response);
            }else{
                const cache = usersCache[id];
                return resolve(cache);
            }
        });
    });
}

function secureString(str){
    const node = $("<div>").text(str).html();
    return node;
}

function renderMessage(author, message, attach){
    return `<div class="message">
        <img src="${author.avatarURL}" data-author='${author.id}' onclick="openUserDetails('${author.id}');" class="avatar">
        <div class="content">
            <div class="username"><span class="val">${author.username}</span> ${author.bot ? '<small class="bot-badge">bot</small>': ''} <small class="date">${moment(message.createdDate).calendar()}</small></div>
            <span class="value">${attach ? message.content : secureString(message.content)}</span>
        </div>
    </div>`
}

$(document).ready(() => {
    $('form').submit(e => e.preventDefault());
});