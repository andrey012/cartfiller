var system = require('system');
var webPage = require('webpage');
var page = webPage.create();
page.viewportSize = {
      width: 1282,
      height: 600000 
};
var say = function(msg) {
    system.stderr.write(('object' === typeof msg ? JSON.stringify(msg, null, 4) : msg) + '\n');
};
page.onConsoleMessage = function(msg) {
    say(msg);
};
var setScrollPosition = function(top) {
    page.clipRect = { top: top, left: 0, width: 1024, height: 600 };
};

var currentVideoFrame = 1;

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
};

var args = system.args.filter(function(arg) {
    if ('--video' === arg) {
        page.onConsoleMessage('turning video on');
        setInterval(function() {
            var buffer = page.renderBase64('png');
            system.stdout.write(buffer);
            currentVideoFrame ++ ;
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
