const session = require('./session');
const models = require('../models');

module.exports = io => {

    io.use((socket, next) => {
        session(socket.request, socket.request.res || {}, next);
    });

    io.on('connection', async socket => {
        if(!socket.request.session.logged) return;
        socket.join(socket.request.session.currentChannel);
        socket.join(socket.request.session.user.token);
    });
}