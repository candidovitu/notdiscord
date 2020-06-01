let io;
module.exports = {
    init: server => {
        io = require('socket.io').listen(server); io.origins('*:*');
        return io;
    },
    emit: (room, event, value) => {
        return io.to(room).emit(event, value);
    } 
}