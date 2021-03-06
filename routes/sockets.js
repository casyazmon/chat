var io = require('socket.io');

exports.initialize = function(server) {
    io = io.listen(server);

    io.set('authorization', function(data, accept) {
        if (data.headers.cookie) {
            data.cookie = require('cookie').parse(data.headers.cookie);
            data.setssionId = data.cookie['express.sid'].split('.')[0];
            data.nickname = data.cookie['nickname'];
        } else {
            return accept('No cookie transmitted.', false);
        }
        accept(null, true);
    });

    var self = this;

    this.chatInfra = io.of("/chat_infra")
        .on("connection", function(socket) {
            socket.on("join_room", function(room) {

                var nickname = socket.handshake.nickname;

                socket.set('nickname', nickname, function() {
                    socket.emit('name_set', {'name': socket.handshake.nickname});

                    socket.send(JSON.stringify({
                        type: 'serverMessage',
                        message: 'Welcome to the most intersting chat room on earth!'
                    }));

                    socket.join(room.name);
                    var comSocket = self.chatCom.sockets[socket.id];
                    comSocket.join(room.name);
                    comSocket.room = room.name;
                    socket.in(room.name).broadcast
                        .emit('user_entered', {'name': nickname});
                });
            });

            socket.on("get_rooms", function() {
                var rooms = {}
                for (var room in io.sockets.manager.rooms) {
                    if (room.indexOf("/chat_infra/") == 0) {
                        var roomName = room.replace("/chat_infra/", "");
                        rooms[roomName] = io.sockets.manager.rooms[room].length;
                    }
                }
                socket.emit("rooms_list", rooms);
            });
        });

    this.chatCom = io.of("/chat_com").on("connection", function(socket) {
        socket.on('message', function(message) {
            message = JSON.parse(message);
            if (message.type === "userMessage") {
                socket.get('nickname', function(err, nickname) {
                    message.username = nickname;
                    socket.in(socket.room).broadcast.send(JSON.stringify(message));
                    message.type = "myMessage";
                    socket.send(JSON.stringify(message));
                });
            }
        });
    });
};