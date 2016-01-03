//Syncs youtube videos across multiple users utilizing socketio(namespaces)
exports.YoutubeSync = function(video, io, auth, done, time, qu) {
    var nsp = io.of('/'+video);
    var connections = {};
    var currentTime = 0;
    if(time)
        currentTime = time;
    var playing = false;
    var timing = false;
    var timer;
    var queue = [];
    if(qu)
        queue = qu;
    nsp.on('connection', function(socket) {
        if(!timing) {
            timer = setInterval(function(){if(playing) currentTime++;}, 1000);
        }
        timing = true;
        var data = auth(socket);
        if(data.auth) {
            console.log("A user connected to video");
            connections[data.id] = socket;
            socket.on('disconnect', function() {
                console.log("disc video");
                delete connections[data.id];
                checkConnections();
            });
            socket.on('play', function(time) {
                console.log('play');
                if(time)
                    currentTime = time;
                socket.broadcast.emit('play', time);
                playing = true;
            });
            socket.on('pause', function(time) {
                console.log("paused");
                currentTime = time;
                socket.broadcast.emit('pause', time); 
                playing = false;
            });
            socket.on('check', function() {
                socket.emit('check', {time:currentTime, playing:playing}); 
            });
            socket.on('ended', function() {
                console.log("ended");
                currentTime = 0;
                playing = false;
            });
        }
    });
    var checkConnections = function() {
        if(Object.keys(connections).length==0) {
            playing = false;
            timing = false;
            clearInterval(timer);
            console.log("stopped video");
            delete io.nsps['/'+video];
            if(done)
                done(currentTime);
        }
    }
}