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

page.onCallback = function(data) {
    if (data.scroll) {
        setScrollPosition(Math.max(0, data.scroll.rect.top - 200));
    }
    if (data.finish) {
        phantom.exit();
    }
};

var args = system.args.filter(function(arg) {
    if ('--video' === arg) {
        page.onConsoleMessage('turning video on');
        setInterval(function() {
            page.render('/dev/stdout', { format: 'png' });
        }, 25);
        return false;
    }
    return true;
});
var url = args[1];
page.onConsoleMessage('opening ' + url);
page.open(url, function() {});

