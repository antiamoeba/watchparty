Whiteboard = function(namespace, selector, io) {
    var buildCanvas = function(id, save) {
        var canvas = $("<canvas style='position:absolute;left:0;top:0;'></canvas>");
        canvas.attr("id", id);
        canvas.attr("width", width);
        canvas.attr("height", height);
        if(save) {
            var drawCtx = canvas[0].getContext("2d");
            for(var i=0;i<save.length;i++) {
                var action = save[i];
                if(action.command=="draw") {
                    draw(drawCtx, action.pos.x, action.pos.y);
                }
                if(action.command=="start") {
                    start(drawCtx, action.pos.x, action.pos.y);
                }
                if(action.command=="end") {
                    end(drawCtx);
                }
            }
        }
        return canvas;
    }
    var buildImage = function(img, saveId) {
        var imgElem = $("<img />");
        if(img) 
            imgElem.attr("src", img);
        else
            imgElem.attr("src", "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
        imgElem.width(60);
        imgElem.height(40);
        imgElem.css("border-style", "solid");
        imgElem.css("border-width", "2px");
        imgElem.css("border-radius", "5px");
        imgElem.attr("id", "scroller-"+saveId);
        imgElem.addClass("scroller-img");
        imgElem.click(function() {
            var imgl = save();
            socket.emit("save", imgl);
            scroller.find(".scroller-img").css("border-color", "black");
            imgElem.css("border-color", "#F03939");
            var imgEl = scroller.find("#scroller-"+current);
            imgEl.attr("src", imgl);
            socket.emit("check", saveId);
            current = saveId;
            console.log(saveId);
        });
        return imgElem;
    }
    var getMousePos = function(canvas, evt) {
	    var rect = canvas.getBoundingClientRect();
	    return {
	        x: evt.clientX - rect.left,
	        y: evt.clientY - rect.top
	    };
	}
	var draw = function(drawCtx, x, y) {
	    drawCtx.lineTo(x, y);
		drawCtx.lineWidth = 5;
		drawCtx.lineCap = "round"
		drawCtx.stroke();
		drawCtx.moveTo(x, y);
	}
	var start = function(drawCtx, x, y) {
	    drawCtx.beginPath();
        drawCtx.moveTo(x, y);
	}
	var end = function(drawCtx) {
	    drawCtx.closePath();
	}
	this.clear = function() {
	    var img = save();
	    socket.emit("clear", img);
	    console.log(current);
	    var imgElem = scroller.find("#scroller-"+current);
        imgElem.attr("src", img);
        console.log(img);
	}
	var save = function() {
	    var hiddenCanvas = $("<canvas></canvas>");
	    hiddenCanvas.attr("width", width);
	    hiddenCanvas.attr("height", height);
	    var hiddenCtx = hiddenCanvas[0].getContext('2d');
	    hiddenCtx.drawImage(localCanvas[0], 0, 0);
	    for(var canvas in canvasi) {
	        hiddenCtx.drawImage(canvasi[canvas].canvas[0], 0, 0);
        } 
        var img = hiddenCanvas[0].toDataURL();
        return img;
	}
    var container = $(selector);
    var width = container.width();
    var height = container.height();
    container.css("position", "relative");
    var scroller = $("<div id='scroller-"+container.attr("id")+"'></div>");
    scroller.width(width);
    scroller.height(50);
    scroller.css("overflow", "auto");
    scroller.css("overflow-y", "hidden");
    scroller.css("white-space", "nowrap");
    container.after(scroller);
    var current;
    
    var socket = io('/'+namespace);
    var localCanvas;
    var ctx;
    var isDown = false;
    var canvasi = {};
    socket.on('draw', function(id, pos) {
        var drawCtx = canvasi[id].ctx;
        draw(drawCtx, pos.x, pos.y);
    });
    socket.on('start', function(id, pos) {
        var drawCtx = canvasi[id].ctx;
        start(drawCtx, pos.x, pos.y);
    });
    socket.on('end', function(id, pos) {
        var drawCtx = canvasi[id].ctx;
        end(drawCtx);
    });
    socket.on('new', function(id) {
        console.log(id);
        var canvas = buildCanvas(id);
        canvas.css("zIndex", 1);
        canvasi[id] = {canvas:canvas, ctx:canvas[0].getContext("2d")};
        container.append(canvas); 
    });
    socket.on('clear', function(img, saveId) {
        ctx.clearRect(0,0,width,height);
        for(var canvas in canvasi) {
            canvasi[canvas].ctx.clearRect(0,0,width,height);
        }
        scroller.append(buildImage(null, saveId));
        current = saveId;
        scroller.find(".scroller-img").css("border-color", "black");
        scroller.find("#scroller-"+saveId).css("border-color", "#F03939");
    });
    socket.on('load', function(saveId, img, data, saveImgs) {
        container.empty();
        localCanvas = buildCanvas("local");
        localCanvas.css("zIndex", 10);
        ctx = localCanvas[0].getContext("2d");
        localCanvas.mousedown(function(e) {
    		isDown = true;
    		var mousePos = getMousePos(localCanvas[0], e);
    		start(ctx, mousePos.x, mousePos.y);
    		var pos = {
    			x: mousePos.x,
    			y: mousePos.y,
    		}
    		socket.emit("start", pos);
    	});
    	localCanvas.mousemove(function(e) {
    		if(isDown) {
    			var mousePos = getMousePos(localCanvas[0], e);
    			draw(ctx, mousePos.x, mousePos.y);
    			var pos = {
    				x: mousePos.x,
    				y: mousePos.y,
    			}
    			socket.emit("draw", pos);
    		}
    	});
    	localCanvas.mouseup(function(e) {
    		isDown = false;
    		end(ctx);
    		socket.emit("end");
    	});
    	localCanvas.mouseleave(function(e) {
    	    isDown = false; 
    	});
        container.append(localCanvas);
        if(img) {
            var imgElem = new Image();
            imgElem.src = img;
            imgElem.onload = function() {
                ctx.drawImage(imgElem, 0, 0);
                for(var id in data) {
                    var canvas = buildCanvas(id, data[id]);
                    canvas.css("zIndex", 1);
                    canvasi[id] = {canvas:canvas, ctx: canvas[0].getContext("2d")};
                    container.append(canvas);
                }
            }
        }
        else {
            for(var id in data) {
                var canvas = buildCanvas(id, data[id]);
                canvas.css("zIndex", 1);
                canvasi[id] = {canvas:canvas, ctx: canvas[0].getContext("2d")};
                container.append(canvas);
            }
        }
        if(saveImgs) {
            scroller.empty();
            for(var i=0;i<saveImgs.length;i++) {
                var img = saveImgs[i];
                scroller.append(buildImage(img, i));
            }
        }
        console.log(JSON.stringify(saveImgs));
        scroller.find(".scroller-img").css("border-color", "black");
        scroller.find("#scroller-"+saveId).css("border-color", "#F03939");
        current = saveId;
        scroller.scrollLeft(scroller[0].scrollWidth);
    });
    socket.emit("check");
}