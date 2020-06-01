const socket = io();

moment.locale('pt-br');

const usersCache = {};
const detailsCache = {};
let typing = {};
let usernamesTyping = [];
let isTyping = false;

function serverName(element, name){
    const position = element.position();
    const nameElement = $('.app .guilds .server-name');
    nameElement.text(name);
    nameElement.css('top', position.top+15+'px');
    nameElement.show();
}

function deleteChannel(id){
    const guildId = $('.app').data('guildid');
    console.log(guildId, id)
    post('/app/channel/delete', {channelId: id, guildId});
}

function openUserDetails(id){
    const modalContainer = $('.app .user-modal-container');
    const modal = $('.app .user-modal-container .user-modal');

    modal.find('.details .badges .badge').remove();

    $.get(`/app/user/details/${id}`)
    .then(response => {
        if(!detailsCache[id]){
            detailsCache[id] = response;
            modal.find('.user img.avatar').attr('src', response.avatarURL);
            modal.find('.user .details .name').html(`${secureString(response.username)}<small class="discriminator">#${response.discriminator}</small>`);
            if(response.badges.length > 0){
                for(badge of response.badges){
                    modal.find('.details .badges').append(`<div class="badge ${badge}"></div>`);
                }
            }
        }else{
            const cache = detailsCache[id];
            modal.find('.user img.avatar').attr('src', cache.avatarURL);
            modal.find('.user .details .name').html(`${secureString(cache.username)}<small class="discriminator">#${cache.discriminator}</small>`);
            if(cache.badges.length > 0){
                for(badge of cache.badges){
                    modal.find('.details .badges').append(`<div class="badge ${badge}"></div>`);
                }
            }
        }
    });

    modalContainer.show();
}

function Clyde(content){
    $('.app .channel-container .messages').append(`
    <div class="message">
        <img src="https://images.discordapp.net/avatars/347837391622504463/360a77054e1fbc19d85b07b1ed825418.png" data-author='5ed40eab7ed6161a3c57d6a9' onclick="openUserDetails('5ed40eab7ed6161a3c57d6a9');" class="avatar">
        <div class="content">
            <div class="username"><span class="val">Clyde</span> <small class="bot-badge">bot</small> <small class="date">${moment(new Date()).calendar()}</small></div>
            <span class="value">${secureString(content)}</span>
        </div>
    </div>
    `)
}

socket.on('new message', async data => {
    const messagesContainer = $('.app .channel-container .messages');
    const channelContainer = $('.app .channel-container');


    const isScrolledToEnd = channelContainer[0].scrollHeight - channelContainer.scrollTop() == channelContainer.outerHeight();

    const user = await getUser(data.user.id);

    if(data.message.attach){
        const mimetype = await getFileType(data.message.content);

        if(mimetype.startsWith('image')){
            messagesContainer.append(renderMessage(user, {
                creationDate: data.message.creationDate,
                content: `<img class="attach" src="${data.message.content}" />`
            }, true));
        }else if(mimetype.startsWith('video')){
            messagesContainer.append(renderMessage(user, {
                creationDate: data.message.creationDate,
                content: `
                <video class="attach" controls>
                  <source src="${data.message.content}" type="${mimetype}">
                </video> 
                `
            }, true));
        }

    }else{
        messagesContainer.append(renderMessage(user, data.message, false));
    }

    if(isScrolledToEnd) $('.app .channel-container').scrollTop($('.app .channel-container')[0].scrollHeight);
});

socket.on('to user', content => Clyde(content));

socket.on('startTyping', (user) => {

    if(!typing[user.id]){
        typing[user.id] = user;

        const typingElement = $('.app .channel-container .input-container .typing');

        if(Object.size(typing) > 1){
            Object.keys(typing).map((key, index) => {
                let user = typing[key];
                usernamesTyping.push(user.username);
            });

            typingElement.text(`${usernamesTyping} estão digitando...`);
            console.log(`${usernamesTyping} estão digitando`);
        }else{
            typingElement.text(`${typing[user.id].username} está digitando...`);
        }

        typingElement.css('visibility', 'visible');
    }

});

setInterval(() => {
    const typingElement = $('.app .channel-container .input-container .typing');
    typingElement.css('visibility', 'hidden');
    typing = {};
    usernamesTyping = [];
}, 5000);

$(document).ready(() => {
    $('.app .channel-container').scrollTop($('.app .channel-container')[0].scrollHeight);
    $('.app .channels .list .channel').mousedown((event) => {
        const btn = $(event.currentTarget);
        const channelId = btn.data('channelid');
        const guildId = $('.app').data('guildid');

        if(event.which === 1){
            location.href = `/app/channels/${guildId}/${channelId}`;
        }else if(event.which === 3){
            const menu = $('.app .channels .channel-menu');

            menu.css({
                top: event.pageY,
                left: event.pageX-50
            })
            .data('channelid', channelId)
            .show();
        }

    });

    $('.app').click(e => {
        const container = $('.app .channels .channel-menu');
        if(!container.is($(e.target).parent())) container.hide();
    });

    $('.app .modal-container').click(e => {
        const container = $('.app .modal-container');
        if(container.is(e.target)) container.hide();
    });

    $('.app .channel-container .input-container .buttons .btn.attach').click(() => {
        const input = $('.app #attachFile');
        input.click();
    });

    $('.app #attachFile').change(() => {
        if(!$('.app #attachFile')[0].files) return;

        const channelId = $('.app').data('currentchannel');
        const guildId = $('.app').data('guildid');

        const attach = $('.app #attachFile')[0].files[0]

        const formData = new FormData();
        formData.set('attach', attach, attach.name);
        Clyde('Enviando arquivo...');
        $.post({url: `/app/attach/upload/${guildId}/${channelId}`, data: formData, processData: false, contentType: false, json: true});

    });

    $('.app .channel-container .input-container #msg-submit').on('keypress', e => {

        if(e.code === 'Enter'){
            const input = $('.app .channel-container .input-container #msg-submit');
            const value = input.val();
            if(!value) return;
    
            post('/app/message/create', {
                guildId: $('.app').data('guildid'),
                channelId: $('.app').data('currentchannel'),
                content: value
            });
    
            input.val('');
        }else{
            if(!isTyping){
                isTyping = true;
                post('/app/channel/typing', {});
                setTimeout(() => isTyping = false, 5000);
            }
        }

    });

    $('.app .channel-container .messages .message').each(async (index, element) => {
        const msg = $(element);
        const authorId = $(element).data('author');
        
        const user = await getUser(authorId);

         msg.find('img.avatar').attr('src', user.avatarURL);
         msg.find('.content .username .val').html(`${secureString(user.username)} ${user.bot ? '<small class="bot-badge">bot</small>': ''}`);

    });

});