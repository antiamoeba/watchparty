var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var Sync;
function onYouTubeIframeAPIReady() {
    Sync = function(video, player, io) {
        var start = false;
        var socket = io('/'+video);
        var height = window.innerHeight*2/3.0;
        var width = height*16/9.0;
        var last = {command: "buffering", time: null}
        var onPlayerReady = function(event) {
            player.playVideo();
            player.pauseVideo();
            keepSync();
        }
        var onPlayerStateChange = function(event) {
            if (start) {
                if (event.data === 1) {
                    console.log("play");
                    if((last.command!="play"||last.time!=player.getCurrentTime())) {
                        socket.emit("play", null);
                    }
                }
                // Pause event.
                else if (event.data === 2) {
                    console.log("pause");
                    if((last.command!="pause"||last.time!=player.getCurrentTime())) {
                        socket.emit("pause", player.getCurrentTime());
                    }
                }
                else if (event.data === 3) {
                    console.log("buffering");
                    //last.command = "buffering";
                    //last.time = player.getCurrentTime();
                    //setTimeout(function() {if(last.command=="buffering") socket.emit("check")}, 2000);
                }
            }
        }
        var keepSync = function() {
            start = true
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
                }
                else {
                    last.command = "pause";
                    last.time = data.time;
                    pauseVideo(player, data.time);
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