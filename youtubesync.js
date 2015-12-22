//Syncs youtube videos across multiple users utilizing socketio(namespaces)
exports.YoutubeSync = function(video, io, auth) {
    var nsp = io.of('/'+video);
    var connections = {};
    var currentTime = 0;
    var playing = false;
    var timing = false;
    var timer;
    nsp.on('connection', function(socket) {
        if(!timing) {
            timer = setInterval(function(){if(playing) currentTime++;}, 1000);
        }
        timing = true;
        var data = auth(socket);
        if(data.auth) {
            console.log("A user connected");
            connections[data.id] = socket;
            socket.on('disconnect', function() {
                console.log("disc");
                delete connections[data.id];
                checkConnections();
            });
            socket.on('play', function(time) {
                currentTime = time;
                socket.broadcast.emit('play', time);
                playing = true;
            });
            socket.on('pause', function(time) {
                currentTime = time;
                socket.broadcast.emit('pause', time); 
                playing = false;
            });
            socket.on('check', function() {
               socket.emit('check', {time:currentTime, playing:playing}); 
            });
        }
    });
    var checkConnections = function() {
        if(Object.keys(connections).length==0) {
            playing = false;
            clearInterval(timer);
            console.log("stopped");
        }
    }
}