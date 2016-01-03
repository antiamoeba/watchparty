//var lwip = require('lwip');
exports.Whiteboard = function(board, io, auth, done, prevSaves, curr) {
    var nsp = io.of('/'+board);
    var connections = {};
    var saves = [];
    if(prevSaves&&prevSaves.length>0)
        saves = prevSaves;
    else
        saves[0] = {saveData: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", img: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="};
    var current = 0;
    if(curr)
        current = curr;
    var total = 0;
    nsp.on('connection', function(socket) {
       var data = auth(socket);
       if(data.auth) {
            console.log("A user connected to whiteboard");
            if(data.id in connections) {
                connections[data.id].socket = socket;
            }
            else {
                connections[data.id] = {socket: socket, board:[]};
            }
            socket.broadcast.emit("new", data.id);
            socket.on('disconnect', function() {
                console.log("disc whiteboard");
                connections[data.id].socket = null;
                checkConnections();
            });
            socket.on('error', function() {
                console.log("current:" + current);
                console.log("total:" + saves.length);
            });
            socket.on('draw', function(pos) {
                connections[data.id].board.push({command: 'draw', pos: pos});
                socket.broadcast.emit('draw', data.id, pos);
            });
            socket.on('start', function(pos) {
                connections[data.id].board.push({command: 'start', pos: pos});
                socket.broadcast.emit('start', data.id, pos);
            });
            socket.on('end', function() {
                connections[data.id].board.push({command: 'end'});
                socket.broadcast.emit('end', data.id);
            });
            socket.on('check', function(saveId) {
                var saveImgs = saves.map(function(save) { return save.img;});
                if(saveId!=null) {
                    var save = {};
                    for(var connectionId in connections) {
                        var connection = connections[connectionId];
                        connection.board = [];
                        save[connectionId] = [];
                        if(!connection.socket) {
                            delete connections[connectionId];
                        }
                    }
                    nsp.emit('load', saveId, saves[saveId].saveData, save, saveImgs);
                    current = saveId;
                }
                else {
                    var save = {};
                    for(var connectionId in connections) {
                        var connection = connections[connectionId];
                        save[connectionId] = connection.board;
                    }

                    socket.emit('load', current, saves[current].saveData, save, saveImgs);
                }
            });
            socket.on('clear', function(img) {
                var save = {};
                for(var connectionId in connections) {
                    var connection = connections[connectionId];
                    if(!connection.socket) {
                        delete connections[connectionId];
                    }
                }
                /*lwip.open(img, function(err, img) {
                   img.resize(80, 60, function(err, img) {
                       img.toBuffer('png', function(err, buffer) {
                          saves.push({img:buffer, save:save}); 
                       });
                   }) 
                });*/
                saves[current] = {saveData: img, img: img};
                current = saves.length;
                saves[current] = {saveData: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", img: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="};
                nsp.emit('clear', img, current);
            });
            socket.on('save', function(img) {
                saves[current] = {saveData: img, img: img}; 
            });
       }
    });
    var checkConnections = function() {
        var conns = 0;
        for(var connectionId in connections) {
            var connection = connections[connectionId];
            if(connection.socket) {
                conns++;
            }
        }
        if(conns==0) {
            console.log("stopped whiteboard");
            if(done)
                done(saves, current);
            delete io.nsps['/'+board];
        }
    }
}