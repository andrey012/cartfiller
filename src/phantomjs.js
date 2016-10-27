var system = require('system');
var webPage = require('webpage');
var page = webPage.create();
page.viewportSize = {
      width: 1024,//1282,
      height: 600000 
};
var say = function(msg) {
    system.stderr.write(('object' === typeof msg ? JSON.stringify(msg, null, 4) : msg) + '\n');
};
page.onConsoleMessage = function(msg) {
    say(msg);
};
var setScrollPosition = function(top) {
    page.clipRect = { top: top, left: 0, width: 1024, height: 600 }; // if you will decide to change dimensions - change hardcoded empty PNG below
};

var currentVideoFrame = 1;
var recordingVideo = false;
var preventRenderingUntilNextFrame = false;
var renderFrame = function(count) {
    var buffer = page.renderBase64('png');
    if (! buffer.length) {
        // blank image
        buffer = 'iVBORw0KGgoAAAANSUhEUgAABAAAAAJYCAIAAABzcgN0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AgNChYlQoHGeAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAApSSURBVHja7ddBDQAACMQwwL/nwwYJrYT91kkKAAD4YSQAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAGAAJAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAYAAkAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAADAAAAAAAYAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAABgAAAAAAMAAAAYAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAAAwAAAAgAEAAAAMAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAwAAAAAAGAAAAMAAAAIABAAAADAAAAGAAAAAAAwAAABgAAADAAAAAAAYAAAAwAAAAYAAAAAADAAAAGAAAAMAAAAAABgAAADAAAACAAQAAAAwAAABgAAAAAAMAAAAYAAAAMAAAAIABAAAADAAAAGAAAACAuxYH7getPr6O5wAAAABJRU5ErkJggg==';
    }
    for (var i = 0; i < count; i ++) {
        system.stdout.write('$start$' + '        '.substr(0, 8 - String(currentVideoFrame).length) + String(currentVideoFrame) + '$');
        system.stdout.write(buffer);
        system.stdout.write('$finish$');
        say('phantomjs.js have rendered frame [' + currentVideoFrame + ']');
        currentVideoFrame ++ ;
    }
};

var keyMap = {
    '\r': 16777221,
    '\n': 16777221,
};

page.onCallback = function(data) {
    if (data.scroll) {
        setScrollPosition(Math.max(0, data.scroll.rect.top - 200));
    }
    if (data.finish) {
        phantom.exit();
    }
    if (data.getVideoFrame) {
        return currentVideoFrame;
    }
    if (data.renderNextFrame && recordingVideo) {
        say('rendering 5 frames ' + currentVideoFrame + ' out of queue by request of controller');
        renderFrame(5);
        preventRenderingUntilNextFrame = false;
    }
    if (data.preventRenderingUntilNextFrame) {
        preventRenderingUntilNextFrame = true;
    }
    if (data.mouseEvent && data.mouseEvent !== 'mouseup' /* somewhy PhantomJS concverts this to click */) {
        page.sendEvent(data.mouseEvent, data.pos.x + 1, data.pos.y + 1);
    }
    if (data.keyboardEvent && data.keyboardEvent !== 'keypress' /* somewhy PhantomJS converts this to keydown*/) {
        //http://phantomjs.org/api/webpage/method/send-event.html
        //https://github.com/ariya/phantomjs/blob/cab2635e66d74b7e665c44400b8b20a8f225153a/src/modules/webpage.js
        var keyCode = keyMap[data.char] || data.char;
        var shift = false;//(keyMap[data.char] && ! keyMap[data.char.toLowerCase()]) ? true : false;
        page.sendEvent(data.keyboardEvent, keyCode, null, null, shift ? 0x02000000 : 0);
    }
};

var args = system.args.filter(function(arg) {
    if ('--video' === arg) {
        page.onConsoleMessage('turning video on');
        recordingVideo = true;
        setInterval(function() {
            if (! preventRenderingUntilNextFrame) {
                renderFrame(1);
            }
        }, 25);
        return false;
    }
    var match;
    if (match = /^--auth=(.*)$/.exec(arg)) {
        page.onConsoleMessage('using HTTP auth');
        var pc = match[1].split(':');
        page.settings.userName = pc.shift();
        page.settings.password = pc.join(':');
        return false;
    }
    if (match = /^--render=(.*)$/.exec(arg)) {
        page.onConsoleMessage('going to render in 5 seconds');
        setTimeout(function() {
            page.render(match[1], {format: 'png'});
            page.onConsoleMessage('rendered to ' + match[1]);
        }, 5000);
        return false;
    }    
    return true;
});
var url = args[1];
page.onConsoleMessage('opening ' + url);
page.open(url, function() {});
setScrollPosition(0);
