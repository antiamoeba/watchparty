var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var fs = require('fs');

var router = express();
var server = http.Server(router);
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
    extended: true
}));

var io = socketio.listen(server);

var Handlebars = require('handlebars');
function updateTemplates() {
    fs.readFile('html/index.html', function(err, html) {
        if(err)
            return handleError(err);
        indexTemplate = Handlebars.compile(html+"");
    });
}
var indexTemplate;
updateTemplates();

//Database
var mongoose = require('mongoose');
mongoose.connect('mongodb://'+process.env.IP+'/syncworld');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Connected to database.");
    var syncSchema = mongoose.Schema({
        videoId: String,
        time: Number,
        curr: Number,
        saves: [{saveData: String, img: String}]
    });
    SyncStore = mongoose.model('SyncStore', syncSchema);
    var test = new SyncStore({
        videoId: "PfGaX8G0f2E",
        time: 0,
        saves: []
    });
    test.save(function() {
        testId = test.id;
    });
});
var SyncStore;
var testId;

var ys = require('./youtubesync.js');
var wb = require('./whiteboard.js');

var index = 0;
function dumbAuth() {
    var obj = {auth: true, id: index};
    index++;
    return obj;
}

router.use(express.static(path.resolve(__dirname, 'client')));

function handleError(err) {
    console.log(err);
}

var syncing = {};
router.get('/', function(req, res) {
    getIndex(res);
});
router.get('/create', function(req, res) {
    res.sendfile('html/create.html');
});
router.post('/create', function(req, res) {
    console.log("creating");
    var videoId = req.body.videoId;
    if(!videoId)
        videoId = "PfGaX8G0f2E";
    var page = new SyncStore({
        videoId: videoId,
        time: 0,
        saves: []
    });
    page.save(function() {
        console.log(page.id);
        res.send(page.id);
    });
});

router.get('/:id', function(req, res) {
    var syncId = req.params.id;
    getIndex(res, syncId);
});
function getIndex(res, syncId) {
    if(!syncId)
        syncId = testId;
    SyncStore.findById(syncId, function(err, sync) {
        if(err)
            return handleError(err);
        if(!sync)
            return res.send("Not found!");
        var watchId = "watchparty-"+sync.id;
        var boardId = "whiteboard-"+sync.id;
        if(!(syncId in syncing)) {
            var ysDone = function(time) {
                sync.time = time;
                sync.save();
                if(sync.id in syncing)
                    delete syncing[sync.id];
            }
            var wbDone = function(saves, current) {
                sync.curr = current;
                sync.saves = saves;
                sync.save();
                if(sync.id in syncing)
                    delete syncing[sync.id];
            }
            var vidsync = ys.YoutubeSync(watchId, io, dumbAuth, ysDone, sync.time);
            var drawsync = wb.Whiteboard(boardId, io, dumbAuth, wbDone, sync.saves, sync.curr);
            syncing[sync.id] = {
                vidsync: vidsync,
                drawsync: drawsync
            }
        }
        var data = {
            videoId: sync.videoId,
            watchpartyId: watchId,
            whiteboardId: boardId
        }
        res.send(indexTemplate(data));
    });
}


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("Server listening at", addr.address + ":" + addr.port);
});
