var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var fs = require('fs');

var router = express();
var server = http.Server(router);

var io = socketio.listen(server);

var index = 0;
function dumbAuth() {
    var obj = {auth: true, id: index};
    index++;
    return obj;
}

var video = "PfGaX8G0f2E";
var vidsync = require('./youtubesync.js').YoutubeSync(video, io, dumbAuth);

router.use(express.static(path.resolve(__dirname, 'client')));

router.get('/', function(req, res) {
    res.sendfile('html/index.html');
});

//Videosync
router.get('/test', function(req, res) {
    res.sendfile('html/vidsynctest.html');
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("Server listening at", addr.address + ":" + addr.port);
});
