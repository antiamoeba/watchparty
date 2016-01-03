var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var Sync;
function onYouTubeIframeAPIReady() {
    Sync = function(namespace, video, player, io, width, height) {
        var start = false;
        var check = false;
        var socket = io('/'+namespace);
        var last = {command: "buffering", time: null}
        var onPlayerReady = function(event) {
            keepSync();
        }
        var onPlayerStateChange = function(event) {
            if (start) {
                console.log(event.data);
                if (event.data === 1) {
                    console.log("play");
                    if(check) {
                        check = false;
                        pauseVideo(player, last.time);
                        return;
                    }
                    if((last.command!="play")) {
                        socket.emit("play", player.getCurrentTime());
                    }
                    last = {command: "buffering", time: null}
                }
                // Pause event.
                else if (event.data === 2) {
                    console.log("pause");
                    if((last.command!="pause"||last.time!=player.getCurrentTime())) {
                        socket.emit("pause", player.getCurrentTime());
                    }
                    last = {command: "buffering", time: null}
                }
                else if (event.data === 3) {
                    console.log("buffering");
                    //last.command = "buffering";
                    //last.time = player.getCurrentTime();
                    //setTimeout(function() {if(last.command=="buffering") socket.emit("check")}, 2000);
                }
                else if(event.data === 0) {
                    console.log("ended");
                    last.command = "play";
                    last.time = 0;
                    playVideo(player, 0);
                    player.pauseVideo();
                    socket.emit("ended");
                }
            }
        }
        var keepSync = function() {
            socket.on('play', function(time) {
               playVideo(player, time); 
               last.command = "play";
               last.time = time;
            });
            socket.on('pause', function(time) {
               pauseVideo(player, time); 
               last.command = "pause";
               last.time = time;
            });
            socket.on('check', function(data) {
                console.log("check:" + data.time);
                if(data.playing) {
                    last.command = "play";
                    last.time = data.time;
                    playVideo(player, data.time);
                    start = true;
                }
                else {
                    last.command = "pause";
                    last.time = data.time;
                    //playVideo(player, data.time);
                    //player.pauseVideo();
                    start = true;
                    check = true;
                    player.seekTo(data.time, true);
                }
            });
            socket.emit('check');
        }
        var player = new YT.Player(player, {
            height: height+"",
            width: width+"",
            videoId: video,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
    ready();
}
function playVideo(player, time) {
    if(time)
        player.seekTo(time, true)
    player.playVideo();
}
function pauseVideo(player, time) {
    player.seekTo(time, true)
    player.pauseVideo();
}